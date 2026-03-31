/**
 * Migration 005 — Add robots_noindex and robots_nofollow to posts
 *
 * Adds per-post robots meta control columns. Default false = search-engine-visible.
 * Safe to run multiple times (IF NOT EXISTS guard).
 *
 * Run via: npm run db:migrate
 */
import { existsSync } from "fs";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migration 005: adding robots_noindex and robots_nofollow to posts...");

  await db.execute(sql`
    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS robots_noindex BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS robots_nofollow BOOLEAN NOT NULL DEFAULT FALSE
  `);

  console.log("Migration 005: done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration 005 failed:", err);
  process.exit(1);
});
