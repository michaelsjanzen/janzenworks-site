import { getBotTotals, getRecentVisits, getDailyTotals, getByResourceType, getTopPaths } from "../db";
import InsightsButton from "./InsightsButton";
import { isAiConfigured } from "@/lib/ai";
import { BOT_CONFIG } from "@/lib/bot-detection";

const AI_BOTS     = Object.entries(BOT_CONFIG).filter(([, v]) => v.type === "ai");
const SEARCH_BOTS = Object.entries(BOT_CONFIG).filter(([, v]) => v.type === "search");

// ── Resource type config ──────────────────────────────────────────────────────

type ResourceCategory = "aeo" | "discovery" | "crawl";

const RESOURCE_TYPES: { id: string; label: string; category: ResourceCategory }[] = [
  { id: "llms.txt",       label: "llms.txt",       category: "aeo"       },
  { id: "llms-full.txt",  label: "llms-full.txt",  category: "aeo"       },
  { id: "Post Markdown",  label: "Post Markdown",  category: "aeo"       },
  { id: "Sitemap",        label: "Sitemap",         category: "discovery" },
  { id: "Robots.txt",     label: "Robots.txt",      category: "discovery" },
  { id: "HTML Page",      label: "HTML Page",       category: "crawl"     },
];

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  aeo:       "AEO Endpoints",
  discovery: "Discovery",
  crawl:     "Page Crawls",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function BotDot({ name }: { name: string }) {
  const color = BOT_CONFIG[name]?.color ?? "#9ca3af";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function BotBadge({ name }: { name: string }) {
  const color = BOT_CONFIG[name]?.color ?? "#9ca3af";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {BOT_CONFIG[name]?.label ?? name}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BotAnalyticsAdminPage() {
  const [totals, recent, daily, byResource, topPaths, aiEnabled] = await Promise.all([
    getBotTotals(30),
    getRecentVisits(50),
    getDailyTotals(30),
    getByResourceType(30),
    getTopPaths(10),
    isAiConfigured(),
  ]);

  const grandTotal  = totals.reduce((s, r) => s + r.total, 0);

  // Summary map: botName → total
  const summaryMap = Object.fromEntries(totals.map(r => [r.botName, r.total]));

  // Resource type map: botName → resourceType → count
  const resourceMap: Record<string, Record<string, number>> = {};
  for (const row of byResource) {
    resourceMap[row.botName] ??= {};
    resourceMap[row.botName][row.resourceType] = row.total;
  }

  // Resource types that have any data
  const activeResourceTypes = RESOURCE_TYPES.filter(rt =>
    byResource.some(r => r.resourceType === rt.id),
  );
  const displayResourceTypes = activeResourceTypes.length > 0 ? activeResourceTypes : RESOURCE_TYPES;

  // Daily chart data — collect all unique dates and build per-bot series
  const allDates = [...new Set(daily.map(r => r.day))].sort();
  const dailyIndex: Record<string, Record<string, number>> = {};
  for (const row of daily) {
    dailyIndex[row.botName] ??= {};
    dailyIndex[row.botName][row.day] = row.total;
  }
  const maxDailyTotal = allDates.length > 0
    ? Math.max(...allDates.map(d =>
        Object.values(dailyIndex).reduce((s, botDays) => s + (botDays[d] ?? 0), 0)
      ), 1)
    : 1;

  // Per-day stacked totals for simple sparkline
  const dailyTotals = allDates.map(d =>
    Object.values(dailyIndex).reduce((s, botDays) => s + (botDays[d] ?? 0), 0)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Bot Analytics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          AI crawler and search engine bot visits — last 30 days
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total visits</p>
          <p className="text-2xl font-bold text-zinc-900">
            {grandTotal > 0 ? grandTotal.toLocaleString() : "—"}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Unique bots</p>
          <p className="text-2xl font-bold text-zinc-900">
            {totals.length > 0 ? totals.length : "—"}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Top bot</p>
          <p className="text-sm font-semibold text-zinc-800 truncate">
            {totals[0]?.botName ?? "—"}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Last visit</p>
          <p className="text-sm font-semibold text-zinc-800">
            {recent[0] ? timeAgo(recent[0].visitedAt) : "—"}
          </p>
        </div>
      </div>

      {/* AI Crawlers */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          AI Crawlers
        </p>
        <div className="flex flex-wrap gap-3">
          {AI_BOTS.map(([key, info]) => {
            const count = summaryMap[key] ?? 0;
            return (
              <div
                key={key}
                className="bg-white border border-zinc-200 rounded-lg p-4 min-w-[110px] flex-1 text-center"
                style={{ borderTop: `3px solid ${info.color}` }}
              >
                <div
                  className="text-2xl font-bold leading-tight"
                  style={{ color: count > 0 ? info.color : "#9ca3af" }}
                >
                  {count > 0 ? count.toLocaleString() : "0"}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{info.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Spiders */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Search Spiders
        </p>
        <div className="flex flex-wrap gap-3">
          {SEARCH_BOTS.map(([key, info]) => {
            const count = summaryMap[key] ?? 0;
            return (
              <div
                key={key}
                className="bg-white border border-zinc-200 rounded-lg p-3 min-w-[100px] flex-1 text-center"
                style={{ borderTop: `3px solid ${info.color}` }}
              >
                <div
                  className="text-xl font-bold leading-tight"
                  style={{ color: count > 0 ? info.color : "#9ca3af" }}
                >
                  {count > 0 ? count.toLocaleString() : "0"}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{info.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      {aiEnabled && <InsightsButton />}

      {/* Daily sparkline */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Daily visits (30 days)
        </p>
        {grandTotal === 0 ? (
          <div className="h-16 flex items-center justify-center">
            <p className="text-xs text-zinc-400">No visits recorded yet — chart will appear once bots arrive.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-0.5 h-16">
              {dailyTotals.map((total, i) => (
                <div
                  key={allDates[i]}
                  className="flex-1 bg-zinc-800 rounded-sm min-w-0"
                  style={{ height: `${Math.max(2, Math.round((total / maxDailyTotal) * 100))}%` }}
                  title={`${allDates[i]}: ${total} visits`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>{allDates[0] ?? ""}</span>
              <span>{allDates[allDates.length - 1] ?? ""}</span>
            </div>
          </>
        )}
      </div>

      {/* Content Reach — resource type breakdown */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Content Reach
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Which content types each bot is consuming — last 30 days. AEO endpoints show bots reading your optimised content directly.
          </p>
        </div>
        {grandTotal === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">No visits recorded yet.</p>
            <p className="text-xs text-zinc-400 mt-1">
              AEO endpoint hits will appear here once AI crawlers discover your content.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Resource Type</th>
                  <th className="text-left px-4 py-2 font-medium text-zinc-400">Category</th>
                  {Object.keys(BOT_CONFIG).map(bot => (
                    <th key={bot} className="text-center px-3 py-2 font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: BOT_CONFIG[bot].color }}
                        />
                        <span className="whitespace-nowrap">{BOT_CONFIG[bot].label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(["aeo", "discovery", "crawl"] as ResourceCategory[]).map(category => {
                  const typeRows = displayResourceTypes.filter(rt => rt.category === category);
                  return typeRows.map((rt, i) => (
                    <tr key={rt.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 font-mono text-xs text-zinc-700">{rt.label}</td>
                      <td className="px-4 py-2 text-xs text-zinc-400">
                        {i === 0 ? CATEGORY_LABELS[category] : ""}
                      </td>
                      {Object.keys(BOT_CONFIG).map(bot => {
                        const cnt = resourceMap[bot]?.[rt.id] ?? 0;
                        return (
                          <td key={bot} className="px-3 py-2 text-center text-xs">
                            {cnt > 0 ? (
                              <span
                                className="font-semibold"
                                style={{ color: BOT_CONFIG[bot].color }}
                              >
                                {cnt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Paths */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Top Paths
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Most-visited content pages — last 7 days.
          </p>
        </div>
        {topPaths.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">No page visits recorded yet.</p>
            <p className="text-xs text-zinc-400 mt-1">Top pages will appear here once bots start crawling your content.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Path</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-left px-4 py-2 font-medium">By Bot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topPaths.map(row => (
                <tr key={row.path} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 truncate max-w-xs">
                    {row.path}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-zinc-800">
                    {row.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(row.bots).map(([bot, cnt]) => {
                        const color = BOT_CONFIG[bot]?.color ?? "#9ca3af";
                        return (
                          <span
                            key={bot}
                            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-zinc-50 border border-zinc-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-zinc-600">{BOT_CONFIG[bot]?.label ?? bot}</span>
                            <span className="font-medium" style={{ color }}>{cnt}</span>
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Per-bot breakdown table */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            By Bot (30 days)
          </p>
        </div>
        {grandTotal === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">No bot visits recorded yet.</p>
            <p className="text-xs text-zinc-400 mt-1">
              Visits will appear here once crawlers index your content.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Bot</th>
                <th className="text-right px-4 py-2 font-medium">Visits</th>
                <th className="text-right px-4 py-2 font-medium">Share</th>
                <th className="text-right px-4 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {totals.map(row => (
                <tr key={row.botName} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5">
                    <BotBadge name={row.botName} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-zinc-900">
                    {row.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-500">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((row.total / grandTotal) * 100)}%`,
                            background: BOT_CONFIG[row.botName]?.color ?? "#71717a",
                          }}
                        />
                      </div>
                      <span className="text-xs w-8 text-right">
                        {Math.round((row.total / grandTotal) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-zinc-400">
                    {timeAgo(row.lastDay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent visits log */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Recent Visits
          </p>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">No visits recorded yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">Bot</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recent.map(row => (
                <tr key={row.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 text-xs text-zinc-400 whitespace-nowrap">
                    {timeAgo(row.visitedAt)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <BotDot name={row.botName} />
                      <span className="text-xs text-zinc-700">
                        {BOT_CONFIG[row.botName]?.label ?? row.botName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-400 whitespace-nowrap">
                    {row.resourceType}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500 font-mono truncate max-w-xs">
                    {row.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer note */}
      <p className="text-xs text-zinc-400 pb-4">
        AI crawlers: ChatGPT (GPTBot, ChatGPT-User, OAI-SearchBot), Claude (ClaudeBot, anthropic-ai),
        Perplexity (PerplexityBot), Gemini (Google-Extended), Amazonbot, Meta (meta-externalagent),
        Cohere (cohere-ai), CCBot.{" "}
        Search spiders: Googlebot, Bingbot, Applebot (Apple Intelligence), DuckDuckBot, Bytespider (ByteDance).
      </p>
    </div>
  );
}
