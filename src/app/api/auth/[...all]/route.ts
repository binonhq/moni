import { getAuth } from "@/server/auth";
import { getDb } from "@/db";
import { ApiError, endpoint, json, privateHeaders } from "@/server/errors";
import { clientIdentity, rateLimit, requireSameOrigin } from "@/server/security";
async function handler(request: Request) {
  return endpoint(async () => {
    const path = new URL(request.url).pathname.replace("/api/auth/", "");
    if (!new Set(["sign-in/email", "get-session", "sign-out", "change-password"]).has(path)) throw new ApiError(404, "NOT_FOUND", "This endpoint is unavailable.");
    if (request.method !== "GET") requireSameOrigin(request);
    const db = getDb();
    await rateLimit(db, `auth:${clientIdentity(request)}`, 30);
    if (path === "sign-in/email" || path === "change-password") await rateLimit(db, "auth:credential", 10, 300);
    const response = await getAuth().handler(request);
    if (!response.ok) {
      return json({ error: { code: response.status === 429 ? "RATE_LIMITED" : "AUTH_FAILED", message: path === "sign-in/email" ? "Unable to sign in. Check your email and password." : "The authentication request could not be completed." } }, response.status);
    }
    const headers = new Headers(response.headers);
    Object.entries(privateHeaders).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, { status: response.status, headers });
  });
}
export { handler as GET, handler as POST };
