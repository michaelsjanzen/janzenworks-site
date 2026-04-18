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

const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

// Replit's managed Postgres injects sslmode=disable — honour it explicitly.
const sslDisabled = connectionString.includes("sslmode=disable");

// pg v8+ treats sslmode=require/prefer/verify-ca as verify-full (full chain
// check), which rejects Supabase's self-signed cert. Strip the sslmode query
// param and pass our own ssl option so rejectUnauthorized:false takes effect.
// Traffic remains encrypted — we're only skipping chain verification, which
// is standard for managed Postgres on serverless platforms.
const strippedUrl = connectionString
  .replace(/([?&])sslmode=[^&]*/g, "$1")
  .replace(/[?&]$/, "");

const noSsl = isLocal || sslDisabled;

const pool = new Pool({
  connectionString: noSsl ? connectionString : strippedUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: noSsl ? undefined : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
