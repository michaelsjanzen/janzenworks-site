/**
 * Bot detection utilities — shared by the bot-analytics plugin and
 * AEO route handlers (llms.txt, llms-full.txt).
 *
 * Kept in src/lib/ so core route handlers can import without touching
 * plugin code (cross-plugin imports are forbidden by convention).
 */

// ── UA pattern → canonical bot name ──────────────────────────────────────────
// Order matters: first match wins.
// AI assistants are checked before traditional search bots to prevent
// Google-Extended matching Googlebot.

export const BOT_PATTERNS: { pattern: RegExp; canonical: string }[] = [
  { pattern: /GPTBot/i,             canonical: "ChatGPT"     },
  { pattern: /ChatGPT-User/i,       canonical: "ChatGPT"     },
  { pattern: /OAI-SearchBot/i,      canonical: "ChatGPT"     },
  { pattern: /ClaudeBot/i,          canonical: "Claude"      },
  { pattern: /claude-web/i,         canonical: "Claude"      },
  { pattern: /anthropic-ai/i,       canonical: "Claude"      },
  { pattern: /PerplexityBot/i,      canonical: "Perplexity"  },
  { pattern: /Google-Extended/i,    canonical: "Gemini"      },
  { pattern: /Amazonbot/i,          canonical: "Amazonbot"   },
  { pattern: /meta-externalagent/i, canonical: "Meta"        },
  { pattern: /cohere-ai/i,          canonical: "Cohere"      },
  { pattern: /CCBot/i,              canonical: "CCBot"       },
  { pattern: /Googlebot/i,          canonical: "Googlebot"   },
  { pattern: /bingbot/i,            canonical: "Bingbot"     },
  { pattern: /DuckDuckBot/i,        canonical: "DuckDuckBot" },
  { pattern: /Bytespider/i,         canonical: "Bytespider"  },
  { pattern: /Applebot/i,           canonical: "Applebot"    },
];

/**
 * Returns the canonical bot name for a given User-Agent string,
 * or null if it does not match any known bot.
 */
export function detectBot(userAgent: string): string | null {
  for (const { pattern, canonical } of BOT_PATTERNS) {
    if (pattern.test(userAgent)) return canonical;
  }
  return null;
}

// ── Bot display config ────────────────────────────────────────────────────────
// Shared by the bot-analytics plugin admin page and the dashboard teaser.

export interface BotInfo {
  label: string;
  color: string;
  type:  "ai" | "search";
}

export const BOT_CONFIG: Record<string, BotInfo> = {
  ChatGPT:    { label: "ChatGPT",    color: "#10a37f", type: "ai"     },
  Claude:     { label: "Claude",     color: "#d97706", type: "ai"     },
  Perplexity: { label: "Perplexity", color: "#6366f1", type: "ai"     },
  Gemini:     { label: "Gemini",     color: "#4285f4", type: "ai"     },
  Amazonbot:  { label: "Amazonbot",  color: "#ff9900", type: "ai"     },
  Meta:       { label: "Meta",       color: "#0866ff", type: "ai"     },
  Cohere:     { label: "Cohere",     color: "#39a2c8", type: "ai"     },
  CCBot:      { label: "CCBot",      color: "#6b7280", type: "ai"     },
  Googlebot:  { label: "Googlebot",  color: "#34a853", type: "search" },
  Bingbot:    { label: "Bingbot",    color: "#00809d", type: "search" },
  Applebot:   { label: "Applebot",   color: "#555555", type: "search" },
  DuckDuckBot:{ label: "DuckDuckBot",color: "#de5833", type: "search" },
  Bytespider: { label: "Bytespider", color: "#69c9d0", type: "search" },
};

// ── Path → resource type ──────────────────────────────────────────────────────
// Resource type categories:
//   aeo       — llms.txt, llms-full.txt, Post Markdown (/post/[slug]/llm.txt)
//   discovery — Sitemap, Robots.txt
//   crawl     — regular HTML pages (default)

/**
 * Infers the resource type label from a URL path.
 * Used both for logging writes and for the Content Reach breakdown in db.ts.
 */
export function classifyPath(path: string): string {
  const p = path.toLowerCase();
  if (p.includes("/llms-full.txt")) return "llms-full.txt";
  if (p.includes("/llms.txt"))      return "llms.txt";
  if (p.endsWith("/llm.txt"))        return "Post Markdown";
  if (p.includes("sitemap"))        return "Sitemap";
  if (p.includes("robots.txt"))     return "Robots.txt";
  return "HTML Page";
}
