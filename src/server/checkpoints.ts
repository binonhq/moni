import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { assetCategories, assetCheckpointItems, assetCheckpoints } from "@/db/schema";
import { assetCheckpointSchema } from "@/lib/validation";
import type { AssetCheckpoint } from "@/lib/types";
import { ensureDailyGoldPrices } from "./gold";
import { ApiError } from "./errors";

export async function listAssetCheckpoints(
  db: Database,
  userId?: string,
): Promise<AssetCheckpoint[]> {
  const rows = await db
    .select()
    .from(assetCheckpoints)
    .where(userId ? eq(assetCheckpoints.userId, userId) : undefined)
    .orderBy(desc(assetCheckpoints.createdAt), desc(assetCheckpoints.id));
  if (!rows.length) return [];
  const itemRows = await db
    .select()
    .from(assetCheckpointItems)
    .where(
      inArray(
        assetCheckpointItems.checkpointId,
        rows.map(row => row.id),
      ),
    )
    .orderBy(asc(assetCheckpointItems.position));
  const items = new Map<string, AssetCheckpoint["items"]>();
  for (const item of itemRows) {
    const group = items.get(item.checkpointId) ?? [];
    group.push({
      id: item.id,
      name: item.name,
      amount: item.amount.toString(),
      weightMilliChi: item.weightMilliChi,
      productName: item.productName,
      buyPrice: item.buyPrice?.toString() ?? null,
      priceDate: item.priceDate,
    });
    items.set(item.checkpointId, group);
  }
  return rows.map(row => ({
    id: row.id,
    total: row.total.toString(),
    createdAt: row.createdAt.toISOString(),
    items: items.get(row.id) ?? [],
  }));
}

export async function createAssetCheckpoint(db: Database, input: unknown, userId?: string) {
  const data = assetCheckpointSchema.parse(input);
  const resolved: Array<{
    name: string;
    amount: bigint;
    weightMilliChi?: number;
    productCode?: string;
    productName?: string;
    buyPrice?: bigint;
    priceDate?: string;
  }> = [];
  const prices = data.items.some(item => "weightMilliChi" in item)
    ? await ensureDailyGoldPrices(db)
    : [];
  for (const item of data.items) {
    if ("name" in item) {
      if (userId) throw new ApiError(400, "ASSET_CATEGORY_REQUIRED", "Choose an asset category.");
      resolved.push({ name: item.name, amount: BigInt(item.amount) });
      continue;
    }
    if (!userId) throw new ApiError(401, "UNAUTHORIZED", "Please sign in.");
    const [category] = await db
      .select()
      .from(assetCategories)
      .where(and(eq(assetCategories.id, item.categoryId), eq(assetCategories.userId, userId)));
    if (!category)
      throw new ApiError(400, "INVALID_ASSET_CATEGORY", "Choose an existing asset category.");
    if (category.unit === "chi") {
      if (!("weightMilliChi" in item))
        throw new ApiError(
          400,
          "GOLD_WEIGHT_REQUIRED",
          "Enter the gold weight in chỉ and choose a product.",
        );
      const price = prices.find(price => price.productCode === item.productCode);
      if (!price)
        throw new ApiError(
          503,
          "GOLD_PRICE_UNAVAILABLE",
          "No BTMH price is available for this gold product.",
        );
      resolved.push({
        name: category.name,
        amount: (price.buyPrice * BigInt(item.weightMilliChi)) / 1000n,
        weightMilliChi: item.weightMilliChi,
        productCode: price.productCode,
        productName: price.productName,
        buyPrice: price.buyPrice,
        priceDate: price.priceDate,
      });
    } else {
      if (!("amount" in item))
        throw new ApiError(400, "AMOUNT_REQUIRED", "Enter a VND amount for this asset.");
      resolved.push({ name: category.name, amount: BigInt(item.amount) });
    }
  }
  const total = resolved.reduce((sum, item) => sum + item.amount, 0n);
  return db.transaction(async tx => {
    const [checkpoint] = await tx
      .insert(assetCheckpoints)
      .values({ userId, total })
      .returning({ id: assetCheckpoints.id });
    await tx.insert(assetCheckpointItems).values(
      resolved.map((item, position) => ({
        checkpointId: checkpoint.id,
        ...item,
        position,
      })),
    );
    return checkpoint.id;
  });
}

export async function deleteAssetCheckpoint(db: Database, id: string, userId?: string) {
  const checkpointId = z.uuid().parse(id);
  const conditions = [eq(assetCheckpoints.id, checkpointId)];
  if (userId) conditions.push(eq(assetCheckpoints.userId, userId));
  const removed = await db
    .delete(assetCheckpoints)
    .where(and(...conditions))
    .returning({ id: assetCheckpoints.id });
  if (!removed.length)
    throw new ApiError(404, "CHECKPOINT_NOT_FOUND", "This asset checkpoint no longer exists.");
}
