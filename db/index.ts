import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

function renderPool() {
  const connection = new URL(process.env.DATABASE_URL || "");
  if (!connection.hostname.includes(".")) connection.hostname += ".singapore-postgres.render.com";
  return new pg.Pool({ connectionString: connection.toString(), ssl: { rejectUnauthorized: false }, keepAlive: true });
}

export const db = process.env.APP_RUNTIME === "render"
  ? drizzlePostgres(renderPool(), { schema })
  : drizzleNetlify({ schema });
