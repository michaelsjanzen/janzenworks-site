import type { PugmillPlugin } from "../../src/lib/plugin-registry";
import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";
import { detectBot, classifyPath } from "../../src/lib/bot-detection";
import { pluginBotAnalyticsDaily, pluginBotAnalyticsRecent } from "./schema";
import BotAnalyticsAdminPage from "./components/AdminPage";

/**
 * Log one bot visit to the two-table model.
 *
 *  1. Upsert into plugin_bot_analytics_daily  — aggregate counter (90-day retention).
 *  2. Insert into plugin_bot_analytics_recent — ring buffer (7-day + 500-row cap).
 */
async function logBotVisit(botName: string, path: string, resourceType: string) {
  // 1. Upsert aggregate row — composite PK (bot_name, resource_type, day) deduplicates.
  await db.execute(sql`
    INSERT INTO plugin_bot_analytics_daily (bot_name, resource_type, day, count)
    VALUES (${botName}, ${resourceType}, CURRENT_DATE, 1)
    ON CONFLICT (bot_name, resource_type, day)
    DO UPDATE SET count = plugin_bot_analytics_daily.count + 1
  `);

  // 2. Append to recent ring-buffer.
  await db.insert(pluginBotAnalyticsRecent).values({ botName, resourceType, path });

  // Prune recent: drop rows older than 7 days, then enforce 500-row hard cap.
  // Both run async — errors are non-fatal.
  void db.execute(sql`
    DELETE FROM plugin_bot_analytics_recent
    WHERE visited_at < NOW() - INTERVAL '7 days'
  `);
  void db.execute(sql`
    DELETE FROM plugin_bot_analytics_recent
    WHERE id IN (
      SELECT id FROM plugin_bot_analytics_recent
      ORDER BY visited_at DESC
      OFFSET 500
    )
  `);
}

export const botAnalyticsPlugin: PugmillPlugin = {
  id: "bot-analytics",
  name: "Bot Analytics",
  version: "2.0.0",
  description: "Tracks AI crawler and search engine bot visits to your content.",

  actionHref: "/admin/bot-analytics",

  schema: {
    async migrate() {
      // Daily aggregate table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_bot_analytics_daily (
          bot_name      VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50)  NOT NULL,
          day           DATE         NOT NULL,
          count         INTEGER      NOT NULL DEFAULT 1,
          PRIMARY KEY (bot_name, resource_type, day)
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS plugin_bot_analytics_daily_day_idx
          ON plugin_bot_analytics_daily (day DESC)
      `);

      // Recent ring-buffer table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_bot_analytics_recent (
          id            SERIAL PRIMARY KEY,
          bot_name      VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50)  NOT NULL,
          path          VARCHAR(500) NOT NULL,
          visited_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS plugin_bot_analytics_recent_visited_at_idx
          ON plugin_bot_analytics_recent (visited_at DESC)
      `);
    },
    async teardown() {
      await db.execute(sql`DROP TABLE IF EXISTS plugin_bot_analytics_daily`);
      await db.execute(sql`DROP TABLE IF EXISTS plugin_bot_analytics_recent`);
    },
  },

  adminPage: BotAnalyticsAdminPage,

  async initialize(hooks) {
    // Prune daily aggregates older than 90 days on startup. Non-blocking, non-fatal.
    void db.execute(sql`
      DELETE FROM plugin_bot_analytics_daily
      WHERE day < CURRENT_DATE - INTERVAL '90 days'
    `);

    // Track HTML page visits via the content:render filter.
    hooks.addFilter("content:render", async ({ input, post }) => {
      try {
        const { headers } = await import("next/headers");
        const headerStore = await headers();
        const ua = headerStore.get("user-agent") ?? "";
        const botName = detectBot(ua);
        if (botName) {
          const path = post.type === "page" ? `/${post.slug}` : `/post/${post.slug}`;
          void logBotVisit(botName, path, "HTML Page");
        }
      } catch {
        // Never surface analytics errors to the user
      }
      return input;
    });

    // Track AEO endpoint visits (llms.txt, llms-full.txt, etc.)
    // fired directly from those route handlers.
    hooks.addAction("request:bot-visit", async ({ botName, path, resourceType }) => {
      try {
        void logBotVisit(botName, path, resourceType);
      } catch {
        // Non-fatal
      }
    });
  },
};
