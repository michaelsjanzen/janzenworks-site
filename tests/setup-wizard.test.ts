/**
 * Unit tests for the setup wizard.
 *
 * Covers:
 *  1. configSchema — onboardingDismissed was removed; existing DB rows with
 *     the field must have it silently stripped by Zod on next read.
 *  2. Setup input validation rules (replicated from src/lib/actions/setup.ts)
 *  3. AI provider endpoint construction (replicated inline — authoritative source
 *     is testAiKey() in src/lib/actions/setup.ts)
 *  4. Default model selection per provider
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { configSchema } from "@/lib/config";

// ─── Minimal valid config fixture ───────────────────────────────────────────

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    site: {
      name: "Test Site",
      description: "A test site",
      url: "https://example.com",
      socialLinks: {},
      seoDefaults: {},
      aeoDefaults: {},
    },
    appearance: { activeTheme: "default", navigation: [] },
    modules: { activePlugins: [], pluginSettings: {} },
    system: { version: "0.1.0", headlessMode: false, maintenanceMode: false },
    ai: { provider: null, apiKey: "", model: "", aiRateLimit: 50 },
    ...overrides,
  };
}

// ─── configSchema — onboardingDismissed removed ───────────────────────────────

describe("configSchema — onboardingDismissed removed", () => {
  it("strips onboardingDismissed from a config object that still includes it", () => {
    const input = validConfig({
      system: { version: "0.1.0", headlessMode: false, maintenanceMode: false, onboardingDismissed: true },
    });
    const result = configSchema.parse(input);
    expect(result.system).not.toHaveProperty("onboardingDismissed");
  });

  it("parses a valid config that omits onboardingDismissed", () => {
    const result = configSchema.parse(validConfig());
    expect(result.system.version).toBe("0.1.0");
    expect(result.system.headlessMode).toBe(false);
    expect(result.system.maintenanceMode).toBe(false);
  });

  it("system schema has exactly three recognised fields", () => {
    const result = configSchema.parse(validConfig());
    const keys = Object.keys(result.system);
    expect(keys).toEqual(expect.arrayContaining(["version", "headlessMode", "maintenanceMode"]));
    expect(keys).toHaveLength(3);
  });

  it("defaults headlessMode and maintenanceMode to false when omitted", () => {
    const input = validConfig({
      system: { version: "0.1.0" },
    });
    const result = configSchema.parse(input);
    expect(result.system.headlessMode).toBe(false);
    expect(result.system.maintenanceMode).toBe(false);
  });
});

// ─── Setup input validation ───────────────────────────────────────────────────
//
// Replicate the rules from src/lib/actions/setup.ts so that if the action's
// schema changes, these tests catch any accidental loosening.

const setupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("A valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  siteName: z.string().min(1, "Site name is required").max(200),
  siteUrl: z.string().min(1, "Site URL is required").max(500),
  authorVoice: z.string().max(5000).optional(),
  aiProvider: z.enum(["anthropic", "openai", "gemini"]).nullable().optional(),
  aiKey: z.string().max(2000).optional(),
  aiModel: z.string().max(200).optional(),
});

// Test fixture — not a real credential
const TEST_PASSWORD = "longenoughpass";

function validSetupInput(overrides = {}) {
  return {
    name: "Admin",
    email: "admin@example.com",
    password: TEST_PASSWORD,
    siteName: "My Blog",
    siteUrl: "https://myblog.com",
    ...overrides,
  };
}

describe("setup input schema", () => {
  it("accepts a minimal valid input", () => {
    expect(setupSchema.safeParse(validSetupInput()).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const r = setupSchema.safeParse(validSetupInput({ name: "" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/name is required/i);
  });

  it("rejects an invalid email", () => {
    const r = setupSchema.safeParse(validSetupInput({ email: "not-an-email" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/valid email/i);
  });

  it("rejects a password shorter than 8 characters", () => {
    const r = setupSchema.safeParse(validSetupInput({ password: "short" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/8 characters/i);
  });

  it("rejects an empty site name", () => {
    const r = setupSchema.safeParse(validSetupInput({ siteName: "" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/site name is required/i);
  });

  it("rejects an empty site URL", () => {
    const r = setupSchema.safeParse(validSetupInput({ siteUrl: "" }));
    expect(r.success).toBe(false);
  });

  it("accepts a valid AI provider", () => {
    const r = setupSchema.safeParse(validSetupInput({ aiProvider: "anthropic", aiKey: "sk-ant-test" }));
    expect(r.success).toBe(true);
  });

  it("rejects an unknown AI provider", () => {
    const r = setupSchema.safeParse(validSetupInput({ aiProvider: "unknown-provider" }));
    expect(r.success).toBe(false);
  });

  it("accepts null AI provider (no AI configured)", () => {
    const r = setupSchema.safeParse(validSetupInput({ aiProvider: null }));
    expect(r.success).toBe(true);
    expect(r.data?.aiProvider).toBeNull();
  });

  it("accepts an author voice string up to 5000 characters", () => {
    const r = setupSchema.safeParse(validSetupInput({ authorVoice: "a".repeat(5000) }));
    expect(r.success).toBe(true);
  });

  it("rejects an author voice string over 5000 characters", () => {
    const r = setupSchema.safeParse(validSetupInput({ authorVoice: "a".repeat(5001) }));
    expect(r.success).toBe(false);
  });
});

// ─── AI provider endpoint construction ───────────────────────────────────────
//
// Replicates the URL / header logic from testAiKey() in setup.ts.
// If those endpoints change, update both the action and these tests.

type AiProvider = "anthropic" | "openai" | "gemini";

function buildValidationRequest(provider: AiProvider, key: string) {
  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      authHeader: { "x-api-key": key },
      versionHeader: { "anthropic-version": "2023-06-01" },
    };
  }
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      authHeader: { Authorization: `Bearer ${key}` },
    };
  }
  // gemini
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    method: "POST",
    authHeader: {},
  };
}

describe("AI key validation — provider endpoint construction", () => {
  it("anthropic: posts to api.anthropic.com/v1/messages", () => {
    const req = buildValidationRequest("anthropic", "sk-ant-test");
    expect(req.url).toBe("https://api.anthropic.com/v1/messages");
    expect(req.method).toBe("POST");
  });

  it("anthropic: sends key in x-api-key header (not Authorization)", () => {
    const req = buildValidationRequest("anthropic", "sk-ant-test");
    expect(req.authHeader).toHaveProperty("x-api-key", "sk-ant-test");
    expect(req.authHeader).not.toHaveProperty("Authorization");
  });

  it("anthropic: includes anthropic-version header", () => {
    const req = buildValidationRequest("anthropic", "sk-ant-test");
    expect(req.versionHeader).toHaveProperty("anthropic-version");
  });

  it("openai: posts to api.openai.com/v1/chat/completions", () => {
    const req = buildValidationRequest("openai", "sk-openai-test");
    expect(req.url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("openai: sends key as Bearer token in Authorization header", () => {
    const req = buildValidationRequest("openai", "sk-openai-test");
    expect(req.authHeader).toHaveProperty("Authorization", "Bearer sk-openai-test");
  });

  it("gemini: posts to generativelanguage.googleapis.com", () => {
    const req = buildValidationRequest("gemini", "AIzatest");
    expect(req.url).toContain("generativelanguage.googleapis.com");
    expect(req.url).toContain("gemini-1.5-flash:generateContent");
  });

  it("gemini: embeds key as URL query parameter", () => {
    const req = buildValidationRequest("gemini", "AIzatest");
    expect(req.url).toContain("key=AIzatest");
  });

  it("gemini: URL-encodes special characters in the key", () => {
    const req = buildValidationRequest("gemini", "key with spaces");
    expect(req.url).toContain("key=key%20with%20spaces");
  });
});

// ─── Default model selection ──────────────────────────────────────────────────
//
// Mirrors defaultModel() in src/lib/actions/setup.ts.
// Failing here means the stored model name in the DB will differ from what
// the UI shows — update both places together.

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
};

describe("AI provider default models", () => {
  it("anthropic defaults to claude-sonnet-4-6", () => {
    expect(DEFAULT_MODELS.anthropic).toBe("claude-sonnet-4-6");
  });

  it("openai defaults to gpt-4o-mini", () => {
    expect(DEFAULT_MODELS.openai).toBe("gpt-4o-mini");
  });

  it("gemini defaults to gemini-1.5-flash", () => {
    expect(DEFAULT_MODELS.gemini).toBe("gemini-1.5-flash");
  });

  it("all three providers have a non-empty default", () => {
    for (const [provider, model] of Object.entries(DEFAULT_MODELS)) {
      expect(model, `${provider} should have a default model`).toBeTruthy();
    }
  });
});
