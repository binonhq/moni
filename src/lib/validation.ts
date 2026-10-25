import { z } from "zod";
import { categoryIcons } from "./categories";
import { formatExpenseTitle } from "./title";
export const timestampSchema = z.iso.datetime({ offset: true }).refine(v => {
  const date = new Date(v);
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 1900 && date.getUTCFullYear() <= 9998;
}, "Use a valid date between 1900 and 9998 with a timezone.");
export const transactionSchema = z.object({
  amount: z.coerce.number<string | number>()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER),
  timestamp: timestampSchema,
  title: z.string().trim().max(120).transform(formatExpenseTitle).optional(), categoryId: z.uuid().nullable().optional(),
}).strict();
export const updateSchema = transactionSchema.partial().refine(v => Object.keys(v).length > 0, "Provide an expense field to update.");
export const categorySchema = z.object({ name: z.string().trim().min(1).max(40), icon: z.enum(categoryIcons).default("tag") }).strict();
const amountFilter = z.string().regex(/^\d{1,16}$/).refine(v => BigInt(v) <= BigInt(Number.MAX_SAFE_INTEGER));
export const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().max(512).optional(), from: timestampSchema.optional(), to: timestampSchema.optional(),
  minAmount: amountFilter.optional(), maxAmount: amountFilter.optional(),
  categoryId: z.union([z.uuid(), z.literal("uncategorized")]).optional(),
}).strict().refine(v => !v.from || !v.to || new Date(v.from) < new Date(v.to), "The end must follow the start.")
  .refine(v => !v.minAmount || !v.maxAmount || BigInt(v.minAmount) <= BigInt(v.maxAmount), "Minimum exceeds maximum.");
export const monthSchema = z.string().regex(/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/);
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionQuery = z.infer<typeof querySchema>;
