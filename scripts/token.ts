import { randomBytes, createHash } from "node:crypto";
import { database } from "./environment";
import { apiToken, user } from "../src/db/schema";
const { db, pool } = database();
try {
  if (!((await db.select({ id: user.id }).from(user).limit(1)).length)) throw new Error("OWNER_REQUIRED");
  if (process.argv[2] === "revoke") { await db.delete(apiToken); console.log("Ingestion token revoked."); }
  else if (process.argv[2] === "rotate") {
    const token = randomBytes(32).toString("base64url"); const hash = createHash("sha256").update(token).digest("hex");
    await db.insert(apiToken).values({ id: 1, hash }).onConflictDoUpdate({ target: apiToken.id, set: { hash, createdAt: new Date(), lastUsedAt: null } });
    console.log("New ingestion token (shown once). Store only in your Shortcut or password manager. The old token is now invalid.\n");
    process.stdout.write(token + "\n");
  } else throw new Error("INVALID_COMMAND");
} catch { console.error("Token operation failed. Check database configuration and create your owner account first."); process.exitCode = 1; }
finally { await pool.end(); }
