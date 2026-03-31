import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { detectBot, classifyPath } from "@/lib/bot-detection";
import { loadPlugins } from "@/lib/plugin-loader";
import { hooks } from "@/lib/hooks";

export const dynamic = "force-dynamic";

/** Known AI-training and AI-inference crawlers that respect robots.txt. */
const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "CCBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Bytespider",
  "cohere-ai",
  "meta-externalagent",
  "Amazonbot",
  "Diffbot",
];

function parseCustomRules(raw: string): string {
  return raw
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * GET /robots.txt
 *
 * Route handler version — replaces the Next.js metadata convention (robots.ts)
 * so we can track bot visits to this endpoint in bot analytics.
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
  const config  = await getConfig();
  const seo     = config.site.seoDefaults ?? {};

  const lines: string[] = ["User-agent: *", "Allow: /", ""];

  if (seo.blockAiBots) {
    for (const bot of AI_BOTS) {
      lines.push(`User-agent: ${bot}`, "Disallow: /", "");
    }
  }

  if (seo.robotsCustomRules?.trim()) {
    lines.push(parseCustomRules(seo.robotsCustomRules), "");
  }

  lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
