import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getConfig } from "@/lib/config";
import { auditLog } from "@/lib/audit-log";
import { checkApiRateLimit } from "@/lib/rate-limit";
import {
  alreadySubmitted,
  buildPayload,
  sendReport,
  recordSubmission,
} from "@/lib/network-report";

/**
 * GET /api/cron/report-network
 *
 * Sends yesterday's bot-visit data to the AEO Intelligence Network
 * (aeopugmill.com) if the site has opted in and the bot-analytics plugin
 * is active.
 *
 * Secured with a Bearer token matching CRON_SECRET.
 * Vercel calls this automatically at 02:00 UTC via vercel.json cron config.
 * For self-hosted installs:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yoursite.com/api/cron/report-network
 */
export async function GET(req: NextRequest) {
  const limited = checkApiRateLimit(req);
  if (limited) return limited;

  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  const valid =
    authBuf.length === expectedBuf.length &&
    timingSafeEqual(authBuf, expectedBuf);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Config check ────────────────────────────────────────────────────────────
  const config = await getConfig();

  if (!config.network?.participateInNetwork) {
    console.log("[CronJob] report-network: participation disabled, skipping.");
    return NextResponse.json({ skipped: "participation_disabled" });
  }

  const networkToken = config.network.networkToken?.trim();
  if (!networkToken) {
    console.warn("[CronJob] report-network: no network token configured, skipping.");
    return NextResponse.json({ skipped: "no_network_token" });
  }

  // ── Date: yesterday UTC ─────────────────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

  // ── Idempotency ─────────────────────────────────────────────────────────────
  if (await alreadySubmitted(date)) {
    console.log(`[CronJob] report-network: already submitted for ${date}, skipping.`);
    return NextResponse.json({ skipped: "already_submitted", date });
  }

  // ── Build payload ───────────────────────────────────────────────────────────
  const siteUrl = config.site.url;
  const result = await buildPayload(siteUrl, date);

  if ("skip" in result) {
    await recordSubmission(date, "skipped", undefined, result.skip);
    void auditLog({ action: "network.report_skipped", detail: `date=${date} reason=${result.skip}` });
    console.log(`[CronJob] report-network: skipped for ${date} — ${result.skip}`);
    return NextResponse.json({ skipped: result.skip, date });
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  let responseCode: number | undefined;
  try {
    responseCode = await sendReport(result.payload, networkToken);

    const ok = responseCode >= 200 && responseCode < 300;
    await recordSubmission(date, ok ? "ok" : "error", responseCode, ok ? undefined : `HTTP ${responseCode}`);

    void auditLog({
      action: ok ? "network.report_sent" : "network.report_error",
      detail: `date=${date} status=${responseCode}`,
    });

    console.log(`[CronJob] report-network: ${ok ? "sent" : "error"} for ${date} — HTTP ${responseCode}`);
    return NextResponse.json({ date, status: responseCode, ok });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await recordSubmission(date, "error", responseCode, msg);
    void auditLog({ action: "network.report_error", detail: `date=${date} error=${msg}` });
    console.error(`[CronJob] report-network: network error for ${date} —`, err);
    return NextResponse.json({ date, error: msg }, { status: 502 });
  }
}
