import { db } from "../../src/lib/db";
import { pluginBotAnalyticsDaily, pluginBotAnalyticsRecent } from "./schema";
import { desc, gte, sql } from "drizzle-orm";

/** Returns visit totals per bot for the last N days, highest first. */
export async function getBotTotals(days = 30) {
  return db
    .select({
      botName: pluginBotAnalyticsDaily.botName,
      total:   sql<number>`cast(sum(${pluginBotAnalyticsDaily.count}) as int)`,
      lastDay: sql<string>`max(${pluginBotAnalyticsDaily.day})`,
    })
    .from(pluginBotAnalyticsDaily)
    .where(sql`${pluginBotAnalyticsDaily.day} >= CURRENT_DATE - (${days} || ' days')::interval`)
    .groupBy(pluginBotAnalyticsDaily.botName)
    .orderBy(sql`sum(${pluginBotAnalyticsDaily.count}) desc`);
}

/** Returns the N most recent bot visits (from the ring-buffer table). */
export async function getRecentVisits(limit = 50) {
  return db
    .select()
    .from(pluginBotAnalyticsRecent)
    .orderBy(desc(pluginBotAnalyticsRecent.visitedAt))
    .limit(limit);
}

/** Returns daily visit counts per bot for the last N days (for the sparkline). */
export async function getDailyTotals(days = 30) {
  return db
    .select({
      day:     pluginBotAnalyticsDaily.day,
      botName: pluginBotAnalyticsDaily.botName,
      total:   sql<number>`cast(sum(${pluginBotAnalyticsDaily.count}) as int)`,
    })
    .from(pluginBotAnalyticsDaily)
    .where(sql`${pluginBotAnalyticsDaily.day} >= CURRENT_DATE - (${days} || ' days')::interval`)
    .groupBy(pluginBotAnalyticsDaily.day, pluginBotAnalyticsDaily.botName)
    .orderBy(pluginBotAnalyticsDaily.day);
}

/** Returns visit counts per (bot, resource_type) for the last N days. */
export async function getByResourceType(days = 30) {
  return db
    .select({
      botName:      pluginBotAnalyticsDaily.botName,
      resourceType: pluginBotAnalyticsDaily.resourceType,
      total:        sql<number>`cast(sum(${pluginBotAnalyticsDaily.count}) as int)`,
    })
    .from(pluginBotAnalyticsDaily)
    .where(sql`${pluginBotAnalyticsDaily.day} >= CURRENT_DATE - (${days} || ' days')::interval`)
    .groupBy(pluginBotAnalyticsDaily.botName, pluginBotAnalyticsDaily.resourceType)
    .orderBy(pluginBotAnalyticsDaily.botName, sql`sum(${pluginBotAnalyticsDaily.count}) desc`);
}

/**
 * Returns the top N most-visited paths from the recent ring-buffer (last 7 days),
 * with per-bot breakdown.
 */
export async function getTopPaths(limit = 10) {
  const rows = await db
    .select({
      path:    pluginBotAnalyticsRecent.path,
      botName: pluginBotAnalyticsRecent.botName,
      total:   sql<number>`cast(count(*) as int)`,
    })
    .from(pluginBotAnalyticsRecent)
    .groupBy(pluginBotAnalyticsRecent.path, pluginBotAnalyticsRecent.botName)
    .orderBy(sql`count(*) desc`);

  const pathMap = new Map<string, { total: number; bots: Record<string, number> }>();
  for (const row of rows) {
    const entry = pathMap.get(row.path) ?? { total: 0, bots: {} };
    entry.total += row.total;
    entry.bots[row.botName] = (entry.bots[row.botName] ?? 0) + row.total;
    pathMap.set(row.path, entry);
  }

  return Array.from(pathMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([path, { total, bots }]) => ({ path, total, bots }));
}
