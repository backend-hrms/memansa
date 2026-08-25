import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

export const db = process.env.APP_RUNTIME === "render"
  ? drizzlePostgres(new pg.Pool({ connectionString: process.env.DATABASE_URL }), { schema })
  : drizzleNetlify({ schema });
