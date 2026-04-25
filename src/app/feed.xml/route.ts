import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getConfig } from "@/lib/config";
import { detectBot, classifyPath } from "@/lib/bot-detection";
import { loadPlugins } from "@/lib/plugin-loader";
import { hooks } from "@/lib/hooks";

export const dynamic = "force-dynamic";

/**
 * GET /feed.xml
 *
 * RSS 2.0 feed of the latest 20 published posts.
 * Compatible with all major feed readers (Feedly, NetNewsWire, etc.)
 * and podcast/content aggregators.
 */
export async function GET(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const botName = detectBot(ua);
  if (botName) {
    const path = new URL(req.url).pathname;
    await loadPlugins();
    void hooks.doAction("request:bot-visit", { botName, path, resourceType: classifyPath(path) });
  }

  const [config, latestPosts] = await Promise.all([
    getConfig(),
    db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt))
      .limit(20),
  ]);

  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const siteName = escape(config.site?.name ?? "Pugmill");
  const siteDesc = escape(config.site?.description ?? "");
  const now = new Date().toUTCString();

  const items = latestPosts.map((post) => {
    const url = `${siteUrl}/post/${post.slug}`;
    const pubDate = post.createdAt.toUTCString();
    const description = escape(post.excerpt ?? post.content.slice(0, 280).replace(/\n/g, " "));

    return `
    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`.trimStart();
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <link>${siteUrl}</link>
    <description>${siteDesc}</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.join("\n    ")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

/** XML-safe character escaping. */
function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
