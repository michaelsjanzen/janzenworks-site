"use server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getAiProvider } from "@/lib/ai";
import { getConfig } from "@/lib/config";
import { checkAndIncrementAi } from "@/lib/rate-limit";
import { loadPlugins } from "@/lib/plugin-loader";
import { getBotTotals, getByResourceType } from "./db";

export interface InsightsResult {
  ok:     boolean;
  text?:  string;
  error?: string;
}

export async function getAnalyticsInsights(): Promise<InsightsResult> {
  await loadPlugins();

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const ai = await getAiProvider();
  if (!ai) {
    return { ok: false, error: "AI provider not configured. Set one up in Settings → AI Provider." };
  }

  const { ai: { aiRateLimit } } = await getConfig();
  const usage = await checkAndIncrementAi(user.id, aiRateLimit);
  if (!usage.allowed) {
    return { ok: false, error: `AI rate limit reached (${usage.count}/${usage.limit}). Try again in under an hour.` };
  }

  // Gather last 30 days of data.
  const [totals, byResource] = await Promise.all([
    getBotTotals(30),
    getByResourceType(30),
  ]);

  if (totals.length === 0) {
    return { ok: false, error: "No bot visit data yet — insights will be available once crawlers start visiting." };
  }

  // Format the data into a concise prompt.
  const totalVisits = totals.reduce((s, r) => s + r.total, 0);

  const botSummary = totals
    .map(r => `  ${r.botName}: ${r.total} visits`)
    .join("\n");

  const resourceSummary: Record<string, Record<string, number>> = {};
  for (const r of byResource) {
    resourceSummary[r.botName] ??= {};
    resourceSummary[r.botName][r.resourceType] = r.total;
  }
  const resourceLines = Object.entries(resourceSummary)
    .map(([bot, types]) =>
      `  ${bot}: ${Object.entries(types).map(([t, c]) => `${t}=${c}`).join(", ")}`
    )
    .join("\n");

  const userPrompt = `
Bot visits — last 30 days:
Total: ${totalVisits}

By bot:
${botSummary}

By bot and resource type:
${resourceLines}
  `.trim();

  const systemPrompt =
    "You are an AEO (Answer Engine Optimisation) advisor reviewing bot traffic analytics for a website. " +
    "Provide 3-5 concise, actionable bullet-point insights based on the data. " +
    "Focus on: which AI crawlers are most active, whether AEO endpoints (llms.txt, Post Markdown) are being consumed, " +
    "and what the site owner should do to improve AI discoverability. Be specific and practical. " +
    "Format as a short markdown list. No preamble, no summary sentence at the end.";

  try {
    const text = await ai.complete(systemPrompt, userPrompt);
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI call failed: ${msg}` };
  }
}
