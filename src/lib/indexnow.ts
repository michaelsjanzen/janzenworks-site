import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

// In-memory throttle — one ping burst per 30 minutes per process.
// Acceptable for single-process Node; multi-worker worst case is N pings, which IndexNow tolerates.
let lastPingMs = 0;
const THROTTLE_MS = 30 * 60 * 1000;

/**
 * Return the site's IndexNow verification key, generating and storing it on first call.
 * The key is a random 32-character hex string stored in the settings table.
 */
export async function getIndexNowKey(): Promise<string> {
  const rows = await db.select().from(settings).where(eq(settings.key, "indexnow_key")).limit(1);
  if (rows[0]) return rows[0].value;

  const key = randomBytes(16).toString("hex");
  await db.insert(settings)
    .values({ key: "indexnow_key", value: key })
    .onConflictDoNothing();

  // Re-fetch — handles the case where a concurrent request won the insert race.
  const stored = await db.select().from(settings).where(eq(settings.key, "indexnow_key")).limit(1);
  return stored[0].value;
}

/**
 * Ping IndexNow to notify search engines that a URL has been updated.
 * Throttled to one burst per 30 minutes. Non-fatal — failures are logged and swallowed.
 */
export async function pingIndexNow(postUrl: string, siteUrl: string): Promise<void> {
  const now = Date.now();
  if (now - lastPingMs < THROTTLE_MS) return;
  lastPingMs = now;

  try {
    const key = await getIndexNowKey();
    const keyLocation = `${siteUrl}/api/indexnow-key`;
    const pingUrl =
      `https://api.indexnow.org/indexnow` +
      `?url=${encodeURIComponent(postUrl)}` +
      `&key=${encodeURIComponent(key)}` +
      `&keyLocation=${encodeURIComponent(keyLocation)}`;

    await fetch(pingUrl, { signal: AbortSignal.timeout(5000) });
  } catch (err) {
    console.warn("[IndexNow] Ping failed (non-fatal):", err);
  }
}
