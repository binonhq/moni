import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { testDatabase } from "./helpers";
import { createCategory, listCategories } from "@/server/categories";
import { createTransaction, listTransactions, updateTransaction } from "@/server/transactions";
import { getStats } from "@/server/stats";
import { digest } from "@/server/security";
import { idempotency } from "@/db/schema";
import { transactionSchema } from "@/lib/validation";
import { normalizeAmount, formatAmountInput } from "@/lib/amount-input";
import { csvCell } from "@/lib/csv";
let test: Awaited<ReturnType<typeof testDatabase>>;
const payload = { amount: 100000, timestamp: "2026-10-25T20:50:00+07:00" };
beforeAll(async () => { test = await testDatabase(); });
afterAll(async () => { await test.client.close(); });
beforeEach(async () => { await test.db.execute(sql`TRUNCATE transactions, idempotency`); });

describe("expense categories and titles", () => {
  it("seeds useful categories and rejects duplicate names regardless of case", async () => {
    const categories = await listCategories(test.db);
    expect(categories.map(c => c.name)).toEqual(expect.arrayContaining(["Food", "Friend", "Love", "Shopping", "Gas", "Transport"]));
    const custom = await createCategory(test.db, { name: "  Hobbies  ", icon: "gift" });
    expect(custom.name).toBe("Hobbies"); expect(custom.icon).toBe("gift");
    await expect(createCategory(test.db, { name: "hobbies", icon: "tag" })).rejects.toMatchObject({ status: 409 });
    await expect(createCategory(test.db, { name: "  ", icon: "tag" })).rejects.toThrow();
  });
  it("keeps old ingestion payloads valid and defaults blank titles", async () => {
    const created = await createTransaction(test.db, payload);
    expect(created.data).toMatchObject({ title: "expense", categoryId: null, category: null });
    expect(transactionSchema.parse({ ...payload, title: " " }).title).toBe("expense");
    expect(transactionSchema.safeParse({ ...payload, title: "x".repeat(121) }).success).toBe(false);
  });
  it("stores, previews, filters, changes and clears a category without losing the title", async () => {
    const food = (await listCategories(test.db)).find(c => c.name === "Food")!;
    const created = await createTransaction(test.db, { ...payload, title: "Lunch", categoryId: food.id });
    expect(created.data).toMatchObject({ title: "Lunch", category: food });
    const page = await listTransactions(test.db, { limit: 30, categoryId: food.id });
    expect(page.data[0]).toEqual(created.data);
    expect((await listTransactions(test.db, { limit: 30, categoryId: "uncategorized" })).data).toHaveLength(0);
    const updated = await updateTransaction(test.db, created.data.id, { categoryId: null });
    expect(updated).toMatchObject({ title: "Lunch", category: null, categoryId: null });
    expect((await listTransactions(test.db, { limit: 30, categoryId: "uncategorized" })).data).toHaveLength(1);
    await expect(createTransaction(test.db, { ...payload, categoryId: "00000000-0000-4000-8000-000000000001" })).rejects.toMatchObject({ status: 400 });
  });
  it("counts all categories within the selected month using exact integer totals", async () => {
    const food = (await listCategories(test.db)).find(c => c.name === "Food")!;
    await createTransaction(test.db, { ...payload, categoryId: food.id, amount: Number.MAX_SAFE_INTEGER });
    await createTransaction(test.db, { ...payload, categoryId: food.id, amount: Number.MAX_SAFE_INTEGER });
    await createTransaction(test.db, payload);
    await createTransaction(test.db, { ...payload, categoryId: food.id, timestamp: "2026-11-01T00:00:00+07:00" });
    const stats = await getStats(test.db, "2026-10");
    expect(stats.byCategory).toEqual([{ category: food, amount: "18014398509481982", count: 2 }, { category: null, amount: "100000", count: 1 }]);
    expect(stats.largestTransaction?.category).toEqual(food);
    expect(stats.byCategory.reduce((sum, group) => sum + BigInt(group.amount), 0n).toString()).toBe(stats.total);
  });
  it("detects changed titles and categories on retries and preserves pre-migration retry keys", async () => {
    const food = (await listCategories(test.db)).find(c => c.name === "Food")!;
    await createTransaction(test.db, { ...payload, title: "Lunch", categoryId: food.id }, "category-retry");
    await expect(createTransaction(test.db, { ...payload, title: "Dinner", categoryId: food.id }, "category-retry")).rejects.toMatchObject({ status: 409 });
    await expect(createTransaction(test.db, { ...payload, title: "Lunch" }, "category-retry")).rejects.toMatchObject({ status: 409 });
    const old = { id: "00000000-0000-4000-8000-000000000002", amount: "100000", timestamp: new Date(payload.timestamp).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await test.db.insert(idempotency).values({ key: "old-retry", fingerprint: digest(`${payload.amount}:${old.timestamp}`), response: old as typeof idempotency.$inferInsert.response });
    const replay = await createTransaction(test.db, payload, "old-retry");
    expect(replay).toMatchObject({ replayed: true, data: { id: old.id, title: "expense", category: null } });
    expect((await listTransactions(test.db, { limit: 30 })).data).toHaveLength(1);
  });
});
describe("formatted amount input and exports", () => {
  it("formats exact digits, resets empty amounts to zero, and removes leading zeroes", () => {
    expect(normalizeAmount("")).toBe("0"); expect(normalizeAmount("", true)).toBe("");
    expect(formatAmountInput(normalizeAmount("000100000"))).toBe("100.000");
    expect(normalizeAmount("1.000.000")).toBe("1000000");
    expect(formatAmountInput("9007199254740991")).toBe("9.007.199.254.740.991");
  });
  it("quotes editable text in CSV and prevents spreadsheet formulas", () => {
    expect(csvCell('Lunch, "with friends"')).toBe('"Lunch, ""with friends"""');
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
  });
});
