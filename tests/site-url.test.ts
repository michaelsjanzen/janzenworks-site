/**
 * Unit tests for resolveSiteUrl and toAbsoluteUrl in src/lib/site-url.ts.
 *
 * Covers the og:image / canonical URL normalisation layer that prevents
 * localhost addresses from leaking into production metadata (a common issue
 * on Replit where NEXTAUTH_URL is shared between dev and prod containers).
 */
import { describe, it, expect } from "vitest";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

// ─── resolveSiteUrl ───────────────────────────────────────────────────────────

describe("resolveSiteUrl", () => {
  it("returns nextAuthUrl when it is a real production domain", () => {
    expect(resolveSiteUrl("https://example.com", "https://config.com")).toBe("https://example.com");
  });

  it("falls back to configSiteUrl when nextAuthUrl is localhost", () => {
    expect(resolveSiteUrl("http://localhost:3000", "https://mypugmill.com")).toBe("https://mypugmill.com");
  });

  it("falls back to configSiteUrl when nextAuthUrl is 127.0.0.1", () => {
    expect(resolveSiteUrl("http://127.0.0.1:5000", "https://mypugmill.com")).toBe("https://mypugmill.com");
  });

  it("returns nextAuthUrl as-is when both URLs are localhost (dev environment)", () => {
    expect(resolveSiteUrl("http://localhost:3000", "http://localhost:5000")).toBe("http://localhost:3000");
  });

  it("returns nextAuthUrl as-is when configSiteUrl is empty", () => {
    expect(resolveSiteUrl("http://localhost:3000", "")).toBe("http://localhost:3000");
  });

  it("returns nextAuthUrl as-is when configSiteUrl is also localhost", () => {
    expect(resolveSiteUrl("http://localhost:5000", "http://127.0.0.1:5000")).toBe("http://localhost:5000");
  });

  it("uses NEXTAUTH_URL port 5000 pattern (Replit dev container leak scenario)", () => {
    // Replit dev runs on :5000; if that leaks into prod the config.site.url should win
    expect(resolveSiteUrl("http://localhost:5000", "https://pugmillcms.com")).toBe("https://pugmillcms.com");
  });

  it("prefers nextAuthUrl over configSiteUrl when both are non-localhost", () => {
    expect(resolveSiteUrl("https://auth.example.com", "https://config.example.com")).toBe("https://auth.example.com");
  });

  it("handles malformed nextAuthUrl gracefully — falls back to configSiteUrl", () => {
    // new URL() throws → isLocalhost returns false → nextAuthUrl is returned as-is
    // (a malformed URL won't be treated as localhost)
    const result = resolveSiteUrl("not-a-url", "https://fallback.com");
    // not-a-url doesn't parse as localhost so it's returned unchanged
    expect(result).toBe("not-a-url");
  });
});

// ─── toAbsoluteUrl ────────────────────────────────────────────────────────────

describe("toAbsoluteUrl", () => {
  const PROD = "https://mypugmill.com";

  // ── null / empty inputs ────────────────────────────────────────────────────

  it("returns null for null input", () => {
    expect(toAbsoluteUrl(null, PROD)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(toAbsoluteUrl(undefined, PROD)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toAbsoluteUrl("", PROD)).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(toAbsoluteUrl("   ", PROD)).toBeNull();
  });

  // ── relative paths ─────────────────────────────────────────────────────────

  it("prepends siteUrl to a relative /uploads/… path", () => {
    expect(toAbsoluteUrl("/uploads/image.png", PROD)).toBe("https://mypugmill.com/uploads/image.png");
  });

  it("prepends siteUrl to any relative path starting with /", () => {
    expect(toAbsoluteUrl("/some/path/file.jpg", PROD)).toBe("https://mypugmill.com/some/path/file.jpg");
  });

  // ── localhost absolute URLs ────────────────────────────────────────────────

  it("replaces localhost:3000 origin with siteUrl", () => {
    expect(toAbsoluteUrl("http://localhost:3000/uploads/logo.png", PROD)).toBe("https://mypugmill.com/uploads/logo.png");
  });

  it("replaces localhost:5000 origin with siteUrl (Replit dev port)", () => {
    expect(toAbsoluteUrl("http://localhost:5000/uploads/image.png", PROD)).toBe("https://mypugmill.com/uploads/image.png");
  });

  it("replaces 127.0.0.1 origin with siteUrl", () => {
    expect(toAbsoluteUrl("http://127.0.0.1:3000/uploads/file.jpg", PROD)).toBe("https://mypugmill.com/uploads/file.jpg");
  });

  it("preserves query string when replacing localhost origin", () => {
    expect(toAbsoluteUrl("http://localhost:3000/uploads/img.png?v=2", PROD)).toBe("https://mypugmill.com/uploads/img.png?v=2");
  });

  // ── proper absolute URLs ───────────────────────────────────────────────────

  it("returns a proper https URL unchanged", () => {
    expect(toAbsoluteUrl("https://cdn.example.com/image.png", PROD)).toBe("https://cdn.example.com/image.png");
  });

  it("returns a Cloudinary URL unchanged", () => {
    const cdn = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
    expect(toAbsoluteUrl(cdn, PROD)).toBe(cdn);
  });

  it("returns an S3 URL unchanged", () => {
    const s3 = "https://my-bucket.s3.amazonaws.com/uploads/photo.jpg";
    expect(toAbsoluteUrl(s3, PROD)).toBe(s3);
  });

  // ── end-to-end: og:image construction ─────────────────────────────────────

  it("full chain: localhost NEXTAUTH_URL + relative media URL → correct prod og:image", () => {
    const siteUrl = resolveSiteUrl("http://localhost:5000", "https://pugmillcms.com");
    const ogImage = toAbsoluteUrl("/uploads/1775063254293-pugmill-logo.png", siteUrl);
    expect(ogImage).toBe("https://pugmillcms.com/uploads/1775063254293-pugmill-logo.png");
  });

  it("full chain: localhost NEXTAUTH_URL + stored absolute localhost URL → correct prod og:image", () => {
    const siteUrl = resolveSiteUrl("http://localhost:5000", "https://pugmillcms.com");
    const ogImage = toAbsoluteUrl("http://localhost:5000/uploads/1775063254293-pugmill-logo.png", siteUrl);
    expect(ogImage).toBe("https://pugmillcms.com/uploads/1775063254293-pugmill-logo.png");
  });

  it("full chain: correct NEXTAUTH_URL + relative media URL → correct prod og:image", () => {
    const siteUrl = resolveSiteUrl("https://pugmillcms.com", "");
    const ogImage = toAbsoluteUrl("/uploads/logo.png", siteUrl);
    expect(ogImage).toBe("https://pugmillcms.com/uploads/logo.png");
  });
});
