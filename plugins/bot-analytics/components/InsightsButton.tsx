"use client";
import { useState, useTransition } from "react";
import { getAnalyticsInsights } from "../actions";

export default function InsightsButton() {
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setInsights(null);
    setError(null);
    startTransition(async () => {
      const result = await getAnalyticsInsights();
      if (result.ok) {
        setInsights(result.text ?? null);
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">AI Insights</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Send your bot traffic data to your configured AI provider for analysis and recommendations.
          </p>
        </div>
        <button
          onClick={handleClick}
          disabled={pending}
          className="shrink-0 px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Analysing…" : "Get AI Insights"}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {insights && (
        <div className="mt-3 text-sm text-zinc-700 prose prose-sm max-w-none border-t border-zinc-100 pt-3">
          {insights.split("\n").map((line, i) => {
            const stripped = line.replace(/^[-*•]\s*/, "");
            const isBullet = /^[-*•]/.test(line.trim());
            if (!stripped.trim()) return null;
            return isBullet
              ? <p key={i} className="flex gap-2 mb-1"><span className="text-zinc-400 shrink-0">•</span><span>{stripped}</span></p>
              : <p key={i} className="mb-1">{line}</p>;
          })}
        </div>
      )}
    </div>
  );
}
