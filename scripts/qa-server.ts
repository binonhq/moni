/** Disposable QA environment. Never reads .env or connects to a real database. */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createAuth } from "../src/server/auth-config";
import { transactions, apiToken, categories } from "../src/db/schema";
import * as schema from "../src/db/schema";
import type { Database } from "../src/db";
import { digest } from "../src/server/security";
import { localMonth, localDay } from "../src/lib/dates";

if (process.env.VERCEL || process.env.NODE_ENV === "production") throw new Error("QA runner is local only. Run it from a development terminal.");
const client = await PGlite.create();
const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: "./drizzle" });
const port = Number(process.argv.find(arg => arg.startsWith("--port="))?.split("=")[1] ?? 3000);
process.env.BETTER_AUTH_URL = `http://127.0.0.1:${port}`;
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("base64url");
const auth = createAuth(db as unknown as Database, true);
await auth.api.signUpEmail({ body: { name: "QA Owner", email: "qa@moni.test", password: "Moni-QA-disposable-2026!" } });
const month = localMonth(); const today = Number(localDay().slice(8));
if (!process.argv.includes("--empty")) {
  const categoryList = await db.select().from(categories);
  const amounts = [65000, 125000, 450000, 35000, 280000, 1500000, 89000, 120000, 75000, 980000, 60000, 340000, 1200000, 55000, 215000, 750000, 125000, 1000000];
  for (const [i, amount] of amounts.entries()) {
    const day = Math.max(1, today - Math.floor((amounts.length - i - 1) * 1.3));
    await db.insert(transactions).values({ amount: BigInt(amount), title: i % 2 ? "expense" : "Lunch with friends", categoryId: categoryList[i % categoryList.length].id, timestamp: new Date(`${month}-${String(day).padStart(2, "0")}T${String(8 + i % 13).padStart(2, "0")}:15:00+07:00`) });
  }
}
// A disposable test token only; it never belongs to a deployed account.
await db.insert(apiToken).values({ id: 1, hash: digest("Q".repeat(43)) });
const socket = new PGLiteSocketServer({ db: client, host: "127.0.0.1", port: 54329, maxConnections: 8 });
await socket.start();
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54329/postgres", DATABASE_URL_UNPOOLED: "", NODE_ENV: "production", MONI_QA_SERIAL_DB: "1" },
});
console.log(`Disposable QA server listening on port ${port}.`);
let stopping = false;
async function stop() { if (stopping) return; stopping = true; child.kill(); await socket.stop(); await client.close(); process.exit(0); }
process.on("SIGINT", stop); process.on("SIGTERM", stop); child.on("exit", stop);
