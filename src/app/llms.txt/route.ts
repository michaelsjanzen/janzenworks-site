import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { getConfig } from "@/lib/config";
import { detectSiteUrl } from "@/lib/detect-site-url";
import { detectBot, classifyPath } from "@/lib/bot-detection";
import { loadPlugins } from "@/lib/plugin-loader";
import { hooks } from "@/lib/hooks";

// Revalidate every hour — AI crawlers don't need real-time accuracy,
// and regenerating the full index on every request is expensive at scale.
export const revalidate = 3600;

/**
 * GET /llms.txt
 *
 * Standard llms.txt for AI engine crawlers (LLM-optimised sitemap).
 * Lists all top-level published pages and posts.
 * Child pages are omitted here — each parent has its own /[slug]/llms.txt.
 *
 * See: https://llmstxt.org
 */
export async function GET(req: NextRequest) {
  // Track bot visits to this AEO endpoint.
  const ua = req.headers.get("user-agent") ?? "";
  const botName = detectBot(ua);
  if (botName) {
    const path = new URL(req.url).pathname;
    await loadPlugins();
    void hooks.doAction("request:bot-visit", { botName, path, resourceType: classifyPath(path) });
  }

  const config = await getConfig();
  const siteUrl = detectSiteUrl() ?? config.site?.url ?? "http://localhost:3000";
  const siteName = config.site?.name ?? "Pugmill";
  const aeo = config.site?.aeoDefaults ?? {};
  const siteDesc = aeo.summary || (config.site?.description ?? "");

  // Top-level published pages (no parent)
  const pages = await db
    .select({ title: posts.title, slug: posts.slug, excerpt: posts.excerpt, type: posts.type })
    .from(posts)
    .where(and(eq(posts.published, true), isNull(posts.parentId)))
    .orderBy(posts.type, posts.createdAt);

  const topPages = pages.filter(p => p.type === "page");
  const blogPosts = pages.filter(p => p.type === "post");

  const lines: string[] = [
    `# ${siteName}`,
    "",
    `> ${siteDesc}`,
    "",
  ];

  if (topPages.length > 0) {
    lines.push("## Pages", "");
    for (const p of topPages) {
      const url = `${siteUrl}/post/${p.slug}`;
      const markdownUrl = `${siteUrl}/post/${p.slug}/llm.txt`;
      const desc = p.excerpt ? `: ${p.excerpt}` : "";
      lines.push(`- [${p.title}](${url})${desc}`);
      lines.push(`  - AI markdown: ${markdownUrl}`);
      lines.push(`  - AI index: ${siteUrl}/${p.slug}/llms.txt`);
    }
    lines.push("");
  }

  if (blogPosts.length > 0) {
    lines.push("## Posts", "");
    for (const p of blogPosts) {
      const url = `${siteUrl}/post/${p.slug}`;
      const markdownUrl = `${siteUrl}/post/${p.slug}/llm.txt`;
      const desc = p.excerpt ? `: ${p.excerpt}` : "";
      lines.push(`- [${p.title}](${url})${desc}`);
      lines.push(`  - AI markdown: ${markdownUrl}`);
    }
    lines.push("");
  }

  if (aeo.questions?.length) {
    lines.push("## Frequently Asked Questions", "");
    for (const qa of aeo.questions) {
      lines.push(`**Q: ${qa.q}**`);
      lines.push(`A: ${qa.a}`);
      lines.push("");
    }
  }

  lines.push(
    "## Full Content",
    "",
    `For full post content, see [${siteUrl}/llms-full.txt](${siteUrl}/llms-full.txt)`,
    "",
    "## API",
    "",
    `REST API: ${siteUrl}/api/posts`,
  );

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
