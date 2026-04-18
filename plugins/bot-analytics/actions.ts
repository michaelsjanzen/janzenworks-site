"use server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getAiProvider } from "@/lib/ai";
import { getConfig } from "@/lib/config";
import { checkAndIncrementAi } from "@/lib/rate-limit";
import { loadPlugins } from "@/lib/plugin-loader";
import { getBotTotals, getByResourceType, getAeoHitSlugs, getLlmsTxtScore } from "./db";

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
  const [totals, byResource, aeoHits, llmsScore] = await Promise.all([
    getBotTotals(30),
    getByResourceType(30),
    getAeoHitSlugs(30),
    getLlmsTxtScore(),
  ]);

  if (totals.length === 0) {
    return { ok: false, error: "No bot visit data yet — insights will be available once crawlers start visiting." };
  }

  // Format the data into a concise prompt.
  const totalVisits = totals.reduce((s, r) => s + r.total, 0);

  const resourceSummary: Record<string, Record<string, number>> = {};
  for (const r of byResource) {
    resourceSummary[r.botName] ??= {};
    resourceSummary[r.botName][r.resourceType] = r.total;
  }

  // Derive funnel stage per bot: 4=AEO markdown, 3=HTML, 2=infrastructure, 1=any visit
  const INFRA_TYPES = new Set(["Robots.txt", "Sitemap", "llms.txt", "llms-full.txt"]);
  function funnelStage(botTypes: Record<string, number>): string {
    if ((botTypes["Post Markdown"] ?? 0) > 0) return "Stage 4 — consuming AEO markdown";
    if ((botTypes["HTML Page"] ?? 0) > 0) return "Stage 3 — crawling HTML only";
    if (Object.keys(botTypes).some(k => INFRA_TYPES.has(k))) return "Stage 2 — reading infrastructure";
    return "Stage 1 — discovered site";
  }

  const botLines = totals.map(r => {
    const types = resourceSummary[r.botName] ?? {};
    const typeStr = Object.entries(types).map(([t, c]) => `${t}=${c}`).join(", ");
    const stage = funnelStage(types);
    return `  ${r.botName}: ${r.total} visits | ${typeStr} | ${stage}`;
  }).join("\n");

  const aeoHitLine = aeoHits.length > 0
    ? `Posts consumed as AEO markdown (30d): ${aeoHits.map(h => `${h.postSlug} (${h.total}x)`).join(", ")}`
    : "Posts consumed as AEO markdown (30d): none yet";

  const llmsLine = llmsScore.total > 0
    ? `AEO coverage: ${llmsScore.withSummary}/${llmsScore.total} posts have summary, ${llmsScore.withQa}/${llmsScore.total} have Q&A, ${llmsScore.withEntities}/${llmsScore.total} have entities`
    : "AEO coverage: no published posts yet";

  const userPrompt = `
Bot visits — last 30 days (total: ${totalVisits}):
${botLines}

${aeoHitLine}
${llmsLine}
  `.trim();

  const systemPrompt =
    "You are an AEO (Answer Engine Optimisation) advisor reviewing bot traffic analytics for a website. " +
    "Provide 3-5 concise, actionable bullet-point insights. " +
    "Each bot behaves differently — tailor recommendations accordingly: " +
    "Claude tends toward systematic sitemap discovery (suggest sitemap and llms.txt improvements); " +
    "ChatGPT reads llms.txt and follows explicit markdown links (suggest llms.txt richness and direct AEO URL exposure); " +
    "Googlebot and Bingbot focus on HTML (suggest traditional SEO signals); " +
    "bots at Stage 2 or below need stronger discovery signals; bots at Stage 3 need the invisible handshake to work. " +
    "Reference specific bots by name. Note which posts have been consumed as AEO markdown and which haven't. " +
    "Format as a short markdown list. No preamble, no summary sentence at the end.";

  try {
    const text = await ai.complete(systemPrompt, userPrompt);
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI call failed: ${msg}` };
  }
}
