import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, categories, tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { detectBot, classifyPath } from "@/lib/bot-detection";
import { loadPlugins } from "@/lib/plugin-loader";
import { hooks } from "@/lib/hooks";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: Date | null, changefreq: string, priority: number, markdownUrl?: string): string {
  const lines = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod.toISOString()}</lastmod>`);
  lines.push(`    <changefreq>${changefreq}</changefreq>`);
  lines.push(`    <priority>${priority}</priority>`);
  if (markdownUrl) {
    lines.push(`    <xhtml:link rel="alternate" type="text/markdown" href="${escapeXml(markdownUrl)}"/>`);
  }
  lines.push(`  </url>`);
  return lines.join("\n");
}

/**
 * GET /sitemap.xml
 *
 * Route handler version of the sitemap — replaces the Next.js metadata
 * convention (sitemap.ts) so we can access request headers and track
 * bot visits to the sitemap endpoint in bot analytics.
 */
export async function GET(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const botName = detectBot(ua);
  if (botName) {
    const path = new URL(req.url).pathname;
    await loadPlugins();
    void hooks.doAction("request:bot-visit", { botName, path, resourceType: classifyPath(path) });
  }

  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const [publishedPosts, allCategories, allTags] = await Promise.all([
    db.select({ slug: posts.slug, updatedAt: posts.updatedAt, type: posts.type })
      .from(posts)
      .where(eq(posts.published, true)),
    db.select({ slug: categories.slug, createdAt: categories.createdAt }).from(categories),
    db.select({ slug: tags.slug, createdAt: tags.createdAt }).from(tags),
  ]);

  const entries: string[] = [
    urlEntry(siteUrl, new Date(), "daily", 1.0),
    ...publishedPosts.map(p =>
      urlEntry(
        `${siteUrl}/post/${p.slug}`,
        p.updatedAt,
        p.type === "page" ? "monthly" : "weekly",
        p.type === "page" ? 0.8 : 0.6,
        `${siteUrl}/post/${p.slug}/llm.txt`,
      )
    ),
    ...allCategories.map(c =>
      urlEntry(`${siteUrl}/category/${c.slug}`, c.createdAt, "weekly", 0.5)
    ),
    ...allTags.map(t =>
      urlEntry(`${siteUrl}/tag/${t.slug}`, t.createdAt, "weekly", 0.4)
    ),
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...entries,
    `</urlset>`,
  ].join("\n");

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
