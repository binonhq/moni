import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { moniPool?: Pool };
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  const pool = (globalDb.moniPool ??= new Pool({
    // The disposable PGlite browser runner has only one underlying connection.
    connectionString: process.env.DATABASE_URL,
    max: process.env.MONI_QA_SERIAL_DB === "1" && !process.env.VERCEL ? 1 : 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  }));
  return drizzle(pool, { schema });
}
export type Database = ReturnType<typeof getDb>;
