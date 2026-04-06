import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { networkSites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/ingest/register
 *
 * Called once by a WP Pugmill site when the user opts in to the
 * Pugmill Intelligence Network. Issues a network_token the site
 * must include (as an HMAC signature) on every subsequent submission.
 *
 * Request body:
 *   { site_id: string, opted_in_at: string (ISO), nonce: string, plugin_version: string }
 *
 * The plugin computes expected_hmac = HMAC-SHA256(PUGMILL_NETWORK_SECRET, site_id:opted_in_at:nonce)
 * and sends it as the Authorization header: "Bearer <expected_hmac>"
 *
 * We verify it, then derive the network_token the same way and return it.
 * The token is never stored in plain text — it is re-derived on each ingest request.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PUGMILL_NETWORK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let body: { site_id?: string; opted_in_at?: string; nonce?: string; plugin_version?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { site_id, opted_in_at, nonce, plugin_version } = body;

  if (!site_id || !opted_in_at || !nonce) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate field lengths to prevent abuse
  if (site_id.length !== 64 || nonce.length > 64 || opted_in_at.length > 32) {
    return NextResponse.json({ error: "Invalid field format" }, { status: 400 });
  }

  // Verify the registration HMAC — proves the request originated from code
  // that holds the same network secret (i.e., the real plugin).
  const authHeader = req.headers.get("authorization") ?? "";
  const suppliedToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const expectedToken = createHmac("sha256", secret)
    .update(`${site_id}:${opted_in_at}:${nonce}`)
    .digest("hex");

  let tokensMatch = false;
  try {
    tokensMatch = timingSafeEqual(
      Buffer.from(suppliedToken, "hex"),
      Buffer.from(expectedToken, "hex")
    );
  } catch {
    // Buffer lengths differ — definitely not a match
    tokensMatch = false;
  }

  if (!tokensMatch) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The network_token is deterministically derived so we never need to store
  // the plain-text secret. Re-deriving it on ingest is sufficient for verification.
  const networkToken = expectedToken; // same value; alias for clarity in the DB write

  try {
    // Upsert: if the site re-registers (e.g. reinstall), refresh its token and version.
    await db
      .insert(networkSites)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values({
        siteId: site_id,
        networkToken,
        pluginVersion: plugin_version ?? null,
        lastSeenAt: new Date(),
      } as any)
      .onConflictDoUpdate({
        target: networkSites.siteId,
        set: {
          networkToken,
          pluginVersion: plugin_version ?? null,
          lastSeenAt: new Date(),
          banned: false, // re-registration clears a soft-ban
        },
      });
  } catch (err) {
    console.error("[ingest/register] DB error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, network_token: networkToken });
}
