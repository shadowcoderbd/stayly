import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@/server/db/client";

// Run with `tsx --conditions=react-server` so the `server-only` guard resolves to a no-op.
const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(import.meta.dirname, "../drizzle");

await migrate(db, { migrationsFolder });
console.log(`Migrations applied from ${migrationsFolder}`);
await pool.end();
