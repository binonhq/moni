import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { categories } from "@/db/schema";
import { categorySchema } from "@/lib/validation";
import type { Category } from "@/lib/types";
import { ApiError } from "./errors";

export async function listCategories(db: Database): Promise<Category[]> {
  return db
    .select({ id: categories.id, name: categories.name, icon: categories.icon })
    .from(categories)
    .orderBy(asc(categories.name));
}
export async function createCategory(db: Database, input: unknown): Promise<Category> {
  const data = categorySchema.parse(input);
  const [category] = await db
    .insert(categories)
    .values(data)
    .onConflictDoNothing()
    .returning({ id: categories.id, name: categories.name, icon: categories.icon });
  if (!category)
    throw new ApiError(409, "CATEGORY_EXISTS", "A category with this name already exists.");
  return category;
}
export async function deleteCategory(db: Database, id: string): Promise<void> {
  const categoryId = z.uuid().parse(id);
  const removed = await db
    .delete(categories)
    .where(eq(categories.id, categoryId))
    .returning({ id: categories.id });
  if (!removed.length)
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "This category no longer exists.");
}
export async function findCategory(
  db: Pick<Database, "select">,
  id?: string | null,
): Promise<Category | null> {
  if (!id) return null;
  const [category] = await db
    .select({ id: categories.id, name: categories.name, icon: categories.icon })
    .from(categories)
    .where(eq(categories.id, id));
  if (!category) throw new ApiError(400, "INVALID_CATEGORY", "Choose an existing category.");
  return category;
}
