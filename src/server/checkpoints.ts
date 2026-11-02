import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { assetCheckpointItems, assetCheckpoints } from "@/db/schema";
import { assetCheckpointSchema } from "@/lib/validation";
import type { AssetCheckpoint } from "@/lib/types";
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
    group.push({ id: item.id, name: item.name, amount: item.amount.toString() });
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
  const total = data.items.reduce((sum, item) => sum + BigInt(item.amount), 0n);
  return db.transaction(async tx => {
    const [checkpoint] = await tx
      .insert(assetCheckpoints)
      .values({ userId, total })
      .returning({ id: assetCheckpoints.id });
    await tx.insert(assetCheckpointItems).values(
      data.items.map((item, position) => ({
        checkpointId: checkpoint.id,
        name: item.name,
        amount: BigInt(item.amount),
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
