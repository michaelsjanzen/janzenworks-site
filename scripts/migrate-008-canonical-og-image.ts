/**
 * Migration 008 — Add canonical_url and og_image_url to posts
 *
 * canonical_url: allows overriding the canonical <link> for a post/page
 * og_image_url:  allows specifying a custom Open Graph image URL separate
 *                from the featured image
 *
 * Safe to run multiple times (ADD COLUMN IF NOT EXISTS guard).
 *
 * Run via: npm run db:migrate
 */
import { existsSync } from "fs";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migration 008: adding canonical_url and og_image_url to posts...");

  await db.execute(sql`
    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS canonical_url TEXT,
      ADD COLUMN IF NOT EXISTS og_image_url TEXT
  `);

  console.log("Migration 008: done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration 008 failed:", err);
  process.exit(1);
});
