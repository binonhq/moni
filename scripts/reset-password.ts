import { password } from "@inquirer/prompts";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { database } from "./environment";
import { account, session, user } from "../src/db/schema";
const { db, pool } = database();
try {
  const [owner] = await db.select({ id: user.id }).from(user).limit(1);
  if (!owner) throw new Error("OWNER_REQUIRED");
  const value = z.string().min(16).max(128).parse(await password({ message: "New owner password (16+ characters):", mask: true }));
  const hash = await hashPassword(value);
  await db.transaction(async tx => {
    await tx.update(account).set({ password: hash, updatedAt: new Date() }).where(and(eq(account.userId, owner.id), eq(account.providerId, "credential")));
    await tx.delete(session);
  });
  console.log("Password reset. All sessions have been signed out.");
} catch { console.error("Password reset failed. Check database configuration, owner account, and password length."); process.exitCode = 1; }
finally { await pool.end(); }
