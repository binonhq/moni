import { migrate } from "drizzle-orm/node-postgres/migrator";
import { database } from "./environment";
const { db, pool } = database(true);
try { await migrate(db, { migrationsFolder: "./drizzle" }); console.log("Moni database migrations applied."); }
catch { console.error("Migration failed. Check database access, TLS, and migration state. Connection details have been suppressed."); process.exitCode = 1; }
finally { await pool.end(); }
