import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

function renderPool() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    keepAlive: true,
    connectionTimeoutMillis: 15_000,
  });
  pool.on("error", (error) => console.error("PostgreSQL pool error", error));
  return pool;
}

export const db = process.env.APP_RUNTIME === "render"
  ? drizzlePostgres(renderPool(), { schema })
  : drizzleNetlify({ schema });
