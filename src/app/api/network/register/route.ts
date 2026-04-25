import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { buildSiteHash } from "@/lib/network-report";

/**
 * POST /api/network/register
 *
 * Server-side proxy for the aeopugmill.com CMS registration endpoint.
 * The browser calls this same-origin route; this route calls aeopugmill.com
 * server-to-server, avoiding any CORS preflight issues entirely.
 *
 * No body required — the site_hash is derived server-side from config.site.url.
 */
export async function POST(req: NextRequest) {
  try {
    const config = await getConfig();
    const siteHash = buildSiteHash(config.site.url);

    const upstream = await fetch("https://www.aeopugmill.com/api/cms/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ site_hash: siteHash }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? `Registration failed (HTTP ${upstream.status})` },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
