import { eq, max } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { apiToken } from "@/db/schema";
import { authorize } from "@/server/api";
import { endpoint, json } from "@/server/errors";
export async function GET(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    const [token] = await db
      .select({ createdAt: apiToken.createdAt, lastUsedAt: apiToken.lastUsedAt })
      .from(apiToken)
      .where(eq(apiToken.userId, userId));
    return json({
      data: {
        active: !!token,
        createdAt: token?.createdAt ?? null,
        lastUsedAt: token?.lastUsedAt ?? null,
      },
    });
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    await db.delete(apiToken).where(eq(apiToken.userId, userId));
    return json({ data: { active: false } });
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    const [existing] = await db.select({ id: max(apiToken.id) }).from(apiToken);
    const id = Number(existing?.id ?? 0) + 1;
    await db.insert(apiToken).values({ id, userId, hash }).onConflictDoUpdate({
      target: apiToken.userId,
      set: { hash, createdAt: new Date(), lastUsedAt: null },
    });
    return json({ data: { token } }, 201);
  });
}
