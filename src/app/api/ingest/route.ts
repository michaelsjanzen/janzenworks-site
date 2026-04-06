import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { networkSites, networkSubmissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/ingest
 *
 * Accepts a daily bot-analytics submission from a registered WP Pugmill site.
 *
 * Expected headers:
 *   Authorization: Bearer <submission_hmac>
 *   Content-Type: application/json
 *
 * Expected body:
 *   {
 *     site_id:        string  (SHA-256 of home_url + instance_id)
 *     date:           string  (YYYY-MM-DD, yesterday)
 *     plugin_version: string
 *     aeo_tier:       number  (0 | 1 | 2)
 *     bots:           object  ({ BotName: { resource_slug: count } })
 *     network_token:  string  (token received at registration)
 *   }
 *
 * submission_hmac = HMAC-SHA256(network_token, site_id:date:plugin_version)
 *
 * Security layers:
 *  1. HMAC verification — only sites holding their network_token can sign a valid submission
 *  2. Banned-site check — soft-ban via the network_sites table
 *  3. Unique (site_id, date) constraint — DB rejects duplicate submissions silently
 *  4. Outlier detection — flag sites submitting unrealistically high bot counts
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PUGMILL_NETWORK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let body: {
    site_id?: string;
    date?: string;
    plugin_version?: string;
    aeo_tier?: number;
    bots?: Record<string, Record<string, number>>;
    network_token?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { site_id, date, plugin_version, aeo_tier, bots, network_token } = body;

  if (!site_id || !date || !bots || !network_token) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Basic format guards
  if (
    site_id.length !== 64 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    network_token.length !== 64
  ) {
    return NextResponse.json({ error: "Invalid field format" }, { status: 400 });
  }

  // Verify submission HMAC
  const authHeader = req.headers.get("authorization") ?? "";
  const suppliedHmac = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const expectedHmac = createHmac("sha256", network_token)
    .update(`${site_id}:${date}:${plugin_version ?? ""}`)
    .digest("hex");

  let hmacValid = false;
  try {
    hmacValid = timingSafeEqual(
      Buffer.from(suppliedHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    hmacValid = false;
  }

  if (!hmacValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up registered site and verify the stored token matches
  const [site] = await db
    .select()
    .from(networkSites)
    .where(eq(networkSites.siteId, site_id))
    .limit(1);

  if (!site) {
    // Not registered — ask the plugin to re-register
    return NextResponse.json({ error: "Site not registered", reregister: true }, { status: 403 });
  }

  if (site.banned) {
    return NextResponse.json({ error: "Site suspended" }, { status: 403 });
  }

  // Constant-time comparison of stored token vs submitted token
  let tokenValid = false;
  try {
    tokenValid = timingSafeEqual(
      Buffer.from(site.networkToken, "hex"),
      Buffer.from(network_token, "hex")
    );
  } catch {
    tokenValid = false;
  }

  if (!tokenValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Outlier detection: flag if total bot hits exceed a plausible daily maximum.
  // 50,000 hits/day across all bots is already extremely high for a single site.
  const totalHits = Object.values(bots).reduce(
    (sum, resources) =>
      sum + Object.values(resources).reduce((s, n) => s + (typeof n === "number" ? n : 0), 0),
    0
  );
  if (totalHits > 50_000) {
    // Soft-ban and reject without explanation
    await db
      .update(networkSites)
      .set({ banned: true })
      .where(eq(networkSites.siteId, site_id));
    return NextResponse.json({ error: "Submission rejected" }, { status: 422 });
  }

  // Persist submission — unique constraint on (site_id, date) silently drops duplicates
  try {
    await db
      .insert(networkSubmissions)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values({
        siteId: site_id,
        date,
        pluginVersion: plugin_version ?? null,
        aeoTier: typeof aeo_tier === "number" ? aeo_tier : 0,
        bots,
      } as any)
      .onConflictDoNothing();

    // Update last_seen timestamp and plugin version on the site record
    await db
      .update(networkSites)
      .set({ lastSeenAt: new Date(), pluginVersion: plugin_version ?? null })
      .where(eq(networkSites.siteId, site_id));
  } catch (err) {
    console.error("[ingest] DB error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
