import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getConfig } from "@/lib/config";
import { parseAeoMetadata } from "@/lib/aeo";
import { detectBot, classifyPath } from "@/lib/bot-detection";
import { loadPlugins } from "@/lib/plugin-loader";
import { hooks } from "@/lib/hooks";

export const dynamic = "force-dynamic";

/**
 * GET /[slug]/llms.txt
 *
 * Per-section llms.txt for AI engine crawlers.
 * Finds the published page with the given slug, then lists all its direct
 * child pages as a markdown-formatted index.
 *
 * Examples:
 *   /docs/llms.txt          — AI index for the "docs" page and its children
 *   /getting-started/llms.txt
 *
 * Because slugs are globally unique in Pugmill, we resolve by slug directly
 * rather than requiring the full ancestor path.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const ua = req.headers.get("user-agent") ?? "";
  const botName = detectBot(ua);
  if (botName) {
    const path = new URL(req.url).pathname;
    await loadPlugins();
    void hooks.doAction("request:bot-visit", { botName, path, resourceType: classifyPath(path) });
  }

  const config = await getConfig();
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const siteName = config.site?.name ?? "Pugmill";

  // Find the page by slug
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.published, true)));

  if (rows.length === 0) {
    return new NextResponse(`# Not Found\n\nNo published page found with slug: ${slug}`, {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const page = rows[0];

  // Fetch all direct children
  const children = await db
    .select()
    .from(posts)
    .where(and(eq(posts.parentId, page.id), eq(posts.published, true)))
    .orderBy(posts.title);

  const pageUrl = `${siteUrl}/post/${page.slug}`;
  const aeo = parseAeoMetadata(page.aeoMetadata);

  const lines: string[] = [
    `# ${page.title}`,
    "",
    `> Part of [${siteName}](${siteUrl}/llms.txt)`,
  ];

  if (page.excerpt) lines.push(`> ${page.excerpt}`);
  if (aeo?.summary) lines.push(`> ${aeo.summary}`);

  lines.push("", `Full content: ${pageUrl}`, "");

  if (aeo?.entities?.length) {
    lines.push(
      "## Key Entities",
      "",
      ...aeo.entities.map(e => `- **${e.name}** (${e.type})${e.description ? `: ${e.description}` : ""}`),
      ""
    );
  }

  if (children.length > 0) {
    lines.push(`## Sub-pages (${children.length})`, "");
    for (const child of children) {
      const childUrl = `${siteUrl}/post/${child.slug}`;
      const childAeo = parseAeoMetadata(child.aeoMetadata);
      const desc = childAeo?.summary ?? child.excerpt ?? "";
      lines.push(`- [${child.title}](${childUrl})${desc ? `: ${desc}` : ""}`);
      lines.push(`  - AI markdown: ${siteUrl}/post/${child.slug}/llm.txt`);
      lines.push(`  - AI index: ${siteUrl}/${child.slug}/llms.txt`);
    }
    lines.push("");
  } else {
    lines.push("*This section has no sub-pages.*", "");
  }

  if (aeo?.questions?.length) {
    lines.push("## Key Questions & Answers", "");
    for (const qa of aeo.questions) {
      lines.push(`**Q: ${qa.q}**`);
      lines.push(`A: ${qa.a}`);
      lines.push("");
    }
  }

  lines.push(
    "## Navigation",
    "",
    `- Site index: [${siteUrl}/llms.txt](${siteUrl}/llms.txt)`,
    `- Full content: [${siteUrl}/llms-full.txt](${siteUrl}/llms-full.txt)`,
    `- REST API: ${siteUrl}/api/posts`,
  );

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
