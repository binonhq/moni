import { and, desc, eq, gte, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { transactions, idempotency, categories } from "@/db/schema";
import type { Category, Transaction, TransactionPage } from "@/lib/types";
import type { TransactionInput, TransactionQuery } from "@/lib/validation";
import { timestampSchema } from "@/lib/validation";
import { ApiError } from "./errors";
import { digest } from "./security";
import { findCategory } from "./categories";
import { formatExpenseTitle } from "@/lib/title";

export function serialize(row: typeof transactions.$inferSelect, category: Category | null = null): Transaction {
  return { id: row.id, amount: row.amount.toString(), title: formatExpenseTitle(row.title), categoryId: row.categoryId, category: category ? { id: category.id, name: category.name, icon: category.icon } : null, timestamp: row.timestamp.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export async function createTransaction(db: Database, input: TransactionInput, key?: string | null) {
  if (key && !/^[\x21-\x7e]{1,128}$/.test(key)) throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Use 1–128 printable characters for Idempotency-Key.");
  if (key === "") throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must not be empty.");
  const title = formatExpenseTitle(input.title); const categoryId = input.categoryId ?? null;
  // Preserve fingerprints for existing Shortcut requests that only contain amount/time.
  const base = `${input.amount}:${new Date(input.timestamp).toISOString()}`;
  const fingerprint = digest(title === "Expense" && categoryId === null ? base : `${base}:${JSON.stringify([title, categoryId])}`);
  return db.transaction(async tx => {
    if (key) {
      // Transaction-scoped lock serializes concurrent requests for this key across instances.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
      const [prior] = await tx.select().from(idempotency).where(eq(idempotency.key, key));
      if (prior) {
        const priorData = prior.response;
        const compatibleLegacyPayload = priorData.amount === String(input.amount)
          && new Date(priorData.timestamp).toISOString() === new Date(input.timestamp).toISOString()
          && formatExpenseTitle(priorData.title) === title
          && (priorData.categoryId ?? null) === categoryId;
        if (prior.fingerprint !== fingerprint && !compatibleLegacyPayload) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was already used with different transaction data.");
        return { data: { ...prior.response, title: formatExpenseTitle(prior.response.title), categoryId: prior.response.categoryId ?? null, category: prior.response.category ?? null }, replayed: true };
      }
    }
    const category = await findCategory(tx, categoryId);
    const [row] = await tx.insert(transactions).values({ amount: BigInt(input.amount), timestamp: new Date(input.timestamp), title, categoryId }).returning();
    const data = serialize(row, category);
    if (key) await tx.insert(idempotency).values({ key, fingerprint, response: data });
    return { data, replayed: false };
  });
}
const cursorSchema = z.object({ timestamp: timestampSchema, id: z.uuid() }).strict();
export function filters(query: TransactionQuery, includeCursor = true): SQL[] {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(transactions.timestamp, new Date(query.from)));
  if (query.to) conditions.push(lt(transactions.timestamp, new Date(query.to)));
  if (query.minAmount) conditions.push(gte(transactions.amount, BigInt(query.minAmount)));
  if (query.maxAmount) conditions.push(lte(transactions.amount, BigInt(query.maxAmount)));
  if (query.categoryId) conditions.push(query.categoryId === "uncategorized" ? isNull(transactions.categoryId) : eq(transactions.categoryId, query.categoryId));
  if (query.cursor && includeCursor) {
    let cursor: z.infer<typeof cursorSchema>;
    try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString())); }
    catch { throw new ApiError(400, "INVALID_CURSOR", "The pagination cursor is invalid."); }
    conditions.push(or(lt(transactions.timestamp, new Date(cursor.timestamp)), and(eq(transactions.timestamp, new Date(cursor.timestamp)), lt(transactions.id, cursor.id)))!);
  }
  return conditions;
}
export async function listTransactions(db: Database, query: TransactionQuery): Promise<TransactionPage> {
  const rows = await db.select({ transaction: transactions, category: categories }).from(transactions).leftJoin(categories, eq(transactions.categoryId, categories.id)).where(and(...filters(query))).orderBy(desc(transactions.timestamp), desc(transactions.id)).limit(query.limit + 1);
  const data = rows.slice(0, query.limit).map(row => serialize(row.transaction, row.category));
  const last = data.at(-1);
  return { data, nextCursor: rows.length > query.limit && last ? Buffer.from(JSON.stringify({ timestamp: last.timestamp, id: last.id })).toString("base64url") : null };
}
export async function updateTransaction(db: Database, id: string, input: Partial<TransactionInput>) {
  z.uuid().parse(id);
  return db.transaction(async tx => {
  if (input.categoryId) await findCategory(tx, input.categoryId);
  const [row] = await tx.update(transactions).set({
    ...(input.amount !== undefined ? { amount: BigInt(input.amount) } : {}),
    ...(input.title !== undefined ? { title: formatExpenseTitle(input.title) } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.timestamp ? { timestamp: new Date(input.timestamp) } : {}), updatedAt: new Date(),
  }).where(eq(transactions.id, id)).returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "This transaction no longer exists.");
  return serialize(row, await findCategory(tx, row.categoryId));
  });
}
export async function deleteTransaction(db: Database, id: string) {
  z.uuid().parse(id);
  const rows = await db.delete(transactions).where(eq(transactions.id, id)).returning({ id: transactions.id });
  if (!rows.length) throw new ApiError(404, "NOT_FOUND", "This transaction no longer exists.");
}
