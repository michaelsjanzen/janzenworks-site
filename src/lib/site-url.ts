/**
 * Utilities for constructing absolute URLs in metadata.
 *
 * Two problems are solved here:
 *
 * 1. resolveSiteUrl — NEXTAUTH_URL can be "http://localhost:XXXX" in Replit
 *    dev containers even after a production deployment because the env var is
 *    shared between dev and prod containers.  When that happens we fall back to
 *    config.site.url, which was entered by the user during setup and should
 *    reflect the real production domain.
 *
 * 2. toAbsoluteUrl — media URLs stored in the DB are always relative
 *    ("/uploads/…") because LocalStorageProvider returns paths, not absolute
 *    URLs.  og:image / twitter:image MUST be absolute, so we prefix siteUrl.
 *    If a user ever stored an absolute localhost URL (e.g. by pasting a dev
 *    preview URL into the OG image field), we normalise it too.
 */

export function resolveSiteUrl(nextAuthUrl: string, configSiteUrl: string): string {
  const isLocalhost = (u: string) => {
    try {
      const h = new URL(u).hostname;
      return h === "localhost" || h === "127.0.0.1";
    } catch {
      return false;
    }
  };
  if (!isLocalhost(nextAuthUrl)) return nextAuthUrl;
  if (configSiteUrl && !isLocalhost(configSiteUrl)) return configSiteUrl;
  return nextAuthUrl; // both are localhost — dev environment, return as-is
}

/**
 * Convert any URL to an absolute form using siteUrl.
 * - Relative paths (/uploads/…) → prepend siteUrl
 * - Absolute localhost URLs        → replace origin with siteUrl
 * - Other absolute URLs            → return unchanged
 * - null / empty                   → return null
 */
export function toAbsoluteUrl(url: string | null | undefined, siteUrl: string): string | null {
  if (!url || !url.trim()) return null;
  if (url.startsWith("/")) return `${siteUrl}${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${siteUrl}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return null;
  }
  return url;
}
