import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getConfig } from "@/lib/config";
import { parseAeoMetadata } from "@/lib/aeo";
import { detectBot, classifyPath } from "@/lib/bot-detection";
import { loadPlugins } from "@/lib/plugin-loader";
import { hooks } from "@/lib/hooks";

export const dynamic = "force-dynamic";

/**
 * GET /llms-full.txt
 *
 * Extended llms.txt containing the full content of every published post/page.
 * Intended for AI systems that want to index the entire site in one request.
 * Large sites should paginate this endpoint or implement incremental feeds.
 */
export async function GET(req: NextRequest) {
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
  const aeo = config.site?.aeoDefaults ?? {};

  const allPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(posts.type, posts.createdAt);

  const lines: string[] = [
    `# ${siteName} — Full Content Index`,
    "",
    `> Source: ${siteUrl}/llms-full.txt`,
    `> Generated: ${new Date().toISOString()}`,
    "",
  ];

  // Site-level AEO block
  if (aeo.summary) {
    lines.push("## About This Site", "", aeo.summary, "");
  }
  if (aeo.organization?.name) {
    const org = aeo.organization;
    lines.push("## Organization", "");
    lines.push(`- **Name**: ${org.name}`);
    if (org.type) lines.push(`- **Type**: ${org.type}`);
    if (org.description) lines.push(`- **Description**: ${org.description}`);
    if (org.url) lines.push(`- **URL**: ${org.url}`);
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

  lines.push("---", "");

  for (const post of allPosts) {
    const url = `${siteUrl}/post/${post.slug}`;
    lines.push(`## ${post.title}`);
    lines.push("");
    lines.push(`URL: ${url}`);
    lines.push(`Markdown: ${url}/llm.txt`);
    lines.push(`Type: ${post.type}`);
    if (post.excerpt) lines.push(`Summary: ${post.excerpt}`);

    // Inline AEO metadata if present
    const aeo = parseAeoMetadata(post.aeoMetadata);

    if (aeo?.summary) {
      lines.push(`AI Summary: ${aeo.summary}`);
    }
    if (aeo?.entities?.length) {
      lines.push(`Entities: ${aeo.entities.map(e => `${e.name} (${e.type})`).join(", ")}`);
    }

    lines.push("");
    lines.push(post.content);

    if (aeo?.questions?.length) {
      lines.push("");
      lines.push("### Q&A");
      for (const qa of aeo.questions) {
        lines.push(`**Q: ${qa.q}**`);
        lines.push(`A: ${qa.a}`);
        lines.push("");
      }
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
