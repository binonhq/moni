import { z } from "zod";
import { categoryIcons } from "./categories";
import { formatExpenseTitle } from "./title";
export const normalizeNotificationContent = (value: string) =>
  value.normalize("NFKC").replace(/\s+/gu, " ").trim();
export const timestampSchema = z.iso.datetime({ offset: true }).refine(v => {
  const date = new Date(v);
  return (
    Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() >= 1900 &&
    date.getUTCFullYear() <= 9998
  );
}, "Use a valid date between 1900 and 9998 with a timezone.");
export const transactionSchema = z
  .object({
    amount: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number<string | number>().int().positive().max(Number.MAX_SAFE_INTEGER)),
    timestamp: timestampSchema,
    title: z.string().trim().max(120).transform(formatExpenseTitle).optional(),
    categoryId: z.uuid().nullable().optional(),
  })
  .strict();
export const ingestionTransactionSchema = transactionSchema.extend({
  notificationContent: z
    .string()
    .max(10000)
    .transform(normalizeNotificationContent)
    .pipe(z.string().min(1, "Notification content must not be empty.")),
});
export const updateSchema = transactionSchema
  .partial()
  .refine(v => Object.keys(v).length > 0, "Provide an expense field to update.");
export const categorySchema = z
  .object({ name: z.string().trim().min(1).max(40), icon: z.enum(categoryIcons).default("tag") })
  .strict();
const amountFilter = z
  .string()
  .regex(/^\d{1,16}$/)
  .refine(v => BigInt(v) <= BigInt(Number.MAX_SAFE_INTEGER));
export const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().max(512).optional(),
    from: timestampSchema.optional(),
    to: timestampSchema.optional(),
    minAmount: amountFilter.optional(),
    maxAmount: amountFilter.optional(),
    categoryId: z.union([z.uuid(), z.literal("uncategorized")]).optional(),
  })
  .strict()
  .refine(
    v => !v.from || !v.to || new Date(v.from) < new Date(v.to),
    "The end must follow the start.",
  )
  .refine(
    v => !v.minAmount || !v.maxAmount || BigInt(v.minAmount) <= BigInt(v.maxAmount),
    "Minimum exceeds maximum.",
  );
export const monthSchema = z.string().regex(/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/);
const safeVnd = z
  .union([z.string(), z.number()])
  .pipe(z.coerce.number<string | number>().int().nonnegative().max(Number.MAX_SAFE_INTEGER));
export const goldPurchaseSchema = z
  .object({
    productCode: z.string().trim().min(1).max(30),
    weightMilliChi: z.coerce.number().int().positive().max(1_000_000),
    purchasePrice: safeVnd.refine(value => value > 0),
    purchasedAt: timestampSchema,
  })
  .strict();
export const assetCheckpointSchema = z
  .object({
    items: z
      .array(z.object({ name: z.string().trim().min(1).max(80), amount: safeVnd }).strict())
      .min(1)
      .max(20),
  })
  .strict();
export type TransactionInput = z.infer<typeof transactionSchema>;
export type IngestionTransactionInput = z.infer<typeof ingestionTransactionSchema>;
export type TransactionQuery = z.infer<typeof querySchema>;
export type GoldPurchaseInput = z.infer<typeof goldPurchaseSchema>;
export type AssetCheckpointInput = z.infer<typeof assetCheckpointSchema>;
