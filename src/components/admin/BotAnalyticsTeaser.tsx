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

interface Props {
  totals:   BotTotal[];
  topPaths: TopPath[];
}

export default function BotAnalyticsTeaser({ totals, topPaths }: Props) {
  const aiBots    = totals.filter(r => BOT_CONFIG[r.botName]?.type === "ai");
  const searchBots= totals.filter(r => BOT_CONFIG[r.botName]?.type === "search");
  const grandTotal= totals.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Bot Analytics — last 30 days</p>
        <Link href="/admin/bot-analytics" className="text-xs text-zinc-400 hover:text-zinc-600">
          View full report →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* AI Crawlers */}
        <Link
          href="/admin/bot-analytics"
          className="bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 hover:shadow-sm transition-all block"
        >
          <p className="text-xs font-semibold text-zinc-500 mb-3">AI Crawlers</p>
          {aiBots.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No AI crawler visits yet</p>
          ) : (
            <div className="space-y-1.5">
              {aiBots.slice(0, 4).map(row => {
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
              {aiBots.length > 4 && (
                <p className="text-[10px] text-zinc-400 pt-0.5">
                  +{aiBots.length - 4} more
                </p>
              )}
            </div>
          )}
        </Link>

        {/* Search Spiders */}
        <Link
          href="/admin/bot-analytics"
          className="bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 hover:shadow-sm transition-all block"
        >
          <p className="text-xs font-semibold text-zinc-500 mb-3">Search Spiders</p>
          {searchBots.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No search spider visits yet</p>
          ) : (
            <div className="space-y-1.5">
              {searchBots.slice(0, 4).map(row => {
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
              {searchBots.length > 4 && (
                <p className="text-[10px] text-zinc-400 pt-0.5">
                  +{searchBots.length - 4} more
                </p>
              )}
            </div>
          )}
        </Link>

        {/* Top Content */}
        <Link
          href="/admin/bot-analytics"
          className="bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 hover:shadow-sm transition-all block"
        >
          <p className="text-xs font-semibold text-zinc-500 mb-3">Top Content <span className="font-normal text-zinc-400">(7 days)</span></p>
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
                <p className="text-[10px] text-zinc-400 pt-0.5">
                  +{topPaths.length - 4} more
                </p>
              )}
            </div>
          )}
        </Link>

      </div>
    </div>
  );
}
