import Link from "next/link";
import { BOT_CONFIG } from "@/lib/bot-detection";

interface BotTotal {
  botName: string;
  total:   number;
}

interface TopPath {
  path:  string;
  total: number;
}

interface LlmsScore {
  total:        number;
  withSummary:  number;
  withQa:       number;
  withEntities: number;
  withKeywords: number;
  withSchema:   number;
}

interface Props {
  totals:    BotTotal[];
  topPaths:  TopPath[];
  llmsScore: LlmsScore | null;
}

const AEO_FIELDS: { key: keyof Omit<LlmsScore, "total">; label: string }[] = [
  { key: "withSummary",  label: "Summary"         },
  { key: "withQa",       label: "Q&A / FAQPage"   },
  { key: "withEntities", label: "Entities"         },
  { key: "withKeywords", label: "Keywords"         },
  { key: "withSchema",   label: "Extended Schema"  },
];

function barColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 40) return "bg-violet-500";
  return "bg-amber-400";
}

export default function BotAnalyticsTeaser({ totals, topPaths, llmsScore }: Props) {
  const answerBots   = totals.filter(r => BOT_CONFIG[r.botName]?.type === "answer");
  const trainingBots = totals.filter(r => BOT_CONFIG[r.botName]?.type === "training");
  const grandTotal   = totals.reduce((s, r) => s + r.total, 0);
  const answerTotal  = answerBots.reduce((s, r) => s + r.total, 0);

  const card = "bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 hover:shadow-sm transition-all block";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">AEO Analytics — last 30 days</p>
        <Link href="/admin/bot-analytics" className="text-xs text-zinc-400 hover:text-zinc-600">
          View full report →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* AI Answer Engines */}
        <Link href="/admin/bot-analytics" className={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-500">AI Answer Engines</p>
            {answerTotal > 0 && grandTotal > 0 && (
              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                {Math.round((answerTotal / grandTotal) * 100)}% of visits
              </span>
            )}
          </div>
          {answerBots.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No answer engine visits yet</p>
          ) : (
            <div className="space-y-1.5">
              {answerBots.slice(0, 4).map(row => {
                const info  = BOT_CONFIG[row.botName];
                const share = grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0;
                return (
                  <div key={row.botName} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: info?.color ?? "#9ca3af" }}
                    />
                    <span className="text-xs text-zinc-700 flex-1 truncate">
                      {info?.label ?? row.botName}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800">
                      {row.total.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-400 w-7 text-right">
                      {share}%
                    </span>
                  </div>
                );
              })}
              {answerBots.length > 4 && (
                <p className="text-[10px] text-zinc-400 pt-0.5">+{answerBots.length - 4} more</p>
              )}
            </div>
          )}
          {trainingBots.length > 0 && (
            <p className="text-[10px] text-zinc-400 mt-3 pt-2.5 border-t border-zinc-100">
              {trainingBots.length} training crawler{trainingBots.length > 1 ? "s" : ""} also active
            </p>
          )}
        </Link>

        {/* AEO Content Coverage */}
        <Link href="/admin/bot-analytics" className={card}>
          <p className="text-xs font-semibold text-zinc-500 mb-3">AEO Content Coverage</p>
          {!llmsScore || llmsScore.total === 0 ? (
            <p className="text-xs text-zinc-400 italic">No published posts yet</p>
          ) : (
            <div className="space-y-2">
              {AEO_FIELDS.map(({ key, label }) => {
                const pct = Math.round((llmsScore[key] / llmsScore.total) * 100);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-zinc-600">{label}</span>
                      <span className="text-[10px] font-semibold text-zinc-500">{pct}%</span>
                    </div>
                    <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-zinc-400 pt-1">
                {llmsScore.total} published post{llmsScore.total !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </Link>

        {/* Top Content */}
        <Link href="/admin/bot-analytics" className={card}>
          <p className="text-xs font-semibold text-zinc-500 mb-3">
            Top Content <span className="font-normal text-zinc-400">(7 days)</span>
          </p>
          {topPaths.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No content visits yet</p>
          ) : (
            <div className="space-y-1.5">
              {topPaths.slice(0, 4).map(row => (
                <div key={row.path} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono flex-1 truncate">
                    {row.path}
                  </span>
                  <span className="text-xs font-semibold text-zinc-800 flex-shrink-0">
                    {row.total.toLocaleString()}
                  </span>
                </div>
              ))}
              {topPaths.length > 4 && (
                <p className="text-[10px] text-zinc-400 pt-0.5">+{topPaths.length - 4} more</p>
              )}
            </div>
          )}
        </Link>

      </div>
    </div>
  );
}
