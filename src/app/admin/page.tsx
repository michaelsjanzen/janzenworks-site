import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

import { db } from "@/lib/db";
import { posts, media, adminUsers, sessions } from "@/lib/db/schema";
import { sql, gte, isNotNull, notInArray } from "drizzle-orm";
import { getConfig } from "@/lib/config";
import { isDevUrl } from "@/lib/detect-site-url";
import DashboardCharts from "@/components/admin/DashboardCharts";
import BotAnalyticsTeaser from "@/components/admin/BotAnalyticsTeaser";
import { getBotTotals, getTopPaths } from "../../../plugins/bot-analytics/db";

function buildMonthlyBuckets(n: number): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    result.push({ key, label });
  }
  return result;
}

export default async function AdminDashboard() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  twelveMonthsAgo.setDate(1);

  // Subquery for used media IDs
  const usedMediaIds = db
    .select({ id: posts.featuredImage })
    .from(posts)
    .where(isNotNull(posts.featuredImage));

  const [config, counts, totalMediaRows, unusedMediaRows, monthlyRaw, allUsers, lastActiveSessions] =
    await Promise.all([
      getConfig(),
      db
        .select({
          type: posts.type,
          published: posts.published,
          count: sql<number>`count(*)::int`,
        })
        .from(posts)
        .groupBy(posts.type, posts.published),

      db.select({ id: media.id }).from(media),

      db.select({ id: media.id }).from(media).where(notInArray(media.id, usedMediaIds)),

      db
        .select({
          month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${posts.createdAt}), 'YYYY-MM')`,
          type: posts.type,
          count: sql<number>`count(*)::int`,
        })
        .from(posts)
        .where(gte(posts.createdAt, twelveMonthsAgo))
        .groupBy(sql`DATE_TRUNC('month', ${posts.createdAt})`, posts.type)
        .orderBy(sql`DATE_TRUNC('month', ${posts.createdAt})`),

      db
        .select({
          id: adminUsers.id,
          name: adminUsers.name,
          email: adminUsers.email,
          role: adminUsers.role,
          createdAt: adminUsers.createdAt,
        })
        .from(adminUsers)
        .orderBy(adminUsers.createdAt),

      // Most recent session per user — expires ≈ lastLogin + 30 days
      db
        .select({
          userId: sessions.userId,
          lastExpires: sql<Date>`MAX(${sessions.expires})`,
        })
        .from(sessions)
        .groupBy(sessions.userId),
    ]);

  const buckets = buildMonthlyBuckets(12);
  const monthlyIndex: Record<string, { posts: number; pages: number }> = {};
  for (const b of buckets) monthlyIndex[b.key] = { posts: 0, pages: 0 };
  for (const row of monthlyRaw) {
    if (monthlyIndex[row.month]) {
      if (row.type === "post") monthlyIndex[row.month].posts = row.count;
      if (row.type === "page") monthlyIndex[row.month].pages = row.count;
    }
  }
  const monthly = buckets.map(b => ({ month: b.label, ...monthlyIndex[b.key] }));

  const sum = (type: string, published?: boolean) =>
    counts
      .filter(r => r.type === type && (published === undefined || r.published === published))
      .reduce((acc, r) => acc + r.count, 0);

  const postStatus = [
    { name: "Published", value: sum("post", true) },
    { name: "Draft", value: sum("post", false) },
  ];
  const pageStatus = [
    { name: "Published", value: sum("page", true) },
    { name: "Draft", value: sum("page", false) },
  ];

  // Build user list with approximate last-active derived from session expiry
  // NextAuth default session maxAge is 30 days; expires = createdAt + 30d
  const SESSION_MAXAGE_MS = 30 * 24 * 60 * 60 * 1000;
  const sessionMap = new Map(
    lastActiveSessions.map(s => [
      s.userId,
      new Date(new Date(s.lastExpires).getTime() - SESSION_MAXAGE_MS),
    ]),
  );

  const users = allUsers.map(u => ({
    ...u,
    lastActive: sessionMap.get(u.id) ?? null,
  }));

  // Bot analytics teaser — wrapped in try/catch so dashboard never breaks
  // if the plugin tables haven't been created yet on a fresh install.
  const isBotAnalyticsActive = config.modules.activePlugins?.includes("bot-analytics") ?? false;
  let botTotals: Awaited<ReturnType<typeof getBotTotals>> = [];
  let botTopPaths: Awaited<ReturnType<typeof getTopPaths>> = [];
  if (isBotAnalyticsActive) {
    try {
      [botTotals, botTopPaths] = await Promise.all([getBotTotals(30), getTopPaths(5)]);
    } catch {
      // Tables not yet created — teaser will show empty states
    }
  }

  const showUrlWarning = isDevUrl(config.site.url);

  // Show a pre-deploy checklist on Replit dev containers where PRODUCTION_URL
  // hasn't been saved as a secret yet. Disappears automatically once it's set.
  const isReplitDev = !!(
    (process.env.REPL_SLUG || process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_CLUSTER) &&
    process.env.REPLIT_DEPLOYMENT !== "1"
  );
  const showReplitDeployBanner = isReplitDev && !process.env.PRODUCTION_URL;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-800">Dashboard</h2>

      {showReplitDeployBanner && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-5">
          <p className="text-sm font-bold text-blue-900 mb-3 text-base">
            ⚠ Before you deploy — 2 required secrets
          </p>
          <p className="text-sm text-blue-800 mb-3">
            Your app is running in the Replit dev environment. Before you click Deploy,
            save these two values as Replit secrets (Tools → Secrets in the sidebar) so
            login works correctly in production:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm text-blue-800 mb-3">
            <li>
              <strong>PRODUCTION_URL</strong> — your deployment domain, e.g.{" "}
              <code className="bg-blue-100 px-1 rounded font-mono text-xs">
                https://yourapp.replit.app
              </code>
              {". "}
              Find it in Replit&apos;s deployment panel or domain settings before deploying.
            </li>
            <li>
              <strong>NEXTAUTH_SECRET</strong> — the value printed in the startup log when
              the app first ran. If your AI agent already saved this one, you&apos;re good.
            </li>
          </ol>
          <p className="text-xs text-blue-600">
            This notice disappears automatically once <code className="font-mono">PRODUCTION_URL</code> is set.
            You can also ask your AI agent: <em>&quot;Please save PRODUCTION_URL and NEXTAUTH_SECRET as Replit secrets now.&quot;</em>
          </p>
        </div>
      )}

      {showUrlWarning && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Action required before going live: set your production URL
          </p>
          <p className="text-sm text-amber-700 mb-2">
            Your site URL is currently set to <code className="bg-amber-100 px-1 rounded font-mono text-xs">{config.site.url}</code>, which is a development address.
            Authentication will not work correctly on a custom domain until <code className="bg-amber-100 px-1 rounded font-mono text-xs">NEXTAUTH_URL</code> is updated to your real URL (e.g. <code className="bg-amber-100 px-1 rounded font-mono text-xs">https://yourdomain.com</code>).
          </p>
          <p className="text-sm text-amber-700">
            <strong>To fix:</strong> update the <code className="bg-amber-100 px-1 rounded font-mono text-xs">NEXTAUTH_URL</code> environment variable in your host&apos;s secrets or environment settings to your production domain, then redeploy.
            You can ask your AI agent to do this — tell it: <em>&quot;Set NEXTAUTH_URL to https://yourdomain.com in the environment secrets.&quot;</em>
            Once set, this notice will disappear automatically.
          </p>
        </div>
      )}

      {isBotAnalyticsActive && (
        <BotAnalyticsTeaser totals={botTotals} topPaths={botTopPaths} />
      )}

      <DashboardCharts
        monthly={monthly}
        postStatus={postStatus}
        pageStatus={pageStatus}
        totalMedia={totalMediaRows.length}
        unusedMedia={unusedMediaRows.length}
        users={users}
      />
    </div>
  );
}
