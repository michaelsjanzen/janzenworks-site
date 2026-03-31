/**
 * Migration 006 — Create plugin-owned tables
 *
 * Creates tables for the comments, contact-form, and bot-analytics plugins.
 * Safe to run multiple times (IF NOT EXISTS guard on each table).
 *
 * Run via: npm run db:migrate
 */
import { existsSync } from "fs";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migration 006: creating plugin tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "plugin_comments_items" (
      "id"           SERIAL        PRIMARY KEY,
      "post_id"      INTEGER       NOT NULL,
      "parent_id"    INTEGER,
      "author_name"  VARCHAR(100)  NOT NULL,
      "author_email" VARCHAR(255)  NOT NULL,
      "content"      TEXT          NOT NULL,
      "approved"     BOOLEAN       NOT NULL DEFAULT FALSE,
      "created_at"   TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "plugin_contact_form_submissions" (
      "id"         SERIAL        PRIMARY KEY,
      "name"       VARCHAR(100)  NOT NULL,
      "email"      VARCHAR(255)  NOT NULL,
      "phone"      VARCHAR(50),
      "message"    TEXT          NOT NULL,
      "read"       BOOLEAN       NOT NULL DEFAULT FALSE,
      "created_at" TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "plugin_bot_analytics_visits" (
      "id"         SERIAL        PRIMARY KEY,
      "bot_name"   VARCHAR(100)  NOT NULL,
      "post_id"    INTEGER,
      "path"       VARCHAR(500)  NOT NULL,
      "visited_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Migration 006: done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration 006 failed:", err);
  process.exit(1);
});
