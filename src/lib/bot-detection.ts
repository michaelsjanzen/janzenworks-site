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
  // OpenAI — three distinct crawlers; OAI-SearchBot before GPTBot to avoid prefix collisions
  { pattern: /OAI-SearchBot/i,      canonical: "OAI-SearchBot"   }, // Real-time search grounding
  { pattern: /ChatGPT-User/i,       canonical: "ChatGPT-User"    }, // Live user browsing
  { pattern: /GPTBot/i,             canonical: "GPTBot"          }, // Training / web index
  // Anthropic/Claude — three distinct crawlers
  { pattern: /ClaudeBot/i,          canonical: "ClaudeBot"       }, // Training / web index
  { pattern: /Claude-User/i,        canonical: "Claude-User"     }, // Live user browsing
  { pattern: /claude-web/i,         canonical: "Claude-User"     }, // Alias for Claude-User
  { pattern: /anthropic-ai/i,       canonical: "anthropic-ai"    }, // Direct API access
  // Perplexity — index vs live
  { pattern: /Perplexity-User/i,    canonical: "Perplexity-User" }, // Live user search
  { pattern: /PerplexityBot/i,      canonical: "PerplexityBot"   }, // Index crawler
  // Other AI — Google-Extended before Googlebot to prevent early match
  { pattern: /Google-Extended/i,    canonical: "Gemini"          },
  { pattern: /Amazonbot/i,          canonical: "Amazonbot"       },
  { pattern: /meta-externalagent/i, canonical: "Meta"            },
  { pattern: /cohere-ai/i,          canonical: "Cohere"          },
  { pattern: /CCBot/i,              canonical: "CCBot"           },
  // Search engines — Applebot-Extended before Applebot
  { pattern: /Applebot-Extended/i,  canonical: "Applebot-Extended" }, // Apple Intelligence training
  { pattern: /Googlebot/i,          canonical: "Googlebot"       },
  { pattern: /bingbot/i,            canonical: "Bingbot"         },
  { pattern: /DuckDuckBot/i,        canonical: "DuckDuckBot"     },
  { pattern: /Bytespider/i,         canonical: "Bytespider"      },
  { pattern: /Applebot/i,           canonical: "Applebot"        }, // Siri / Spotlight search
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
  /**
   * "answer"   — AI answer engines that use content to respond to live user queries
   *              (OAI-SearchBot, ChatGPT-User, Claude-User, Perplexity-User, Gemini)
   * "training" — Crawlers that index content for model training or background indexing
   *              (GPTBot, ClaudeBot, CCBot, Amazonbot, etc.)
   * "search"   — Traditional search engine spiders
   */
  type: "answer" | "training" | "search";
}

export const BOT_CONFIG: Record<string, BotInfo> = {
  // OpenAI — answer engines (live user queries)
  "OAI-SearchBot":   { label: "OAI-SearchBot (ChatGPT search)", color: "#0d8a6a", type: "answer"   },
  "ChatGPT-User":    { label: "ChatGPT-User (live browsing)",   color: "#1ac89e", type: "answer"   },
  // OpenAI — training
  "GPTBot":          { label: "GPTBot (OpenAI training)",       color: "#10a37f", type: "training" },
  // Anthropic/Claude — answer engines
  "Claude-User":     { label: "Claude-User (live browsing)",    color: "#f59e0b", type: "answer"   },
  // Anthropic/Claude — training
  "ClaudeBot":       { label: "ClaudeBot (Anthropic training)", color: "#d97706", type: "training" },
  "anthropic-ai":    { label: "anthropic-ai (API access)",      color: "#fbbf24", type: "training" },
  // Perplexity — answer engine (live search)
  "Perplexity-User": { label: "Perplexity-User (live)",         color: "#818cf8", type: "answer"   },
  // Perplexity — training/indexing
  "PerplexityBot":   { label: "PerplexityBot",                  color: "#6366f1", type: "training" },
  // Other AI answer engines
  Gemini:     { label: "Gemini",     color: "#4285f4", type: "answer"   },
  // Other AI training crawlers
  Amazonbot:  { label: "Amazonbot",  color: "#ff9900", type: "training" },
  Meta:       { label: "Meta",       color: "#0866ff", type: "training" },
  Cohere:     { label: "Cohere",     color: "#39a2c8", type: "training" },
  CCBot:      { label: "CCBot",      color: "#6b7280", type: "training" },
  // Search engines
  Googlebot:           { label: "Googlebot",                              color: "#34a853", type: "search" },
  Bingbot:             { label: "Bingbot",                                color: "#00809d", type: "search" },
  "Applebot-Extended": { label: "Applebot-Extended (Apple Intelligence)", color: "#374151", type: "search" },
  Applebot:            { label: "Applebot (Siri / Spotlight)",            color: "#555555", type: "search" },
  DuckDuckBot:         { label: "DuckDuckBot",                            color: "#de5833", type: "search" },
  Bytespider:          { label: "Bytespider",                             color: "#69c9d0", type: "search" },
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
  if (p.includes("feed.xml"))       return "RSS Feed";
  return "HTML Page";
}
