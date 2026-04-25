/**
 * network-report.ts
 *
 * Pure functions for assembling and sending the daily AEO Intelligence Network
 * report to aeopugmill.com. Kept separate from the cron route handler so the
 * logic is independently testable.
 *
 * Payload shape mirrors the WP Pugmill plugin v2 protocol exactly so that
 * aeopugmill.com can process reports from both sources identically.
 *
 * V1 LIMITATION — signal attribution:
 *   The WP plugin captures content signals (word count, freshness, etc.) per
 *   request, so it can attribute them per-bot. Pugmill CMS computes them at
 *   cron time from the posts snapshot and fans the same site-wide distribution
 *   to every bot that had visits that day. This is noted here so it can be
 *   refined in a future version if aeopugmill.com requires stricter attribution.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { posts, aeoNetworkSubmissions } from "@/lib/db/schema";
import { eq, and, sql as drizzleSql } from "drizzle-orm";
import { parseAeoMetadata } from "@/lib/aeo";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BotResourceCounts {
  [resourceType: string]: number;
}

export interface SignalDistribution {
  [bucket: string]: number;
}

export interface BotSignals {
  word_count:        SignalDistribution;
  content_freshness: SignalDistribution;
  fact_density:      SignalDistribution;
  url_depth:         SignalDistribution;
}

export interface NetworkPayload {
  site_hash:    string;
  date:         string; // YYYY-MM-DD
  bots:         Record<string, BotResourceCounts>;
  signals:      Record<string, BotSignals>;
  content_coverage: {
    posts:  number;
    fields: {
      summary:         { count: number; pct: number };
      questions:       { count: number; pct: number };
      questions_3plus: { count: number; pct: number };
      entities:        { count: number; pct: number };
    };
  };
}

// ── Resource type mapping ─────────────────────────────────────────────────────
// Maps the string labels stored in plugin_bot_analytics_daily to the short
// keys expected by the aeopugmill.com ingest API.

const RESOURCE_TYPE_MAP: Record<string, string> = {
  "llms.txt":      "llms_txt",
  "llms-full.txt": "llms_full",
  "Post Markdown": "post_markdown",
  "Sitemap":       "sitemap",
  "Robots.txt":    "robots_txt",
  "RSS Feed":      "rss_feed",
  "HTML Page":     "html",
  "AEO Page":      "aeo_post",
};

// ── Signal bucketing ──────────────────────────────────────────────────────────

/** Strip Markdown and HTML syntax and count whitespace-separated words. */
function countWords(markdown: string): number {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")   // links — keep text
    .replace(/```[\s\S]*?```/g, "")             // fenced code blocks
    .replace(/`[^`]+`/g, "")                    // inline code
    .replace(/^#{1,6}\s+/gm, "")               // headers
    .replace(/<[^>]+>/g, "")                    // HTML tags
    .trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function wordCountBucket(wc: number): "<500" | "500-1500" | "1500+" {
  if (wc < 500)  return "<500";
  if (wc <= 1500) return "500-1500";
  return "1500+";
}

function freshnessBucket(updatedAt: Date): "0-7d" | "8-30d" | "31-180d" | "180d+" {
  const ageDays = Math.floor((Date.now() - updatedAt.getTime()) / 86_400_000);
  if (ageDays <= 7)   return "0-7d";
  if (ageDays <= 30)  return "8-30d";
  if (ageDays <= 180) return "31-180d";
  return "180d+";
}

/**
 * Derives fact density from the ratio of structured Markdown lines
 * (table rows, list items) to total paragraph breaks.
 */
function factDensityBucket(content: string): "low" | "medium" | "high" {
  const structuredLines = (content.match(/^(\||\-\s|\*\s|\d+\.\s)/gm) ?? []).length;
  const paragraphBreaks = (content.match(/\n\n/g) ?? []).length + 1;
  const total = structuredLines + paragraphBreaks;
  if (total === 0) return "low";
  const ratio = structuredLines / total;
  if (ratio >= 0.35) return "high";
  if (ratio >= 0.15) return "medium";
  return "low";
}

function urlDepthBucket(slug: string, type: string): string {
  // Posts are served at /post/[slug] (depth 2), pages at /[slug] (depth 1).
  const depth = type === "post" ? 2 : 1;
  return depth >= 5 ? "5+" : String(depth);
}

// ── Core computation functions ────────────────────────────────────────────────

/** SHA-256 hash of the site URL, lowercased and stripped of trailing slash. */
export function buildSiteHash(siteUrl: string): string {
  const normalised = siteUrl.toLowerCase().replace(/\/$/, "");
  return createHash("sha256").update(normalised).digest("hex");
}

/**
 * Queries the bot-analytics plugin table for yesterday's visit counts.
 * Returns null if the table does not exist (plugin not active).
 */
export async function fetchBotCounts(
  date: string
): Promise<Record<string, BotResourceCounts> | null> {
  try {
    // Raw query — plugin tables are not in the core Drizzle schema.
    const rows = await db.execute(
      drizzleSql`SELECT bot_name, resource_type, SUM(count)::int AS count
       FROM plugin_bot_analytics_daily
       WHERE day = ${date}
       GROUP BY bot_name, resource_type`
    ) as unknown as { rows: { bot_name: string; resource_type: string; count: number }[] };

    const result: Record<string, BotResourceCounts> = {};
    for (const row of rows.rows) {
      const payloadKey = RESOURCE_TYPE_MAP[row.resource_type] ?? row.resource_type.toLowerCase().replace(/\s+/g, "_");
      if (!result[row.bot_name]) result[row.bot_name] = {};
      result[row.bot_name][payloadKey] = (result[row.bot_name][payloadKey] ?? 0) + Number(row.count);
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Table doesn't exist → bot-analytics plugin not active.
    if (msg.includes("does not exist") || msg.includes("relation")) return null;
    throw err;
  }
}

/**
 * Computes site-wide content signal distributions from all published posts.
 * Returns a single BotSignals object that is fanned out to every bot in the payload.
 * See V1 LIMITATION note at the top of this file.
 */
export async function computeSignals(): Promise<BotSignals | null> {
  const publishedPosts = await db
    .select({
      content:   posts.content,
      updatedAt: posts.updatedAt,
      slug:      posts.slug,
      type:      posts.type,
    })
    .from(posts)
    .where(eq(posts.published, true));

  if (!publishedPosts.length) return null;

  const signals: BotSignals = {
    word_count:        {},
    content_freshness: {},
    fact_density:      {},
    url_depth:         {},
  };

  for (const post of publishedPosts) {
    const wc  = wordCountBucket(countWords(post.content));
    const fr  = freshnessBucket(post.updatedAt);
    const fd  = factDensityBucket(post.content);
    const dep = urlDepthBucket(post.slug, post.type);

    signals.word_count[wc]        = (signals.word_count[wc]        ?? 0) + 1;
    signals.content_freshness[fr] = (signals.content_freshness[fr] ?? 0) + 1;
    signals.fact_density[fd]      = (signals.fact_density[fd]      ?? 0) + 1;
    signals.url_depth[dep]        = (signals.url_depth[dep]        ?? 0) + 1;
  }

  return signals;
}

/**
 * Computes AEO field coverage across all published posts.
 * Mirrors the content_coverage section of the WP plugin payload.
 */
export async function computeContentCoverage(): Promise<NetworkPayload["content_coverage"]> {
  const publishedPosts = await db
    .select({ id: posts.id, aeoMetadata: posts.aeoMetadata })
    .from(posts)
    .where(eq(posts.published, true));

  const total = publishedPosts.length;
  if (total === 0) {
    return { posts: 0, fields: { summary: { count: 0, pct: 0 }, questions: { count: 0, pct: 0 }, questions_3plus: { count: 0, pct: 0 }, entities: { count: 0, pct: 0 } } };
  }

  let summary = 0, questions = 0, questions3plus = 0, entities = 0;

  for (const post of publishedPosts) {
    const aeo = parseAeoMetadata(post.aeoMetadata);
    if (aeo?.summary?.trim())                   summary++;
    if ((aeo?.questions?.length ?? 0) >= 1)     questions++;
    if ((aeo?.questions?.length ?? 0) >= 3)     questions3plus++;
    if ((aeo?.entities?.length ?? 0) >= 1)      entities++;
  }

  const pct = (n: number) => Math.round((n / total) * 100);

  return {
    posts: total,
    fields: {
      summary:         { count: summary,       pct: pct(summary)       },
      questions:       { count: questions,      pct: pct(questions)     },
      questions_3plus: { count: questions3plus, pct: pct(questions3plus) },
      entities:        { count: entities,       pct: pct(entities)      },
    },
  };
}

/**
 * Assembles the full payload for a given date.
 * Returns null with a reason string if the payload cannot be built
 * (e.g. bot-analytics plugin not active, no bot visits that day).
 */
export async function buildPayload(
  siteUrl: string,
  date: string
): Promise<{ payload: NetworkPayload } | { skip: string }> {
  const botCounts = await fetchBotCounts(date);

  if (botCounts === null) {
    return { skip: "bot_analytics_plugin_not_active" };
  }

  if (Object.keys(botCounts).length === 0) {
    return { skip: "no_bot_visits" };
  }

  const [signalData, coverage] = await Promise.all([
    computeSignals(),
    computeContentCoverage(),
  ]);

  // Fan site-wide signals to every bot that had visits.
  const signals: Record<string, BotSignals> = {};
  if (signalData) {
    for (const botName of Object.keys(botCounts)) {
      signals[botName] = signalData;
    }
  }

  return {
    payload: {
      site_hash:        buildSiteHash(siteUrl),
      date,
      bots:             botCounts,
      signals,
      content_coverage: coverage,
    },
  };
}

/**
 * Posts the payload to aeopugmill.com and returns the HTTP status code.
 * Uses a 10-second timeout. Throws on network error.
 */
export async function sendReport(
  payload: NetworkPayload,
  networkToken: string
): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch("https://aeopugmill.com/api/report", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${networkToken}`,
        "User-Agent":    "PugmillCMS/1.0",
      },
      body:   JSON.stringify(payload),
      signal: controller.signal,
    });
    return res.status;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Records the result of a report attempt in aeo_network_submissions.
 * Uses INSERT ON CONFLICT UPDATE so re-runs on the same date overwrite.
 */
export async function recordSubmission(
  date: string,
  status: "ok" | "error" | "skipped",
  responseCode?: number,
  detail?: string
): Promise<void> {
  await db
    .insert(aeoNetworkSubmissions)
    .values({
      date,
      status,
      responseCode: responseCode ?? null,
      detail: detail ?? null,
    } as typeof aeoNetworkSubmissions.$inferInsert)
    .onConflictDoUpdate({
      target: aeoNetworkSubmissions.date,
      set: {
        status,
        responseCode: responseCode ?? null,
        detail: detail ?? null,
        submittedAt: new Date(),
      } as Partial<typeof aeoNetworkSubmissions.$inferInsert>,
    });
}

/** Returns true if a successful submission already exists for this date. */
export async function alreadySubmitted(date: string): Promise<boolean> {
  const rows = await db
    .select({ status: aeoNetworkSubmissions.status })
    .from(aeoNetworkSubmissions)
    .where(
      and(
        eq(aeoNetworkSubmissions.date, date),
        eq(aeoNetworkSubmissions.status, "ok")
      )
    )
    .limit(1);
  return rows.length > 0;
}
