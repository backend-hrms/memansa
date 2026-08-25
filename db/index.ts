import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

function renderClient() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    keepAlive: true,
    connectionTimeoutMillis: 15_000,
  });
  client.on("error", (error) => console.error("PostgreSQL client error", error));
  return client;
}

export const renderPgClient = process.env.APP_RUNTIME === "render" ? renderClient() : null;

export const db = renderPgClient
  ? drizzlePostgres(renderPgClient, { schema })
  : drizzleNetlify({ schema });
