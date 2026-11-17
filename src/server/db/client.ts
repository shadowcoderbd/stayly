import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { serverEnv } from "@/server/config/env";
import * as schema from "./schema";

pg.types.setTypeParser(1082, (v) => v); // `date` stays "YYYY-MM-DD" (no time-zone shifts)

// One pool per process. In dev, survive hot reloads instead of leaking connections.
const globalForDb = globalThis as unknown as { pgPool?: pg.Pool };
export const pool = globalForDb.pgPool ?? new pg.Pool({ connectionString: serverEnv.DATABASE_URL, max: 10 });
if (serverEnv.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
