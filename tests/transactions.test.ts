import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { testDatabase } from "./helpers";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "@/server/transactions";
import {
  ingestionTransactionSchema,
  querySchema,
  transactionSchema,
  updateSchema,
} from "@/lib/validation";
import { getStats } from "@/server/stats";
import { addDays, dayStart, localDay, monthBounds, weekStart } from "@/lib/dates";
let test: Awaited<ReturnType<typeof testDatabase>>;
const payload = { amount: 1000000, timestamp: "2026-10-25T20:50:00+07:00" };
beforeAll(async () => {
  test = await testDatabase();
});
afterAll(async () => {
  await test.client.close();
});
beforeEach(async () => {
  await test.db.execute(sql`TRUNCATE transactions`);
});
describe("strict transaction contract", () => {
  it("accepts the original amount and timezone-bearing timestamp payload", () => {
    expect(transactionSchema.parse(payload)).toEqual(payload);
  });
  it("requires and normalizes notification content for ingestion", () => {
    expect(
      ingestionTransactionSchema.parse({
        ...payload,
        notificationContent: "  Account 123\n  spent 1,000,000 VND  ",
      }).notificationContent,
    ).toBe("Account 123 spent 1,000,000 VND");
    expect(ingestionTransactionSchema.safeParse(payload).success).toBe(false);
    expect(
      ingestionTransactionSchema.safeParse({ ...payload, notificationContent: " \n " }).success,
    ).toBe(false);
  });
  it("accepts a whole-number amount string and normalizes it", () => {
    expect(transactionSchema.parse({ ...payload, amount: "1000" })).toEqual({
      ...payload,
      amount: 1000,
    });
  });
  it.each([0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1, null, true])(
    "rejects invalid amount %s",
    amount => {
      expect(transactionSchema.safeParse({ ...payload, amount }).success).toBe(false);
    },
  );
  it.each(["2026-10-25T20:50:00", "2026-02-30T00:00:00Z", "not-a-date", "2026-13-01T00:00:00Z"])(
    "rejects invalid date %s",
    timestamp => {
      expect(transactionSchema.safeParse({ ...payload, timestamp }).success).toBe(false);
    },
  );
  it("rejects extra fields and empty updates", () => {
    expect(transactionSchema.safeParse({ ...payload, merchant: "Coffee" }).success).toBe(false);
    expect(updateSchema.safeParse({}).success).toBe(false);
  });
  it("validates ranges and rejects unknown query fields", () => {
    expect(querySchema.safeParse({ minAmount: "100", maxAmount: "10" }).success).toBe(false);
    expect(
      querySchema.safeParse({ from: "2026-10-26T00:00:00Z", to: "2026-10-25T00:00:00Z" }).success,
    ).toBe(false);
    expect(querySchema.safeParse({ arbitrary: "value" }).success).toBe(false);
  });
});
describe("database-backed transactions", () => {
  it("generates identifiers, stores integer money, and normalizes UTC", async () => {
    const { data, replayed } = await createTransaction(test.db, payload);
    expect(replayed).toBe(false);
    expect(data.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(data.amount).toBe("1000000");
    expect(data.timestamp).toBe("2026-10-25T13:50:00.000Z");
    expect(data.createdAt).toBeTruthy();
  });
  it("keeps genuine identical transactions when no key is supplied", async () => {
    const a = await createTransaction(test.db, payload);
    const b = await createTransaction(test.db, payload);
    expect(a.data.id).not.toBe(b.data.id);
    expect((await listTransactions(test.db, { limit: 30 })).data).toHaveLength(2);
  });
  it("replays the same normalized notification content", async () => {
    const a = await createTransaction(test.db, {
      ...payload,
      notificationContent: "Account 123\nspent 1,000,000 VND",
    });
    const b = await createTransaction(test.db, {
      ...payload,
      notificationContent: "  Account 123   spent 1,000,000 VND  ",
    });
    expect(b).toEqual({ data: a.data, replayed: true });
    expect((await listTransactions(test.db, { limit: 30 })).data).toHaveLength(1);
  });
  it("atomically handles concurrent duplicate notifications", async () => {
    const notification = { ...payload, notificationContent: "Unique bank notification" };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => createTransaction(test.db, notification)),
    );
    expect(new Set(results.map(r => r.data.id)).size).toBe(1);
    expect(results.filter(r => !r.replayed)).toHaveLength(1);
  });
  it("allows distinct notifications with identical transaction data", async () => {
    const a = await createTransaction(test.db, { ...payload, notificationContent: "Notice A" });
    const b = await createTransaction(test.db, { ...payload, notificationContent: "Notice B" });
    expect(a.data.id).not.toBe(b.data.id);
  });
  it("allows a notification to be imported again after its transaction is deleted", async () => {
    const notification = { ...payload, notificationContent: "Deleted notice" };
    const original = await createTransaction(test.db, notification);
    await deleteTransaction(test.db, original.data.id);
    const recreated = await createTransaction(test.db, notification);
    expect(recreated.replayed).toBe(false);
    expect(recreated.data.id).not.toBe(original.data.id);
  });
  it("updates amount and timestamp, then deletes", async () => {
    const { data } = await createTransaction(test.db, payload);
    const corrected = await updateTransaction(test.db, data.id, {
      amount: 125000,
      timestamp: "2026-10-26T00:10:03+07:00",
    });
    expect(corrected.amount).toBe("125000");
    expect(corrected.timestamp).toBe("2026-10-25T17:10:03.000Z");
    await deleteTransaction(test.db, data.id);
    await expect(updateTransaction(test.db, data.id, { amount: 10 })).rejects.toMatchObject({
      status: 404,
    });
    await expect(deleteTransaction(test.db, data.id)).rejects.toMatchObject({ status: 404 });
  });
  it("paginates deterministically through identical timestamps", async () => {
    for (let i = 1; i <= 5; i++) await createTransaction(test.db, { ...payload, amount: i });
    const first = await listTransactions(test.db, { limit: 2 });
    const second = await listTransactions(test.db, { limit: 2, cursor: first.nextCursor! });
    const last = await listTransactions(test.db, { limit: 2, cursor: second.nextCursor! });
    expect(new Set([...first.data, ...second.data, ...last.data].map(t => t.id)).size).toBe(5);
    expect(last.nextCursor).toBeNull();
  });
  it("filters amounts and half-open date ranges", async () => {
    await createTransaction(test.db, { ...payload, amount: 100 });
    await createTransaction(test.db, { ...payload, amount: 200 });
    await createTransaction(test.db, { amount: 200, timestamp: "2026-10-26T00:00:00+07:00" });
    const result = await listTransactions(test.db, {
      limit: 30,
      minAmount: "150",
      maxAmount: "200",
      from: "2026-10-25T00:00:00+07:00",
      to: "2026-10-26T00:00:00+07:00",
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].amount).toBe("200");
    await expect(listTransactions(test.db, { limit: 30, cursor: "invalid" })).rejects.toMatchObject(
      { status: 400 },
    );
  });
});
describe("Vietnam reports and exact arithmetic", () => {
  it("handles local day, month, leap year, and Monday boundaries", () => {
    expect(localDay("2026-10-25T17:00:00Z")).toBe("2026-10-26");
    expect(dayStart("2026-10-01").toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(monthBounds("2028-02").days).toBe(29);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekStart(new Date("2026-10-25T17:00:00Z")).toISOString()).toBe(
      "2026-10-25T17:00:00.000Z",
    );
  });
  it("returns complete zero-filled summaries for an empty database", async () => {
    const s = await getStats(test.db, "2026-10", new Date(payload.timestamp));
    expect(s.total).toBe("0");
    expect(s.count).toBe(0);
    expect(s.daily).toHaveLength(31);
    expect(s.monthly).toHaveLength(12);
    expect(s.averageDaily).toBe("0");
    expect(s.largestTransaction).toBeNull();
    expect(s.highestDay).toBeNull();
  });
  it("includes the correct local month boundaries and rounds averages down", async () => {
    await createTransaction(test.db, { amount: 7, timestamp: "2026-09-30T16:59:59Z" });
    await createTransaction(test.db, { amount: 101, timestamp: "2026-09-30T17:00:00Z" });
    await createTransaction(test.db, { amount: 150, timestamp: "2026-10-31T16:59:59Z" });
    await createTransaction(test.db, { amount: 11, timestamp: "2026-10-31T17:00:00Z" });
    const s = await getStats(test.db, "2026-10", new Date("2026-11-01T00:00:00+07:00"));
    expect(s.total).toBe("251");
    expect(s.count).toBe(2);
    expect(s.averageDaily).toBe("8");
    expect(s.averageTransaction).toBe("125");
    expect(s.previousMonth).toBe("7");
    expect(s.highestDay?.date).toBe("2026-10-31");
  });
  it("keeps totals exact beyond JavaScript's safe integer range", async () => {
    await createTransaction(test.db, { ...payload, amount: Number.MAX_SAFE_INTEGER });
    await createTransaction(test.db, { ...payload, amount: Number.MAX_SAFE_INTEGER });
    const s = await getStats(test.db, "2026-10", new Date(payload.timestamp));
    expect(s.total).toBe("18014398509481982");
    expect(s.today).toBe(s.total);
    expect(s.averageTransaction).toBe("9007199254740991");
    expect(s.daily[24].amount).toBe(s.total);
  });
});
