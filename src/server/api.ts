import "server-only";
import { getDb } from "@/db";
import { getAuth } from "./auth";
import { ApiError } from "./errors";
import { checkToken, clientIdentity, rateLimit, requireSameOrigin } from "./security";

export async function authorize(request: Request, ingestion = false) {
  const db = getDb();
  await rateLimit(db, `edge:${clientIdentity(request)}`, 240);
  if (ingestion) {
    const userId = await checkToken(db, request);
    if (!userId) throw new ApiError(401, "UNAUTHORIZED", "This token is not assigned to a user.");
    await rateLimit(db, `ingestion:${userId}`, 60);
    return { db, userId };
  } else {
    // A Bearer token never grants dashboard read, edit, export, or delete access.
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Please sign in to Moni.");
    if (!["GET", "HEAD"].includes(request.method)) requireSameOrigin(request);
    await rateLimit(db, `session:${session.user.id}`, 180);
    return { db, userId: session.user.id };
  }
}
