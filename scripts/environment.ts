import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
config({ path: ".env.local", quiet: true }); config({ quiet: true });
export function database(direct = false) {
  const url = direct ? process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL : process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.local first.");
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 });
  return { pool, db: drizzle(pool, { schema }) };
}
