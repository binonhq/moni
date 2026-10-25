import { input, password } from "@inquirer/prompts";
import { z } from "zod";
import { database } from "./environment";
import { createAuth } from "../src/server/auth-config";
import { user, session } from "../src/db/schema";
const { db, pool } = database();
try {
  const existing = await db.select({ id: user.id }).from(user).limit(1);
  if (existing.length) throw new Error("OWNER_EXISTS");
  const email = z.email().parse(process.env.MONI_SETUP_EMAIL || await input({ message: "Owner email:" }));
  const pass = z.string().min(13).max(128).parse(process.env.MONI_SETUP_PASSWORD || await password({ message: "Owner password (13+ characters):", mask: true }));
  const auth = createAuth(db, true);
  await auth.api.signUpEmail({ body: { name: "Owner", email, password: pass } });
  await db.delete(session);
  console.log("Your private owner account is ready. Public signup remains disabled.");
} catch (e) {
  console.error(e instanceof Error && e.message === "OWNER_EXISTS" ? "An owner already exists. Use npm run password:reset if necessary." : "Setup failed. Check environment, migrations, email, and password length. No credentials have been logged."); process.exitCode = 1;
} finally { await pool.end(); }
