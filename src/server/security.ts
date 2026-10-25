import { createHash, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { apiToken, rateBuckets } from "@/db/schema";
import { ApiError } from "./errors";
export const digest = (text: string) => createHash("sha256").update(text).digest("hex");
export function requireSameOrigin(request: Request) {
  const origin = process.env.BETTER_AUTH_URL && new URL(process.env.BETTER_AUTH_URL).origin;
  if (!origin || request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "FORBIDDEN", "This request must come from Moni.");
}
export async function checkToken(db: Database, request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.match(/^Bearer [A-Za-z0-9_-]{43}$/)) throw new ApiError(401, "UNAUTHORIZED", "A valid ingestion token is required.");
  const [token] = await db.select().from(apiToken).where(eq(apiToken.id, 1));
  const supplied = Buffer.from(digest(header.slice(7)), "hex");
  const expected = Buffer.from(token?.hash ?? "0".repeat(64), "hex");
  if (!token || expected.length !== supplied.length || !timingSafeEqual(supplied, expected)) throw new ApiError(401, "UNAUTHORIZED", "A valid ingestion token is required.");
  await db.update(apiToken).set({ lastUsedAt: new Date() }).where(eq(apiToken.hash, token.hash));
}
export async function rateLimit(db: Database, identity: string, maximum = 120, seconds = 60) {
  const key = digest(identity);
  const [bucket] = await db.insert(rateBuckets).values({ key, count: 1, resetAt: new Date(Date.now() + seconds * 1000) }).onConflictDoUpdate({
    target: rateBuckets.key,
    set: {
      count: sql`CASE WHEN ${rateBuckets.resetAt} <= now() THEN 1 ELSE ${rateBuckets.count} + 1 END`,
      resetAt: sql`CASE WHEN ${rateBuckets.resetAt} <= now() THEN now() + ${seconds} * interval '1 second' ELSE ${rateBuckets.resetAt} END`,
    },
  }).returning();
  if (bucket.count > maximum) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a moment.", Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000)));
}
export function clientIdentity(request: Request) {
  // Vercel overwrites this header. Other deployments share a conservative global bucket.
  return process.env.VERCEL === "1" ? (request.headers.get("x-vercel-forwarded-for") || "unknown").slice(0, 128) : "local";
}
