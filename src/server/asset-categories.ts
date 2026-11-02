import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { assetCategories, assetCategorySets } from "@/db/schema";
import { assetCategorySchema } from "@/lib/validation";
import { ApiError } from "./errors";
export async function listAssetCategories(db: Database, userId: string) {
  await db.transaction(async tx => {
    const seeded = await tx
      .insert(assetCategorySets)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
    if (seeded.length)
      await tx.insert(assetCategories).values([
        { userId, name: "Tiết kiệm", unit: "vnd" as const },
        { userId, name: "Banking", unit: "vnd" as const },
        { userId, name: "Vàng", unit: "chi" as const },
      ]);
  });
  return db
    .select({ id: assetCategories.id, name: assetCategories.name, unit: assetCategories.unit })
    .from(assetCategories)
    .where(eq(assetCategories.userId, userId))
    .orderBy(asc(assetCategories.name));
}
function duplicate(error: unknown): never {
  if (
    (error as { code?: string }).code === "23505" ||
    (error as { cause?: { code?: string } }).cause?.code === "23505"
  )
    throw new ApiError(
      409,
      "ASSET_CATEGORY_EXISTS",
      "An asset category with this name already exists.",
    );
  throw error;
}
export async function saveAssetCategory(db: Database, userId: string, input: unknown, id?: string) {
  const data = assetCategorySchema.parse(input);
  await listAssetCategories(db, userId);
  try {
    const rows = id
      ? await db
          .update(assetCategories)
          .set(data)
          .where(
            and(eq(assetCategories.id, z.uuid().parse(id)), eq(assetCategories.userId, userId)),
          )
          .returning()
      : await db
          .insert(assetCategories)
          .values({ ...data, userId })
          .returning();
    if (!rows.length)
      throw new ApiError(404, "ASSET_CATEGORY_NOT_FOUND", "This asset category no longer exists.");
    return { id: rows[0].id, name: rows[0].name, unit: rows[0].unit };
  } catch (error) {
    return duplicate(error);
  }
}
export async function deleteAssetCategory(db: Database, userId: string, id: string) {
  const rows = await db
    .delete(assetCategories)
    .where(and(eq(assetCategories.id, z.uuid().parse(id)), eq(assetCategories.userId, userId)))
    .returning();
  if (!rows.length)
    throw new ApiError(404, "ASSET_CATEGORY_NOT_FOUND", "This asset category no longer exists.");
}
