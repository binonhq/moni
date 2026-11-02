import { and, desc, eq, gte, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { transactions, categories } from "@/db/schema";
import type { Category, Transaction, TransactionPage } from "@/lib/types";
import type {
  IngestionTransactionInput,
  TransactionInput,
  TransactionQuery,
} from "@/lib/validation";
import { timestampSchema } from "@/lib/validation";
import { normalizeNotificationContent } from "@/lib/validation";
import { ApiError } from "./errors";
import { digest } from "./security";
import { findCategory } from "./categories";
import { formatExpenseTitle } from "@/lib/title";

export function serialize(
  row: typeof transactions.$inferSelect,
  category: Category | null = null,
): Transaction {
  return {
    id: row.id,
    amount: row.amount.toString(),
    title: formatExpenseTitle(row.title),
    categoryId: row.categoryId,
    category: category ? { id: category.id, name: category.name, icon: category.icon } : null,
    timestamp: row.timestamp.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export async function createTransaction(
  db: Database,
  input: TransactionInput | IngestionTransactionInput,
  userId?: string,
) {
  const title = formatExpenseTitle(input.title);
  const categoryId = input.categoryId ?? null;
  const notificationHash =
    "notificationContent" in input
      ? digest(normalizeNotificationContent(input.notificationContent))
      : null;
  return db.transaction(async tx => {
    if (notificationHash) {
      const [prior] = await tx
        .select({ transaction: transactions, category: categories })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(eq(transactions.notificationHash, notificationHash));
      if (prior) return { data: serialize(prior.transaction, prior.category), replayed: true };
    }
    const category = await findCategory(tx, categoryId, userId);
    const [row] = await tx
      .insert(transactions)
      .values({
        amount: BigInt(input.amount),
        timestamp: new Date(input.timestamp),
        title,
        categoryId,
        notificationHash,
        userId,
      })
      .onConflictDoNothing({ target: transactions.notificationHash })
      .returning();
    if (!row && notificationHash) {
      const [prior] = await tx
        .select({ transaction: transactions, category: categories })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(eq(transactions.notificationHash, notificationHash));
      if (prior) return { data: serialize(prior.transaction, prior.category), replayed: true };
    }
    if (!row) throw new ApiError(503, "CREATE_FAILED", "Could not create this transaction.");
    const data = serialize(row, category);
    return { data, replayed: false };
  });
}
const cursorSchema = z.object({ timestamp: timestampSchema, id: z.uuid() }).strict();
export function filters(query: TransactionQuery, includeCursor = true, userId?: string): SQL[] {
  const conditions: SQL[] = [];
  if (userId) conditions.push(eq(transactions.userId, userId));
  if (query.from) conditions.push(gte(transactions.timestamp, new Date(query.from)));
  if (query.to) conditions.push(lt(transactions.timestamp, new Date(query.to)));
  if (query.minAmount) conditions.push(gte(transactions.amount, BigInt(query.minAmount)));
  if (query.maxAmount) conditions.push(lte(transactions.amount, BigInt(query.maxAmount)));
  if (query.categoryId)
    conditions.push(
      query.categoryId === "uncategorized"
        ? isNull(transactions.categoryId)
        : eq(transactions.categoryId, query.categoryId),
    );
  if (query.cursor && includeCursor) {
    let cursor: z.infer<typeof cursorSchema>;
    try {
      cursor = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString()));
    } catch {
      throw new ApiError(400, "INVALID_CURSOR", "The pagination cursor is invalid.");
    }
    conditions.push(
      or(
        lt(transactions.timestamp, new Date(cursor.timestamp)),
        and(eq(transactions.timestamp, new Date(cursor.timestamp)), lt(transactions.id, cursor.id)),
      )!,
    );
  }
  return conditions;
}
export async function listTransactions(
  db: Database,
  query: TransactionQuery,
  userId?: string,
): Promise<TransactionPage> {
  const [rows, [summary]] = await Promise.all([
    db
      .select({ transaction: transactions, category: categories })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...filters(query, true, userId)))
      .orderBy(desc(transactions.timestamp), desc(transactions.id))
      .limit(query.limit + 1),
    db
      .select({
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(and(...filters(query, false, userId))),
  ]);
  const data = rows.slice(0, query.limit).map(row => serialize(row.transaction, row.category));
  const last = data.at(-1);
  return {
    data,
    total: summary.total,
    count: summary.count,
    nextCursor:
      rows.length > query.limit && last
        ? Buffer.from(JSON.stringify({ timestamp: last.timestamp, id: last.id })).toString(
            "base64url",
          )
        : null,
  };
}
export async function updateTransaction(
  db: Database,
  id: string,
  input: Partial<TransactionInput>,
  userId?: string,
) {
  z.uuid().parse(id);
  return db.transaction(async tx => {
    if (input.categoryId) await findCategory(tx, input.categoryId, userId);
    const [row] = await tx
      .update(transactions)
      .set({
        ...(input.amount !== undefined ? { amount: BigInt(input.amount) } : {}),
        ...(input.title !== undefined ? { title: formatExpenseTitle(input.title) } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.timestamp ? { timestamp: new Date(input.timestamp) } : {}),
        updatedAt: new Date(),
      })
      .where(
        userId
          ? and(eq(transactions.id, id), eq(transactions.userId, userId))
          : eq(transactions.id, id),
      )
      .returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "This transaction no longer exists.");
    return serialize(row, await findCategory(tx, row.categoryId, userId));
  });
}
export async function deleteTransaction(db: Database, id: string, userId?: string) {
  z.uuid().parse(id);
  const rows = await db
    .delete(transactions)
    .where(
      userId
        ? and(eq(transactions.id, id), eq(transactions.userId, userId))
        : eq(transactions.id, id),
    )
    .returning({ id: transactions.id });
  if (!rows.length) throw new ApiError(404, "NOT_FOUND", "This transaction no longer exists.");
}
