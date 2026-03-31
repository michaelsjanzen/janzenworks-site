/**
 * Migration 007 — Bot Analytics v2 (two-table model)
 *
 * Creates the new aggregate + ring-buffer tables and backfills from the old
 * single-visit table (plugin_bot_analytics_visits) if it exists.
 *
 * After backfilling, drops the old table.
 * Safe to run multiple times (IF NOT EXISTS guards + existence checks).
 */
import { existsSync } from "fs";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migration 007: bot analytics v2...");

  // ── Create new tables ──────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "plugin_bot_analytics_daily" (
      "bot_name"      VARCHAR(100) NOT NULL,
      "resource_type" VARCHAR(50)  NOT NULL,
      "day"           DATE         NOT NULL,
      "count"         INTEGER      NOT NULL DEFAULT 1,
      PRIMARY KEY ("bot_name", "resource_type", "day")
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "plugin_bot_analytics_daily_day_idx"
      ON "plugin_bot_analytics_daily" ("day" DESC)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "plugin_bot_analytics_recent" (
      "id"            SERIAL        PRIMARY KEY,
      "bot_name"      VARCHAR(100)  NOT NULL,
      "resource_type" VARCHAR(50)   NOT NULL,
      "path"          VARCHAR(500)  NOT NULL,
      "visited_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "plugin_bot_analytics_recent_visited_at_idx"
      ON "plugin_bot_analytics_recent" ("visited_at" DESC)
  `);

  // ── Backfill from old table (if it exists) ─────────────────────────────────

  const oldTableExists = await db.execute(sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'plugin_bot_analytics_visits'
  `);

  if (oldTableExists.rows.length > 0) {
    console.log("Migration 007: backfilling from plugin_bot_analytics_visits...");

    // Aggregate old visits into the daily table (all classified as 'HTML Page').
    await db.execute(sql`
      INSERT INTO "plugin_bot_analytics_daily" ("bot_name", "resource_type", "day", "count")
      SELECT
        bot_name,
        'HTML Page'               AS resource_type,
        visited_at::date          AS day,
        COUNT(*)::int             AS count
      FROM "plugin_bot_analytics_visits"
      GROUP BY bot_name, visited_at::date
      ON CONFLICT ("bot_name", "resource_type", "day")
      DO UPDATE SET count = "plugin_bot_analytics_daily".count + EXCLUDED.count
    `);

    // Seed recent table from the newest 500 rows of the old table.
    await db.execute(sql`
      INSERT INTO "plugin_bot_analytics_recent" ("bot_name", "resource_type", "path", "visited_at")
      SELECT
        bot_name,
        'HTML Page' AS resource_type,
        path,
        visited_at
      FROM (
        SELECT bot_name, path, visited_at
        FROM "plugin_bot_analytics_visits"
        ORDER BY visited_at DESC
        LIMIT 500
      ) newest
    `);

    // Drop old table.
    await db.execute(sql`DROP TABLE "plugin_bot_analytics_visits"`);
    console.log("Migration 007: old table dropped.");
  }

  console.log("Migration 007: done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration 007 failed:", err);
  process.exit(1);
});
