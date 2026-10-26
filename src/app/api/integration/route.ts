import { eq } from "drizzle-orm";
import { apiToken } from "@/db/schema";
import { authorize } from "@/server/api";
import { endpoint, json } from "@/server/errors";
export async function GET(request: Request) {
  return endpoint(async () => {
    const db = await authorize(request);
    const [token] = await db
      .select({ createdAt: apiToken.createdAt, lastUsedAt: apiToken.lastUsedAt })
      .from(apiToken)
      .where(eq(apiToken.id, 1));
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
    const db = await authorize(request);
    await db.delete(apiToken).where(eq(apiToken.id, 1));
    return json({ data: { active: false } });
  });
}
