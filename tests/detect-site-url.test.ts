/**
 * Unit tests for detectSiteUrl, detectSetupUrl, and isDevUrl
 * in src/lib/detect-site-url.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectSiteUrl, detectSetupUrl, isDevUrl } from "@/lib/detect-site-url";

function clearPlatformEnv() {
  delete process.env.NEXTAUTH_URL;
  delete process.env.PRODUCTION_URL;
  delete process.env.REPLIT_DEV_DOMAIN;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.RAILWAY_PUBLIC_DOMAIN;
  delete process.env.RENDER_EXTERNAL_URL;
}

// ─── detectSiteUrl ────────────────────────────────────────────────────────────

describe("detectSiteUrl", () => {
  beforeEach(clearPlatformEnv);
  afterEach(clearPlatformEnv);

  it("returns null when no platform env vars are set", () => {
    expect(detectSiteUrl()).toBeNull();
  });

  it("returns NEXTAUTH_URL when set", () => {
    process.env.NEXTAUTH_URL = "https://example.com";
    expect(detectSiteUrl()).toBe("https://example.com");
  });

  it("NEXTAUTH_URL takes priority over all other vars", () => {
    process.env.NEXTAUTH_URL = "https://explicit.com";
    process.env.REPLIT_DEV_DOMAIN = "myapp.replit.dev";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "prod.vercel.app";
    expect(detectSiteUrl()).toBe("https://explicit.com");
  });

  it("prepends https:// to REPLIT_DEV_DOMAIN", () => {
    process.env.REPLIT_DEV_DOMAIN = "myapp.user.replit.dev";
    expect(detectSiteUrl()).toBe("https://myapp.user.replit.dev");
  });

  it("prepends https:// to VERCEL_PROJECT_PRODUCTION_URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "myapp.vercel.app";
    expect(detectSiteUrl()).toBe("https://myapp.vercel.app");
  });

  it("REPLIT_DEV_DOMAIN takes priority over VERCEL_PROJECT_PRODUCTION_URL", () => {
    process.env.REPLIT_DEV_DOMAIN = "myapp.replit.dev";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "myapp.vercel.app";
    expect(detectSiteUrl()).toBe("https://myapp.replit.dev");
  });

  it("prepends https:// to RAILWAY_PUBLIC_DOMAIN", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "myapp.up.railway.app";
    expect(detectSiteUrl()).toBe("https://myapp.up.railway.app");
  });

  it("returns RENDER_EXTERNAL_URL as-is (already includes https://)", () => {
    process.env.RENDER_EXTERNAL_URL = "https://myapp.onrender.com";
    expect(detectSiteUrl()).toBe("https://myapp.onrender.com");
  });

  it("RAILWAY_PUBLIC_DOMAIN takes priority over RENDER_EXTERNAL_URL", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "myapp.up.railway.app";
    process.env.RENDER_EXTERNAL_URL = "https://myapp.onrender.com";
    expect(detectSiteUrl()).toBe("https://myapp.up.railway.app");
  });
});

// ─── detectSetupUrl ───────────────────────────────────────────────────────────
//
// Same as detectSiteUrl but PRODUCTION_URL beats REPLIT_DEV_DOMAIN so the
// /setup wizard pre-fills with the production URL on Replit dev containers.

describe("detectSetupUrl", () => {
  beforeEach(clearPlatformEnv);
  afterEach(clearPlatformEnv);

  it("returns null when no env vars are set", () => {
    expect(detectSetupUrl()).toBeNull();
  });

  it("returns NEXTAUTH_URL when set (explicit override wins)", () => {
    process.env.NEXTAUTH_URL = "https://explicit.com";
    expect(detectSetupUrl()).toBe("https://explicit.com");
  });

  it("PRODUCTION_URL beats REPLIT_DEV_DOMAIN", () => {
    process.env.PRODUCTION_URL = "https://myapp.replit.app";
    process.env.REPLIT_DEV_DOMAIN = "myapp.user.replit.dev";
    expect(detectSetupUrl()).toBe("https://myapp.replit.app");
  });

  it("prepends https:// to PRODUCTION_URL when missing", () => {
    process.env.PRODUCTION_URL = "myapp.replit.app";
    expect(detectSetupUrl()).toBe("https://myapp.replit.app");
  });

  it("does not double-prepend https:// to PRODUCTION_URL", () => {
    process.env.PRODUCTION_URL = "https://myapp.replit.app";
    expect(detectSetupUrl()).toBe("https://myapp.replit.app");
  });

  it("NEXTAUTH_URL beats PRODUCTION_URL", () => {
    process.env.NEXTAUTH_URL = "https://dev.replit.dev";
    process.env.PRODUCTION_URL = "https://myapp.replit.app";
    expect(detectSetupUrl()).toBe("https://dev.replit.dev");
  });

  it("falls back to REPLIT_DEV_DOMAIN when PRODUCTION_URL absent", () => {
    process.env.REPLIT_DEV_DOMAIN = "myapp.user.replit.dev";
    expect(detectSetupUrl()).toBe("https://myapp.user.replit.dev");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "myapp.vercel.app";
    expect(detectSetupUrl()).toBe("https://myapp.vercel.app");
  });

  it("falls back to RAILWAY_PUBLIC_DOMAIN", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "myapp.up.railway.app";
    expect(detectSetupUrl()).toBe("https://myapp.up.railway.app");
  });

  it("falls back to RENDER_EXTERNAL_URL as-is", () => {
    process.env.RENDER_EXTERNAL_URL = "https://myapp.onrender.com";
    expect(detectSetupUrl()).toBe("https://myapp.onrender.com");
  });
});

// ─── isDevUrl ────────────────────────────────────────────────────────────────

describe("isDevUrl", () => {
  it("identifies http://localhost:3000 as a dev URL", () => {
    expect(isDevUrl("http://localhost:3000")).toBe(true);
  });

  it("identifies https://localhost as a dev URL", () => {
    expect(isDevUrl("https://localhost")).toBe(true);
  });

  it("identifies http://127.0.0.1:3000 as a dev URL", () => {
    expect(isDevUrl("http://127.0.0.1:3000")).toBe(true);
  });

  it("identifies a .replit.dev URL as a dev URL", () => {
    expect(isDevUrl("https://myapp.user.replit.dev")).toBe(true);
  });

  it("identifies a .repl.co URL as a dev URL", () => {
    expect(isDevUrl("https://myapp.user.repl.co")).toBe(true);
  });

  it("does not flag a real production domain as a dev URL", () => {
    expect(isDevUrl("https://example.com")).toBe(false);
  });

  it("does not flag a Vercel production URL as a dev URL", () => {
    expect(isDevUrl("https://myapp.vercel.app")).toBe(false);
  });

  it("does not flag a Railway URL as a dev URL", () => {
    expect(isDevUrl("https://myapp.up.railway.app")).toBe(false);
  });

  it("does not flag a Render URL as a dev URL", () => {
    expect(isDevUrl("https://myapp.onrender.com")).toBe(false);
  });

  it("does not flag a custom domain as a dev URL", () => {
    expect(isDevUrl("https://pugmillcms.com")).toBe(false);
  });
});
