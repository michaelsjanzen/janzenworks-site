/**
 * create-schema.ts
 *
 * Creates all Pugmill database tables using IF NOT EXISTS guards.
 * Safe to run on a blank database or an existing one — never drops or alters.
 * Does NOT require drizzle-kit or a TTY. Works in Replit, CI, Docker, etc.
 *
 * Called by: npm run db:init
 * Also imported by: scripts/replit-init.ts
 */
import { existsSync } from "fs";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

export async function createSchema() {
  console.log("  Creating database tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_users" (
      "id"             TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name"           TEXT,
      "email"          TEXT         NOT NULL UNIQUE,
      "email_verified" TIMESTAMP,
      "image"          TEXT,
      "password_hash"  TEXT,
      "role"           VARCHAR(20)  NOT NULL DEFAULT 'editor',
      "author_voice"   TEXT,
      "created_at"     TIMESTAMP    NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "accounts" (
      "user_id"            TEXT    NOT NULL,
      "type"               TEXT    NOT NULL,
      "provider"           TEXT    NOT NULL,
      "provider_account_id" TEXT   NOT NULL,
      "refresh_token"      TEXT,
      "access_token"       TEXT,
      "expires_at"         INTEGER,
      "token_type"         TEXT,
      "scope"              TEXT,
      "id_token"           TEXT,
      "session_state"      TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "session_token" TEXT      PRIMARY KEY,
      "user_id"       TEXT      NOT NULL,
      "expires"       TIMESTAMP NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "verification_tokens" (
      "identifier" TEXT      NOT NULL,
      "token"      TEXT      NOT NULL,
      "expires"    TIMESTAMP NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "media" (
      "id"          SERIAL   PRIMARY KEY,
      "file_name"   TEXT     NOT NULL,
      "file_type"   VARCHAR(50),
      "file_size"   INTEGER,
      "url"         TEXT     NOT NULL,
      "storage_key" TEXT,
      "alt_text"    TEXT,
      "uploader_id" TEXT     REFERENCES "admin_users"("id"),
      "created_at"  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "posts" (
      "id"            SERIAL        PRIMARY KEY,
      "type"          VARCHAR(20)   NOT NULL DEFAULT 'post',
      "title"         TEXT          NOT NULL,
      "slug"          VARCHAR(255)  NOT NULL UNIQUE,
      "content"       TEXT          NOT NULL,
      "excerpt"       TEXT,
      "featured_image" INTEGER      REFERENCES "media"("id"),
      "published"     BOOLEAN       NOT NULL DEFAULT FALSE,
      "featured"      BOOLEAN       NOT NULL DEFAULT FALSE,
      "published_at"  TIMESTAMP,
      "author_id"     TEXT          REFERENCES "admin_users"("id"),
      "parent_id"     INTEGER,
      "aeo_metadata"  JSONB,
      "created_at"    TIMESTAMP     NOT NULL DEFAULT NOW(),
      "updated_at"    TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "posts_published_type_idx" ON "posts"("published", "type")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "posts_author_id_idx" ON "posts"("author_id")
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "settings" (
      "key"        VARCHAR(100) PRIMARY KEY,
      "value"      TEXT         NOT NULL,
      "updated_at" TIMESTAMP    NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "categories" (
      "id"          SERIAL        PRIMARY KEY,
      "name"        VARCHAR(100)  NOT NULL UNIQUE,
      "slug"        VARCHAR(100)  NOT NULL UNIQUE,
      "description" TEXT,
      "created_at"  TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "tags" (
      "id"         SERIAL        PRIMARY KEY,
      "name"       VARCHAR(100)  NOT NULL UNIQUE,
      "slug"       VARCHAR(100)  NOT NULL UNIQUE,
      "created_at" TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "post_categories" (
      "post_id"     INTEGER NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
      "category_id" INTEGER NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "post_tags" (
      "post_id" INTEGER NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
      "tag_id"  INTEGER NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "site_config" (
      "id"         INTEGER   PRIMARY KEY DEFAULT 1,
      "config"     JSONB     NOT NULL,
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "theme_design_configs" (
      "id"         SERIAL        PRIMARY KEY,
      "theme_id"   VARCHAR(100)  NOT NULL,
      "status"     VARCHAR(20)   NOT NULL,
      "config"     JSONB         NOT NULL,
      "created_at" TIMESTAMP     NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "theme_design_configs_theme_active_status_idx"
    ON "theme_design_configs"("theme_id", "status")
    WHERE status IN ('draft', 'published')
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_notifications" (
      "id"          SERIAL        PRIMARY KEY,
      "plugin_id"   TEXT          NOT NULL,
      "type"        VARCHAR(20)   NOT NULL DEFAULT 'info',
      "message"     TEXT          NOT NULL,
      "href"        TEXT,
      "replace_key" TEXT,
      "read"        BOOLEAN       NOT NULL DEFAULT FALSE,
      "item_count"  INTEGER       NOT NULL DEFAULT 1,
      "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "admin_notifications_plugin_replace_key_idx"
    ON "admin_notifications"("plugin_id", "replace_key")
    WHERE replace_key IS NOT NULL
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id"          SERIAL        PRIMARY KEY,
      "action"      VARCHAR(100)  NOT NULL,
      "user_id"     TEXT,
      "resource_id" TEXT,
      "detail"      TEXT,
      "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "widget_settings" (
      "id"         SERIAL PRIMARY KEY,
      "widget_id"  TEXT   NOT NULL,
      "key"        TEXT   NOT NULL,
      "value"      TEXT   NOT NULL,
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "widget_settings_widget_key_idx"
    ON "widget_settings"("widget_id", "key")
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ai_usage" (
      "user_id"      TEXT      PRIMARY KEY,
      "window_start" TIMESTAMP NOT NULL DEFAULT NOW(),
      "count"        INTEGER   NOT NULL DEFAULT 0
    )
  `);

  // Plugin tables are created by each plugin's schema.migrate() method,
  // called automatically via loadPlugins() on first server startup.
  // They are intentionally omitted here to keep create-schema.ts focused
  // on core tables only and avoid schema drift between the two sources.

  console.log("  Database schema ready.");
}

// Standalone runner (npm run db:create)
if (process.argv[1]?.endsWith("create-schema.ts") || process.argv[1]?.endsWith("create-schema.js")) {
  createSchema()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Schema creation failed:", err);
      process.exit(1);
    });
}
