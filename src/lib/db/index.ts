import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// DATABASE_URL is the canonical name. POSTGRES_URL is injected automatically
// by the Vercel + Supabase integration, so we fall back to it for zero-config
// Vercel deployments. POSTGRES_URL_NON_POOLING is intentionally not used here
// because the Pool already manages connections — we want the pooler URL.
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "No database connection string found. Set DATABASE_URL (or POSTGRES_URL for Vercel+Supabase)."
  );
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
