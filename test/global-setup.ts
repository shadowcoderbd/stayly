import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/** Creates the test database if needed and applies migrations. Needs the Compose `db` running. */
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "postgres://stayly:stayly@localhost:5432/stayly_test");
  const dbName = url.pathname.slice(1);

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const exists = await admin.query("select 1 from pg_database where datname = $1", [dbName]);
  if (exists.rowCount === 0) await admin.query(`create database "${dbName.replace(/"/g, "")}"`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: url.toString() });
  await migrate(drizzle({ client: pool }), { migrationsFolder: path.resolve(import.meta.dirname, "../drizzle") });
  await pool.end();
}
