import { pgTable, serial, integer, varchar, date, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Two-table model (matches WP Pugmill v2 schema):
 *
 *   plugin_bot_analytics_daily
 *     Aggregate table. One row per (bot_name × resource_type × day).
 *     Upserted on every bot visit — PK prevents row bloat.
 *     Retained 90 days via nightly prune.
 *
 *   plugin_bot_analytics_recent
 *     Ring-buffer of individual visits for the "Recent Activity" table.
 *     Retains actual URL paths. Pruned to 7 days + hard cap of 500 rows.
 *
 * Table naming: plugin_<plugin-id>_<tablename> (no FK constraints to core tables).
 */

export const pluginBotAnalyticsDaily = pgTable(
  "plugin_bot_analytics_daily",
  {
    /** Canonical bot name, e.g. "ChatGPT", "Googlebot". */
    botName: varchar("bot_name", { length: 100 }).notNull(),
    /** Resource type label, e.g. "HTML Page", "llms.txt", "llms-full.txt". */
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    /** UTC calendar date of the visits being counted. */
    day: date("day").notNull(),
    /** Running count of visits for this (bot, resource_type, day) triple. */
    count: integer("count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.botName, t.resourceType, t.day] })],
);

export const pluginBotAnalyticsRecent = pgTable("plugin_bot_analytics_recent", {
  id: serial("id").primaryKey(),
  /** Canonical bot name. */
  botName: varchar("bot_name", { length: 100 }).notNull(),
  /** Resource type label (same vocabulary as daily table). */
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  /** URL path of the visited resource, e.g. /post/my-post or /llms.txt. */
  path: varchar("path", { length: 500 }).notNull(),
  visitedAt: timestamp("visited_at", { withTimezone: true }).defaultNow().notNull(),
});

export type BotDailyRow  = typeof pluginBotAnalyticsDaily.$inferSelect;
export type BotRecentRow = typeof pluginBotAnalyticsRecent.$inferSelect;
