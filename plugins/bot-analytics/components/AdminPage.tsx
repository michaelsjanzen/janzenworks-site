import { getBotTotals, getPriorTotals, getRecentVisits, getDailyTotals, getByResourceType, getTopPaths, getUncoveredAeoPosts, getLlmsTxtScore } from "../db";
import InsightsButton from "./InsightsButton";
import { isAiConfigured } from "@/lib/ai";
import { BOT_CONFIG } from "@/lib/bot-detection";
import { getConfig } from "@/lib/config";
import Link from "next/link";

const AI_BOTS     = Object.entries(BOT_CONFIG).filter(([, v]) => v.type === "ai");
const SEARCH_BOTS = Object.entries(BOT_CONFIG).filter(([, v]) => v.type === "search");

const AEO_RESOURCE_TYPES = new Set(["llms.txt", "llms-full.txt", "Post Markdown"]);

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

const FUNNEL_STAGES = [
  { label: "Discovered",     resourceTypes: ["HTML Page", "llms.txt", "llms-full.txt", "Post Markdown", "Sitemap", "Robots.txt"] },
  { label: "Infrastructure", resourceTypes: ["Robots.txt", "Sitemap", "llms.txt", "llms-full.txt"] },
  { label: "HTML content",   resourceTypes: ["HTML Page"] },
  { label: "AEO markdown",   resourceTypes: ["Post Markdown"] },
];

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
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-[#21262d] text-zinc-700 dark:text-[#e6edf3]">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {BOT_CONFIG[name]?.label ?? name}
    </span>
  );
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const card      = "bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] rounded-xl overflow-hidden";
const cardPad   = "bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] rounded-xl p-4";
const cardHead  = "px-4 py-3 border-b border-zinc-100 dark:border-[#30363d]";
const eyebrow   = "text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400";
const bodyText  = "text-zinc-900 dark:text-[#e6edf3]";
const mutedText = "text-zinc-500 dark:text-[#8b949e]";
const tableHead = "bg-zinc-50 dark:bg-[#0d1117] text-xs text-zinc-500 dark:text-[#8b949e]";
const tableRow  = "hover:bg-zinc-50 dark:hover:bg-[#21262d]";
const divider   = "divide-y divide-zinc-100 dark:divide-[#30363d]";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BotAnalyticsAdminPage() {
  const [totals, priorTotals, recent, daily, byResource, topPaths, uncoveredAeo, llmsScore, aiEnabled, config] = await Promise.all([
    getBotTotals(30),
    getPriorTotals(30),
    getRecentVisits(50),
    getDailyTotals(30),
    getByResourceType(30),
    getTopPaths(10),
    getUncoveredAeoPosts(),
    getLlmsTxtScore(),
    isAiConfigured(),
    getConfig(),
  ]);

  const grandTotal = totals.reduce((s, r) => s + r.total, 0);
  const priorTotal = priorTotals.reduce((s, r) => s + r.total, 0);
  const trendPct   = priorTotal > 0 ? Math.round(((grandTotal - priorTotal) / priorTotal) * 100) : null;

  // AEO Appetite — visits to AEO endpoints as % of all visits
  const aeoTotal        = byResource.filter(r => AEO_RESOURCE_TYPES.has(r.resourceType)).reduce((s, r) => s + r.total, 0);
  const aeoAppetitePct  = grandTotal > 0 ? Math.round((aeoTotal / grandTotal) * 100) : 0;

  // Network participation
  const networkActive = config.network?.participateInNetwork ?? false;

  const summaryMap = Object.fromEntries(totals.map(r => [r.botName, r.total]));

  const resourceMap: Record<string, Record<string, number>> = {};
  for (const row of byResource) {
    resourceMap[row.botName] ??= {};
    resourceMap[row.botName][row.resourceType] = row.total;
  }

  const activeResourceTypes = RESOURCE_TYPES.filter(rt =>
    byResource.some(r => r.resourceType === rt.id),
  );
  const displayResourceTypes = activeResourceTypes.length > 0 ? activeResourceTypes : RESOURCE_TYPES;

  function botFunnelStage(botName: string): number {
    const botTypes = resourceMap[botName] ?? {};
    for (let i = FUNNEL_STAGES.length - 1; i >= 0; i--) {
      const reached = FUNNEL_STAGES[i].resourceTypes.some(rt => (botTypes[rt] ?? 0) > 0);
      if (reached) return i + 1;
    }
    return 0;
  }

  const activeBots = totals.map(r => r.botName);

  const llmsHealthPct = llmsScore.total > 0
    ? Math.round(((llmsScore.withSummary + llmsScore.withQa + llmsScore.withEntities) / (llmsScore.total * 3)) * 100)
    : 0;

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
  const dailyTotals = allDates.map(d =>
    Object.values(dailyIndex).reduce((s, botDays) => s + (botDays[d] ?? 0), 0)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className={`text-xl font-semibold ${bodyText}`}>AEO Analytics</h1>
        <p className={`text-sm ${mutedText} mt-0.5`}>
          AI crawler and search engine bot visits — last 30 days
        </p>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        {/* Total visits + trend */}
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>Total visits</p>
          <p className={`text-2xl font-bold ${bodyText}`}>
            {grandTotal > 0 ? grandTotal.toLocaleString() : "—"}
          </p>
          {trendPct !== null && grandTotal > 0 && (
            <p className={`text-xs mt-1 font-semibold ${trendPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
              {trendPct >= 0 ? `↑ ${trendPct}%` : `↓ ${Math.abs(trendPct)}%`} vs prior 30d
            </p>
          )}
        </div>

        {/* AEO Appetite */}
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>AEO appetite</p>
          <p className={`text-2xl font-bold ${aeoAppetitePct > 0 ? "text-violet-600 dark:text-violet-400" : bodyText}`}>
            {grandTotal > 0 ? `${aeoAppetitePct}%` : "—"}
          </p>
          <p className={`text-xs ${mutedText} mt-1`}>visits to AEO endpoints</p>
        </div>

        {/* Unique bots */}
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>Unique bots</p>
          <p className={`text-2xl font-bold ${bodyText}`}>
            {totals.length > 0 ? totals.length : "—"}
          </p>
        </div>

        {/* Last visit */}
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>Last visit</p>
          <p className={`text-sm font-semibold ${bodyText}`}>
            {recent[0] ? timeAgo(recent[0].visitedAt) : "—"}
          </p>
        </div>
      </div>

      {/* ── AI Crawlers ────────────────────────────────────────────────────── */}
      <div>
        <p className={`${eyebrow} mb-3`}>AI Crawlers</p>
        <div className="flex flex-wrap gap-3">
          {AI_BOTS.map(([key, info]) => {
            const count = summaryMap[key] ?? 0;
            return (
              <div
                key={key}
                className={`bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] rounded-xl p-4 min-w-[110px] flex-1 text-center`}
                style={{ borderTop: `3px solid ${info.color}` }}
              >
                <div
                  className="text-2xl font-bold leading-tight"
                  style={{ color: count > 0 ? info.color : "#6b7280" }}
                >
                  {count > 0 ? count.toLocaleString() : "0"}
                </div>
                <div className={`text-xs ${mutedText} mt-1`}>{info.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Search Spiders ─────────────────────────────────────────────────── */}
      <div>
        <p className={`${eyebrow} mb-3`}>Search Spiders</p>
        <div className="flex flex-wrap gap-3">
          {SEARCH_BOTS.map(([key, info]) => {
            const count = summaryMap[key] ?? 0;
            return (
              <div
                key={key}
                className={`bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] rounded-xl p-3 min-w-[100px] flex-1 text-center`}
                style={{ borderTop: `3px solid ${info.color}` }}
              >
                <div
                  className="text-xl font-bold leading-tight"
                  style={{ color: count > 0 ? info.color : "#6b7280" }}
                >
                  {count > 0 ? count.toLocaleString() : "0"}
                </div>
                <div className={`text-xs ${mutedText} mt-1`}>{info.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI Insights ────────────────────────────────────────────────────── */}
      {aiEnabled && <InsightsButton />}

      {/* ── Uncovered AEO — moved up, most actionable ──────────────────────── */}
      <div className={card}>
        <div className={cardHead}>
          <p className={eyebrow}>Uncovered AEO</p>
          <p className={`text-xs ${mutedText} mt-0.5`}>
            Posts with AEO metadata that bots have visited as HTML but not yet consumed as optimised markdown — your highest-leverage targets.
          </p>
        </div>
        {uncoveredAeo.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className={`text-sm ${mutedText}`}>
              {grandTotal === 0
                ? "No bot visit data yet — check back after crawlers arrive."
                : "No uncovered posts — bots are consuming your AEO content."}
            </p>
          </div>
        ) : (
          <ul className={`${divider}`}>
            {uncoveredAeo.map(p => (
              <li key={p.slug} className="px-4 py-3 flex items-center justify-between gap-4">
                <Link
                  href={`/admin/posts`}
                  className={`text-sm ${bodyText} hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate`}
                >
                  {p.title}
                </Link>
                <span className={`text-xs font-mono ${mutedText} shrink-0`}>/post/{p.slug}/llm.txt</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Discovery Funnel ───────────────────────────────────────────────── */}
      {activeBots.length > 0 && (
        <div className={card}>
          <div className={cardHead}>
            <p className={eyebrow}>Discovery Funnel</p>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              How far each bot has progressed — from first visit to consuming optimised AEO content.
            </p>
          </div>
          <div className={divider}>
            {activeBots.map(bot => {
              const stage = botFunnelStage(bot);
              return (
                <div key={bot} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-28 shrink-0">
                    <BotBadge name={bot} />
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    {FUNNEL_STAGES.map((s, i) => {
                      const reached = stage > i;
                      return (
                        <div key={s.label} className="flex items-center gap-1 flex-1">
                          <div
                            className={`flex-1 h-1.5 rounded-full ${reached ? "" : "bg-zinc-100 dark:bg-[#21262d]"}`}
                            style={reached ? { background: BOT_CONFIG[bot]?.color ?? "#71717a" } : {}}
                          />
                          <div
                            className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${reached ? "border-transparent" : "border-zinc-200 dark:border-[#30363d] bg-white dark:bg-[#161b22]"}`}
                            style={reached ? { background: BOT_CONFIG[bot]?.color ?? "#71717a" } : {}}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="w-28 text-right">
                    <span className={`text-xs ${mutedText}`}>{FUNNEL_STAGES[stage - 1]?.label ?? "No visits"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={`px-4 py-2 bg-zinc-50 dark:bg-[#0d1117] border-t border-zinc-100 dark:border-[#30363d] flex gap-6`}>
            {FUNNEL_STAGES.map((s, i) => (
              <span key={s.label} className={`text-[10px] ${mutedText}`}>
                <span className={`font-medium ${bodyText}`}>{i + 1}.</span> {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── llms.txt Health ────────────────────────────────────────────────── */}
      <div className={cardPad}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className={eyebrow}>llms.txt Health</p>
            <p className={`text-xs ${mutedText} mt-0.5`}>AEO content coverage across your published posts.</p>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${bodyText}`}>{llmsHealthPct}%</span>
            <p className={`text-xs ${mutedText}`}>{llmsScore.total} posts</p>
          </div>
        </div>
        <div className="w-full h-2 bg-zinc-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-violet-600 dark:bg-violet-500 transition-all"
            style={{ width: `${llmsHealthPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Summary",   count: llmsScore.withSummary },
            { label: "Q&A pairs", count: llmsScore.withQa },
            { label: "Entities",  count: llmsScore.withEntities },
          ].map(({ label, count }) => (
            <div key={label} className="bg-zinc-50 dark:bg-[#0d1117] rounded-lg p-2">
              <p className={`text-lg font-bold ${bodyText}`}>{count}</p>
              <p className={`text-xs ${mutedText}`}>{label}</p>
              <p className={`text-[10px] ${mutedText}`}>
                {llmsScore.total > 0 ? `${Math.round((count / llmsScore.total) * 100)}%` : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily sparkline ────────────────────────────────────────────────── */}
      <div className={cardPad}>
        <p className={`${eyebrow} mb-3`}>Daily visits (30 days)</p>
        {grandTotal === 0 ? (
          <div className="h-16 flex items-center justify-center">
            <p className={`text-xs ${mutedText}`}>No visits recorded yet — chart will appear once bots arrive.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-0.5 h-16">
              {dailyTotals.map((total, i) => (
                <div
                  key={allDates[i]}
                  className="flex-1 rounded-sm min-w-0 bg-violet-500 dark:bg-violet-600 opacity-80"
                  style={{ height: `${Math.max(2, Math.round((total / maxDailyTotal) * 100))}%` }}
                  title={`${allDates[i]}: ${total} visits`}
                />
              ))}
            </div>
            <div className={`flex justify-between text-[10px] ${mutedText} mt-1`}>
              <span>{allDates[0] ?? ""}</span>
              <span>{allDates[allDates.length - 1] ?? ""}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Content Reach ──────────────────────────────────────────────────── */}
      <div className={card}>
        <div className={cardHead}>
          <p className={eyebrow}>Content Reach</p>
          <p className={`text-xs ${mutedText} mt-0.5`}>
            Which content types each bot is consuming — last 30 days. AEO endpoints show bots reading your optimised content directly.
          </p>
        </div>
        {grandTotal === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-sm ${mutedText}`}>No visits recorded yet.</p>
            <p className={`text-xs ${mutedText} mt-1`}>AEO endpoint hits will appear here once AI crawlers discover your content.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Resource Type</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  {Object.keys(BOT_CONFIG).map(bot => (
                    <th key={bot} className="text-center px-3 py-2 font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: BOT_CONFIG[bot].color }} />
                        <span className="whitespace-nowrap">{BOT_CONFIG[bot].label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y divide-zinc-100 dark:divide-[#30363d]`}>
                {(["aeo", "discovery", "crawl"] as ResourceCategory[]).map(category => {
                  const typeRows = displayResourceTypes.filter(rt => rt.category === category);
                  return typeRows.map((rt, i) => (
                    <tr key={rt.id} className={tableRow}>
                      <td className={`px-4 py-2 font-mono text-xs ${bodyText}`}>{rt.label}</td>
                      <td className={`px-4 py-2 text-xs ${mutedText}`}>
                        {i === 0 ? CATEGORY_LABELS[category] : ""}
                      </td>
                      {Object.keys(BOT_CONFIG).map(bot => {
                        const cnt = resourceMap[bot]?.[rt.id] ?? 0;
                        return (
                          <td key={bot} className="px-3 py-2 text-center text-xs">
                            {cnt > 0 ? (
                              <span className="font-semibold" style={{ color: BOT_CONFIG[bot].color }}>
                                {cnt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-[#484f58]">—</span>
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

      {/* ── Top Paths ──────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className={cardHead}>
          <p className={eyebrow}>Top Paths</p>
          <p className={`text-xs ${mutedText} mt-0.5`}>Most-visited content pages — last 7 days.</p>
        </div>
        {topPaths.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-sm ${mutedText}`}>No page visits recorded yet.</p>
            <p className={`text-xs ${mutedText} mt-1`}>Top pages will appear here once bots start crawling your content.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="text-left px-4 py-2 font-medium">Path</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-left px-4 py-2 font-medium">By Bot</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-zinc-100 dark:divide-[#30363d]`}>
              {topPaths.map(row => (
                <tr key={row.path} className={tableRow}>
                  <td className={`px-4 py-2.5 font-mono text-xs ${mutedText} truncate max-w-xs`}>
                    {row.path}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${bodyText}`}>
                    {row.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(row.bots).map(([bot, cnt]) => {
                        const color = BOT_CONFIG[bot]?.color ?? "#9ca3af";
                        return (
                          <span
                            key={bot}
                            className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-[#21262d] border border-zinc-200 dark:border-[#30363d]`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className={mutedText}>{BOT_CONFIG[bot]?.label ?? bot}</span>
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

      {/* ── By Bot ─────────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className={cardHead}>
          <p className={eyebrow}>By Bot (30 days)</p>
        </div>
        {grandTotal === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-sm ${mutedText}`}>No bot visits recorded yet.</p>
            <p className={`text-xs ${mutedText} mt-1`}>Visits will appear here once crawlers index your content.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="text-left px-4 py-2 font-medium">Bot</th>
                <th className="text-right px-4 py-2 font-medium">Visits</th>
                <th className="text-right px-4 py-2 font-medium">Share</th>
                <th className="text-right px-4 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-zinc-100 dark:divide-[#30363d]`}>
              {totals.map(row => (
                <tr key={row.botName} className={tableRow}>
                  <td className="px-4 py-2.5">
                    <BotBadge name={row.botName} />
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${bodyText}`}>
                    {row.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((row.total / grandTotal) * 100)}%`,
                            background: BOT_CONFIG[row.botName]?.color ?? "#71717a",
                          }}
                        />
                      </div>
                      <span className={`text-xs w-8 text-right ${mutedText}`}>
                        {Math.round((row.total / grandTotal) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 text-right text-xs ${mutedText}`}>
                    {timeAgo(row.lastDay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Recent Visits ──────────────────────────────────────────────────── */}
      <div className={card}>
        <div className={cardHead}>
          <p className={eyebrow}>Recent Visits</p>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-sm ${mutedText}`}>No visits recorded yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">Bot</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Path</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-zinc-100 dark:divide-[#30363d]`}>
              {recent.map(row => (
                <tr key={row.id} className={tableRow}>
                  <td className={`px-4 py-2 text-xs ${mutedText} whitespace-nowrap`}>
                    {timeAgo(row.visitedAt)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <BotDot name={row.botName} />
                      <span className={`text-xs ${bodyText}`}>
                        {BOT_CONFIG[row.botName]?.label ?? row.botName}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-2 text-xs ${mutedText} whitespace-nowrap`}>
                    {row.resourceType}
                  </td>
                  <td className={`px-4 py-2 text-xs ${mutedText} font-mono truncate max-w-xs`}>
                    {row.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Network participation callout ──────────────────────────────────── */}
      {networkActive && (
        <div className="border border-violet-200 dark:border-[#1d1535] bg-violet-50 dark:bg-[#1d1535] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              Contributing to the AEO Intelligence Network
            </p>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              Your anonymised bot data is included in the network. See how the web compares.
            </p>
          </div>
          <a
            href="https://aeopugmill.com"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
          >
            aeopugmill.com →
          </a>
        </div>
      )}

      {/* ── Footer note ────────────────────────────────────────────────────── */}
      <p className={`text-xs ${mutedText} pb-4`}>
        AI crawlers: ChatGPT (GPTBot, ChatGPT-User, OAI-SearchBot), Claude (ClaudeBot, anthropic-ai),
        Perplexity (PerplexityBot), Gemini (Google-Extended), Amazonbot, Meta (meta-externalagent),
        Cohere (cohere-ai), CCBot.{" "}
        Search spiders: Googlebot, Bingbot, Applebot (Apple Intelligence), DuckDuckBot, Bytespider (ByteDance).
      </p>
    </div>
  );
}
