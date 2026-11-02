import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import { sql, eq } from "drizzle-orm";
import { testDatabase } from "./helpers";
import { user, goldPrices } from "@/db/schema";
import { localDay } from "@/lib/dates";
import {
  listAssetCategories,
  saveAssetCategory,
  deleteAssetCategory,
} from "@/server/asset-categories";
import { createAssetCheckpoint, listAssetCheckpoints } from "@/server/checkpoints";
let test: Awaited<ReturnType<typeof testDatabase>>;
beforeAll(async () => {
  test = await testDatabase();
});
afterAll(async () => {
  await test.client.close();
});
beforeEach(async () => {
  await test.db.execute(sql`TRUNCATE "user", gold_prices CASCADE`);
  await test.db.insert(user).values([
    { id: "a", name: "A", email: "a@example.test" },
    { id: "b", name: "B", email: "b@example.test" },
  ]);
});
describe("checkpoint asset categories", () => {
  it("seeds defaults once, even under concurrent reads, and does not restore deleted defaults", async () => {
    const [first] = await Promise.all([
      listAssetCategories(test.db, "a"),
      listAssetCategories(test.db, "a"),
    ]);
    expect(first.map(row => row.name).sort()).toEqual(["Banking", "Tiết kiệm", "Vàng"].sort());
    const gold = first.find(row => row.name === "Vàng")!;
    expect(gold.unit).toBe("chi");
    for (const category of first) await deleteAssetCategory(test.db, "a", category.id);
    expect(await listAssetCategories(test.db, "a")).toEqual([]);
  });
  it("supports create, rename and delete with per-account isolation and duplicate protection", async () => {
    const created = await saveAssetCategory(test.db, "a", { name: " Property ", unit: "vnd" });
    expect(created.name).toBe("Property");
    await expect(
      saveAssetCategory(test.db, "a", { name: "property", unit: "vnd" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      saveAssetCategory(test.db, "b", { name: "Other", unit: "chi" }, created.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(deleteAssetCategory(test.db, "b", created.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      createAssetCheckpoint(test.db, { items: [{ categoryId: created.id, amount: "100" }] }, "b"),
    ).rejects.toMatchObject({ status: 400 });
    await saveAssetCategory(test.db, "a", { name: "Home", unit: "vnd" }, created.id);
    expect((await listAssetCategories(test.db, "a")).some(row => row.name === "Home")).toBe(true);
  });
  it("snapshots gold weight, product and server-side buy price, retaining history after category and price edits", async () => {
    const categories = await listAssetCategories(test.db, "a");
    const gold = categories.find(row => row.unit === "chi")!,
      bank = categories.find(row => row.name === "Banking")!;
    await test.db.insert(goldPrices).values({
      priceDate: localDay(new Date()),
      productCode: "KGB",
      productName: "Kim Gia Bảo 24K",
      buyPrice: 13450000n,
      sellPrice: 13850000n,
    });
    await createAssetCheckpoint(
      test.db,
      {
        items: [
          { categoryId: gold.id, productCode: "KGB", weightMilliChi: 2500 },
          { categoryId: bank.id, amount: "10000000" },
        ],
      },
      "a",
    );
    await saveAssetCategory(test.db, "a", { name: "Renamed gold", unit: "vnd" }, gold.id);
    await deleteAssetCategory(test.db, "a", bank.id);
    await test.db.update(goldPrices).set({ buyPrice: 1n }).where(eq(goldPrices.productCode, "KGB"));
    const [snapshot] = await listAssetCheckpoints(test.db, "a");
    expect(snapshot.total).toBe("43625000");
    expect(snapshot.items[0]).toMatchObject({
      name: "Vàng",
      weightMilliChi: 2500,
      amount: "33625000",
      buyPrice: "13450000",
      productName: "Kim Gia Bảo 24K",
      priceDate: localDay(new Date()),
    });
    expect(snapshot.items[1]).toMatchObject({ name: "Banking", amount: "10000000" });
    expect(await listAssetCheckpoints(test.db, "b")).toEqual([]);
    await expect(
      createAssetCheckpoint(
        test.db,
        { items: [{ categoryId: gold.id, productCode: "KGB", weightMilliChi: 1000 }] },
        "a",
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rejects VND input for gold, invalid weights and unavailable gold prices without saving partial checkpoints", async () => {
    const gold = (await listAssetCategories(test.db, "a")).find(row => row.unit === "chi")!;
    await expect(
      createAssetCheckpoint(test.db, { items: [{ categoryId: gold.id, amount: "100" }] }, "a"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      createAssetCheckpoint(
        test.db,
        { items: [{ categoryId: gold.id, productCode: "KGB", weightMilliChi: 1.1 }] },
        "a",
      ),
    ).rejects.toThrow();
    const mock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    try {
      await expect(
        createAssetCheckpoint(
          test.db,
          { items: [{ categoryId: gold.id, productCode: "KGB", weightMilliChi: 1000 }] },
          "a",
        ),
      ).rejects.toMatchObject({ status: 503 });
    } finally {
      mock.mockRestore();
    }
    expect(await listAssetCheckpoints(test.db, "a")).toEqual([]);
  });
});
