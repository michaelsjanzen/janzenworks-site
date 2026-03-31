/**
 * Migration 004 — Add seo_title and seo_meta_description to posts
 *
 * Adds per-post SEO override columns. When set, these replace the default
 * title and description in <head> for that post or page.
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
  console.log("Migration 004: adding seo_title and seo_meta_description to posts...");

  await db.execute(sql`
    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS seo_title TEXT,
      ADD COLUMN IF NOT EXISTS seo_meta_description TEXT
  `);

  console.log("Migration 004: done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration 004 failed:", err);
  process.exit(1);
});
