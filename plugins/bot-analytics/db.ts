import { db } from "../../src/lib/db";
import { pluginBotAnalyticsDaily, pluginBotAnalyticsRecent, pluginBotAnalyticsPostAeo } from "./schema";
import { posts } from "../../src/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

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

/** Returns visit totals per bot for the prior N-day window (days N+1 to 2N ago), for trend comparison. */
export async function getPriorTotals(days = 30) {
  return db
    .select({
      botName: pluginBotAnalyticsDaily.botName,
      total:   sql<number>`cast(sum(${pluginBotAnalyticsDaily.count}) as int)`,
    })
    .from(pluginBotAnalyticsDaily)
    .where(sql`
      ${pluginBotAnalyticsDaily.day} >= CURRENT_DATE - (${days * 2} || ' days')::interval
      AND ${pluginBotAnalyticsDaily.day} < CURRENT_DATE - (${days} || ' days')::interval
    `)
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
 * Returns slugs of posts that received at least one AEO markdown hit in the
 * last N days, with the total hit count across all bots.
 */
export async function getAeoHitSlugs(days = 30) {
  return db
    .select({
      postSlug: pluginBotAnalyticsPostAeo.postSlug,
      total:    sql<number>`cast(sum(${pluginBotAnalyticsPostAeo.count}) as int)`,
    })
    .from(pluginBotAnalyticsPostAeo)
    .where(sql`${pluginBotAnalyticsPostAeo.day} >= CURRENT_DATE - (${days} || ' days')::interval`)
    .groupBy(pluginBotAnalyticsPostAeo.postSlug)
    .orderBy(sql`sum(${pluginBotAnalyticsPostAeo.count}) desc`);
}

/**
 * Returns posts that:
 *   - Have AEO metadata with at least a summary
 *   - Have been visited by bots (appear in the recent ring-buffer as HTML pages)
 *   - Have NOT yet had any AEO markdown hits (not in plugin_bot_analytics_post_aeo)
 *
 * These are the "missed conversions" — ready content that bots haven't consumed
 * in optimised form.
 */
export async function getUncoveredAeoPosts() {
  // Get slugs bots have visited as HTML pages (recent ring-buffer, last 7 days)
  const recentHtmlRows = await db
    .select({ path: pluginBotAnalyticsRecent.path })
    .from(pluginBotAnalyticsRecent)
    .where(sql`${pluginBotAnalyticsRecent.resourceType} = 'HTML Page'`);

  const visitedSlugs = new Set(
    recentHtmlRows
      .map(r => r.path.match(/^\/post\/(.+)$/)?.[1])
      .filter((s): s is string => !!s),
  );

  if (visitedSlugs.size === 0) return [];

  // Get slugs that already have AEO hits
  const aeoHits = await getAeoHitSlugs(30);
  const hitSlugs = new Set(aeoHits.map(r => r.postSlug));

  // Get published posts with AEO summary present
  const allPosts = await db
    .select({ slug: posts.slug, title: posts.title, aeoMetadata: posts.aeoMetadata })
    .from(posts)
    .where(eq(posts.published, true));

  return allPosts.filter(p => {
    if (!visitedSlugs.has(p.slug)) return false;  // no bot visit recorded
    if (hitSlugs.has(p.slug)) return false;         // already consumed as AEO
    // Check AEO metadata has at least a summary
    const raw = p.aeoMetadata as Record<string, unknown> | null;
    return typeof raw?.summary === "string" && raw.summary.trim().length > 0;
  }).map(p => ({ slug: p.slug, title: p.title }));
}

/**
 * Returns a completeness score for the site's AEO content.
 * Used to display the llms.txt health indicator on the analytics page.
 */
export async function getLlmsTxtScore() {
  const allPosts = await db
    .select({ aeoMetadata: posts.aeoMetadata, published: posts.published })
    .from(posts)
    .where(eq(posts.published, true));

  const total     = allPosts.length;
  let withSummary = 0;
  let withQa      = 0;
  let withEntities = 0;

  for (const p of allPosts) {
    const raw = p.aeoMetadata as Record<string, unknown> | null;
    if (!raw) continue;
    if (typeof raw.summary === "string" && raw.summary.trim()) withSummary++;
    if (Array.isArray(raw.questions) && raw.questions.length > 0)   withQa++;
    if (Array.isArray(raw.entities)  && raw.entities.length > 0)    withEntities++;
  }

  return { total, withSummary, withQa, withEntities };
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
