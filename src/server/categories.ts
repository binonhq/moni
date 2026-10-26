import { asc, eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { categories } from "@/db/schema";
import { categorySchema } from "@/lib/validation";
import type { Category } from "@/lib/types";
import { ApiError } from "./errors";

export async function listCategories(db: Database, userId?: string): Promise<Category[]> {
  return db
    .select({ id: categories.id, name: categories.name, icon: categories.icon })
    .from(categories)
    .where(userId ? eq(categories.userId, userId) : undefined)
    .orderBy(asc(categories.name));
}
export async function createCategory(db: Database, input: unknown, userId?: string): Promise<Category> {
  const data = categorySchema.parse(input);
  if (!userId) {
    const [existing] = await db.select({ id: categories.id }).from(categories).where(sql`lower(${categories.name}) = lower(${data.name})`);
    if (existing) throw new ApiError(409, "CATEGORY_EXISTS", "A category with this name already exists.");
  }
  const [category] = await db
    .insert(categories)
    .values({ ...data, userId })
    .onConflictDoNothing()
    .returning({ id: categories.id, name: categories.name, icon: categories.icon });
  if (!category)
    throw new ApiError(409, "CATEGORY_EXISTS", "A category with this name already exists.");
  return category;
}
export async function deleteCategory(db: Database, id: string, userId?: string): Promise<void> {
  const categoryId = z.uuid().parse(id);
  const removed = await db
    .delete(categories)
    .where(userId ? and(eq(categories.id, categoryId), eq(categories.userId, userId)) : eq(categories.id, categoryId))
    .returning({ id: categories.id });
  if (!removed.length)
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "This category no longer exists.");
}
export async function findCategory(
  db: Pick<Database, "select">,
  id?: string | null,
  userId?: string,
): Promise<Category | null> {
  if (!id) return null;
  const [category] = await db
    .select({ id: categories.id, name: categories.name, icon: categories.icon })
    .from(categories)
    .where(userId ? and(eq(categories.id, id), eq(categories.userId, userId)) : eq(categories.id, id));
  if (!category) throw new ApiError(400, "INVALID_CATEGORY", "Choose an existing category.");
  return category;
}
