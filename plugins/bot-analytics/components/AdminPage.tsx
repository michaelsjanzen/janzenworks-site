import {
  getBotTotals, getPriorTotals, getRecentVisits, getDailyTotals,
  getByResourceType, getTopPaths, getUncoveredAeoPosts, getLlmsTxtScore,
} from "../db";
import InsightsButton from "./InsightsButton";
import { isAiConfigured } from "@/lib/ai";
import { BOT_CONFIG } from "@/lib/bot-detection";
import { getConfig } from "@/lib/config";
import Link from "next/link";

// ── Bot category groupings ────────────────────────────────────────────────────

const ANSWER_BOTS   = Object.entries(BOT_CONFIG).filter(([, v]) => v.type === "answer");
const TRAINING_BOTS = Object.entries(BOT_CONFIG).filter(([, v]) => v.type === "training");
const SEARCH_BOTS   = Object.entries(BOT_CONFIG).filter(([, v]) => v.type === "search");

const BOT_CATEGORIES = [
  { key: "answer",   label: "AI Answer Engines", bots: ANSWER_BOTS,   accent: "#a78bfa" },
  { key: "training", label: "Training Crawlers",  bots: TRAINING_BOTS, accent: "#f9a8d4" },
  { key: "search",   label: "Search Engines",     bots: SEARCH_BOTS,   accent: "#93c5fd" },
] as const;

// ── AEO Infrastructure endpoints ──────────────────────────────────────────────

const AEO_ENDPOINTS = [
  { id: "llms.txt",      label: "llms.txt",       category: "AEO"       },
  { id: "llms-full.txt", label: "llms-full.txt",  category: "AEO"       },
  { id: "Post Markdown", label: "Post Markdown",  category: "AEO"       },
  { id: "Sitemap",       label: "Sitemap",         category: "Discovery" },
  { id: "Robots.txt",    label: "Robots.txt",      category: "Discovery" },
  { id: "RSS Feed",      label: "RSS Feed",         category: "Discovery" },
  { id: "HTML Page",     label: "HTML Pages",       category: "Crawl"    },
];

// ── AEO Content Coverage fields ───────────────────────────────────────────────

const AEO_FIELDS = [
  { key: "withSummary",  label: "Summary",         desc: "AI-readable summary paragraph" },
  { key: "withQa",       label: "Q&A / FAQPage",   desc: "Question and answer pairs"      },
  { key: "withEntities", label: "Entities",         desc: "Named entities with types"      },
  { key: "withKeywords", label: "Keywords",         desc: "Topical keyword tags"           },
  { key: "withSchema",   label: "Extended Schema",  desc: "HowTo, Product, Event, etc."   },
] as const;

// ── Resource types present in data ───────────────────────────────────────────

const AEO_RESOURCE_TYPES = new Set(["llms.txt", "llms-full.txt", "Post Markdown"]);

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
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />;
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

// ── Style tokens (aeopugmill.com–aligned) ─────────────────────────────────────

const card      = "bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] rounded-xl overflow-hidden";
const cardPad   = "bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] rounded-xl p-4";
const cardHead  = "px-4 py-3 border-b border-zinc-100 dark:border-[#30363d]";
const eyebrow   = "text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400";
const bodyText  = "text-zinc-900 dark:text-[#e6edf3]";
const mutedText = "text-zinc-500 dark:text-[#8b949e]";
const tableHead = "bg-zinc-50 dark:bg-[#0d1117] text-xs text-zinc-500 dark:text-[#8b949e]";
const tableRow  = "hover:bg-zinc-50 dark:hover:bg-[#21262d]";
const divider   = "divide-y divide-zinc-100 dark:divide-[#30363d]";

// ── Funnel stages ─────────────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { label: "Discovered",     resourceTypes: ["HTML Page", "llms.txt", "llms-full.txt", "Post Markdown", "Sitemap", "Robots.txt"] },
  { label: "Infrastructure", resourceTypes: ["Robots.txt", "Sitemap", "llms.txt", "llms-full.txt"] },
  { label: "HTML content",   resourceTypes: ["HTML Page"] },
  { label: "AEO markdown",   resourceTypes: ["Post Markdown"] },
];

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

  // AEO Appetite
  const aeoTotal       = byResource.filter(r => AEO_RESOURCE_TYPES.has(r.resourceType)).reduce((s, r) => s + r.total, 0);
  const aeoAppetitePct = grandTotal > 0 ? Math.round((aeoTotal / grandTotal) * 100) : 0;

  // Network participation
  const networkActive = config.network?.participateInNetwork ?? false;

  // Summary and resource maps
  const summaryMap: Record<string, number> = Object.fromEntries(totals.map(r => [r.botName, r.total]));

  const resourceMap: Record<string, Record<string, number>> = {};
  for (const row of byResource) {
    resourceMap[row.botName] ??= {};
    resourceMap[row.botName][row.resourceType] = row.total;
  }

  // Endpoint totals (across all bots)
  const endpointTotals: Record<string, number> = {};
  for (const row of byResource) {
    endpointTotals[row.resourceType] = (endpointTotals[row.resourceType] ?? 0) + row.total;
  }

  const activeBots = totals.map(r => r.botName);

  function botFunnelStage(botName: string): number {
    const botTypes = resourceMap[botName] ?? {};
    for (let i = FUNNEL_STAGES.length - 1; i >= 0; i--) {
      if (FUNNEL_STAGES[i].resourceTypes.some(rt => (botTypes[rt] ?? 0) > 0)) return i + 1;
    }
    return 0;
  }

  // Daily chart
  const allDates = [...new Set(daily.map(r => r.day))].sort();
  const dailyIndex: Record<string, Record<string, number>> = {};
  for (const row of daily) {
    dailyIndex[row.botName] ??= {};
    dailyIndex[row.botName][row.day] = row.total;
  }
  const maxDailyTotal = allDates.length > 0
    ? Math.max(...allDates.map(d => Object.values(dailyIndex).reduce((s, b) => s + (b[d] ?? 0), 0)), 1)
    : 1;
  const dailyTotals = allDates.map(d =>
    Object.values(dailyIndex).reduce((s, b) => s + (b[d] ?? 0), 0)
  );

  // llms.txt health score
  const llmsHealthPct = llmsScore.total > 0
    ? Math.round(((llmsScore.withSummary + llmsScore.withQa + llmsScore.withEntities + llmsScore.withKeywords + llmsScore.withSchema) / (llmsScore.total * AEO_FIELDS.length)) * 100)
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-xl font-semibold ${bodyText}`}>AEO Analytics</h1>
          <p className={`text-sm ${mutedText} mt-0.5`}>AI crawler and search engine bot visits — last 30 days</p>
        </div>
        {aiEnabled && <InsightsButton />}
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>Total visits</p>
          <p className={`text-2xl font-bold ${bodyText}`}>{grandTotal > 0 ? grandTotal.toLocaleString() : "—"}</p>
          {trendPct !== null && grandTotal > 0 && (
            <p className={`text-xs mt-1 font-semibold ${trendPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
              {trendPct >= 0 ? `↑ ${trendPct}%` : `↓ ${Math.abs(trendPct)}%`} vs prior 30d
            </p>
          )}
        </div>
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>AEO appetite</p>
          <p className={`text-2xl font-bold ${aeoAppetitePct > 0 ? "text-violet-600 dark:text-violet-400" : bodyText}`}>
            {grandTotal > 0 ? `${aeoAppetitePct}%` : "—"}
          </p>
          <p className={`text-xs ${mutedText} mt-1`}>visits to AEO endpoints</p>
        </div>
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>Unique bots</p>
          <p className={`text-2xl font-bold ${bodyText}`}>{totals.length > 0 ? totals.length : "—"}</p>
        </div>
        <div className={cardPad}>
          <p className={`text-xs ${mutedText} mb-1`}>Last visit</p>
          <p className={`text-sm font-semibold ${bodyText}`}>{recent[0] ? timeAgo(recent[0].visitedAt) : "—"}</p>
        </div>
      </div>

      {/* ── 3-column: Bot Activity | AEO Content Coverage | AEO Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Col 1 — Bot Activity ─────────────────────────────────────────── */}
        <div className={`${card} flex flex-col`}>
          <div className={cardHead}>
            <p className={eyebrow}>Bot Activity</p>
            <p className={`text-xs ${mutedText} mt-0.5`}>All visits by category — last 30 days</p>
          </div>
          <div className="p-3 space-y-2 flex-1">
            {BOT_CATEGORIES.map(cat => {
              const catTotal = cat.bots.reduce((s, [key]) => s + (summaryMap[key] ?? 0), 0);
              const catShare = grandTotal > 0 ? Math.round((catTotal / grandTotal) * 100) : 0;
              const activeCatBots = cat.bots.filter(([key]) => (summaryMap[key] ?? 0) > 0);
              return (
                <div
                  key={cat.key}
                  className="rounded-lg p-3 bg-zinc-50 dark:bg-[#0d1117] border border-zinc-100 dark:border-[#21262d]"
                  style={{ borderLeft: `3px solid ${cat.accent}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: cat.accent }}
                    >
                      {cat.label}
                    </span>
                    <span className={`text-xs font-bold ${bodyText}`}>
                      {catTotal > 0 ? catTotal.toLocaleString() : "—"}
                      {catTotal > 0 && <span className={`ml-1 font-normal ${mutedText}`}>{catShare}%</span>}
                    </span>
                  </div>
                  {activeCatBots.length === 0 ? (
                    <p className={`text-[10px] ${mutedText} italic`}>No visits recorded</p>
                  ) : (
                    <div className="space-y-1">
                      {activeCatBots.map(([key, info]) => {
                        const count = summaryMap[key] ?? 0;
                        const share = catTotal > 0 ? Math.round((count / catTotal) * 100) : 0;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: info.color }} />
                            <span className={`text-[10px] ${mutedText} flex-1 truncate`}>{info.label}</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-1 bg-zinc-200 dark:bg-[#30363d] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${share}%`, background: info.color }} />
                              </div>
                              <span className={`text-[10px] font-semibold ${bodyText} w-6 text-right`}>{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2 — AEO Content Coverage ─────────────────────────────────── */}
        <div className={`${card} flex flex-col`}>
          <div className={cardHead}>
            <p className={eyebrow}>AEO Content Coverage</p>
            <p className={`text-xs ${mutedText} mt-0.5`}>AEO field adoption across your {llmsScore.total} published posts</p>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {/* Overall score */}
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs ${mutedText}`}>Overall coverage</span>
              <span className={`text-lg font-bold ${bodyText}`}>{llmsHealthPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full bg-violet-500 dark:bg-violet-600 transition-all" style={{ width: `${llmsHealthPct}%` }} />
            </div>
            {/* Per-field bars */}
            {AEO_FIELDS.map(field => {
              const count = llmsScore[field.key] as number;
              const pct   = llmsScore.total > 0 ? Math.round((count / llmsScore.total) * 100) : 0;
              return (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs ${bodyText}`}>{field.label}</span>
                    <span className={`text-xs font-semibold ${bodyText}`}>{pct}%
                      <span className={`ml-1 font-normal ${mutedText}`}>{count}/{llmsScore.total}</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 75 ? "#22c55e" : pct >= 40 ? "#a78bfa" : "#f59e0b",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3 — AEO Infrastructure ───────────────────────────────────── */}
        <div className={`${card} flex flex-col`}>
          <div className={cardHead}>
            <p className={eyebrow}>AEO Infrastructure</p>
            <p className={`text-xs ${mutedText} mt-0.5`}>Active AEO subjects, endpoints, and routes. Bot visit counts last 30 days.</p>
          </div>
          <div className={`${divider} flex-1`}>
            {AEO_ENDPOINTS.map(ep => {
              const visits = endpointTotals[ep.id] ?? 0;
              return (
                <div key={ep.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: ep.category === "AEO" ? "#a78bfa" : ep.category === "Discovery" ? "#93c5fd" : "#8b949e" }}
                    />
                    <span className={`text-xs font-mono ${bodyText} truncate`}>{ep.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-green-100 dark:bg-[#0d2b1a] text-green-700 dark:text-green-400">
                      Enabled
                    </span>
                    {visits > 0 && (
                      <span className={`text-xs font-semibold ${bodyText}`}>{visits.toLocaleString()}</span>
                    )}
                    {visits === 0 && (
                      <span className={`text-xs ${mutedText}`}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Uncovered AEO ──────────────────────────────────────────────────── */}
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
          <ul className={divider}>
            {uncoveredAeo.map(p => (
              <li key={p.slug} className="px-4 py-3 flex items-center justify-between gap-4">
                <span className={`text-sm ${bodyText} truncate`}>{p.title}</span>
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
                  <div className="w-36 shrink-0">
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

      {/* ── Daily sparkline ────────────────────────────────────────────────── */}
      <div className={cardPad}>
        <p className={`${eyebrow} mb-3`}>Daily visits — last 30 days</p>
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

      {/* ── Content Reach — bots as rows, resource types as columns ────────── */}
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
            <table className="w-full text-xs">
              <thead className={tableHead}>
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Bot</th>
                  {AEO_ENDPOINTS.map(ep => (
                    <th key={ep.id} className="text-center px-2 py-2 font-medium whitespace-nowrap">
                      {ep.label}
                    </th>
                  ))}
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-zinc-100 dark:divide-[#30363d]`}>
                {activeBots.map(bot => {
                  const botResources = resourceMap[bot] ?? {};
                  const botTotal = summaryMap[bot] ?? 0;
                  return (
                    <tr key={bot} className={tableRow}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <BotDot name={bot} />
                          <span className={`${bodyText} whitespace-nowrap`}>{BOT_CONFIG[bot]?.label ?? bot}</span>
                        </div>
                      </td>
                      {AEO_ENDPOINTS.map(ep => {
                        const cnt = botResources[ep.id] ?? 0;
                        return (
                          <td key={ep.id} className="px-2 py-2.5 text-center">
                            {cnt > 0 ? (
                              <span className="font-semibold" style={{ color: BOT_CONFIG[bot]?.color ?? "#71717a" }}>
                                {cnt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-[#484f58]">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className={`px-4 py-2.5 text-right font-semibold ${bodyText}`}>
                        {botTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
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
                  <td className={`px-4 py-2.5 font-mono text-xs ${mutedText} truncate max-w-xs`}>{row.path}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${bodyText}`}>{row.total.toLocaleString()}</td>
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

      {/* ── By Bot (30 days) ───────────────────────────────────────────────── */}
      <div className={card}>
        <div className={cardHead}>
          <p className={eyebrow}>By Bot — 30 days</p>
        </div>
        {grandTotal === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-sm ${mutedText}`}>No bot visits recorded yet.</p>
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
                  <td className="px-4 py-2.5"><BotBadge name={row.botName} /></td>
                  <td className={`px-4 py-2.5 text-right font-medium ${bodyText}`}>{row.total.toLocaleString()}</td>
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
                  <td className={`px-4 py-2.5 text-right text-xs ${mutedText}`}>{timeAgo(row.lastDay)}</td>
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
                  <td className={`px-4 py-2 text-xs ${mutedText} whitespace-nowrap`}>{timeAgo(row.visitedAt)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <BotDot name={row.botName} />
                      <span className={`text-xs ${bodyText}`}>{BOT_CONFIG[row.botName]?.label ?? row.botName}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-2 text-xs ${mutedText} whitespace-nowrap`}>{row.resourceType}</td>
                  <td className={`px-4 py-2 text-xs ${mutedText} font-mono truncate max-w-xs`}>{row.path}</td>
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
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Contributing to the AEO Intelligence Network</p>
            <p className={`text-xs ${mutedText} mt-0.5`}>Your anonymised bot data is included in the network. See how the web compares.</p>
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
        AI answer engines: OAI-SearchBot, ChatGPT-User (OpenAI), Claude-User (Anthropic), Perplexity-User, Gemini.{" "}
        Training crawlers: GPTBot (OpenAI), ClaudeBot, anthropic-ai, PerplexityBot, Amazonbot, Meta, Cohere, CCBot.{" "}
        Search engines: Googlebot, Bingbot, Applebot (Siri/Spotlight), Applebot-Extended (Apple Intelligence), DuckDuckBot, Bytespider.
      </p>
    </div>
  );
}
