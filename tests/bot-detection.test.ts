import { describe, it, expect } from "vitest";
import { detectBot, BOT_PATTERNS } from "../src/lib/bot-detection";

describe("BOT_PATTERNS — split bots have distinct canonical names", () => {
  const getCanonical = (ua: string): string | null => {
    for (const { pattern, canonical } of BOT_PATTERNS) {
      if (pattern.test(ua)) return canonical;
    }
    return null;
  };

  it("GPTBot resolves to 'GPTBot'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)")).toBe("GPTBot");
  });
  it("OAI-SearchBot resolves to 'OAI-SearchBot'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; OAI-SearchBot/1.0)")).toBe("OAI-SearchBot");
  });
  it("ChatGPT-User resolves to 'ChatGPT-User'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; ChatGPT-User/1.0)")).toBe("ChatGPT-User");
  });
  it("ClaudeBot resolves to 'ClaudeBot'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; ClaudeBot/1.0)")).toBe("ClaudeBot");
  });
  it("Claude-User resolves to 'Claude-User'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; Claude-User/1.0)")).toBe("Claude-User");
  });
  it("anthropic-ai resolves to 'anthropic-ai'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; anthropic-ai/1.0)")).toBe("anthropic-ai");
  });
  it("PerplexityBot resolves to 'PerplexityBot'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; PerplexityBot/1.0)")).toBe("PerplexityBot");
  });
  it("Perplexity-User resolves to 'Perplexity-User'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; Perplexity-User/1.0)")).toBe("Perplexity-User");
  });
  it("Applebot resolves to 'Applebot'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; Applebot/0.1)")).toBe("Applebot");
  });
  it("Applebot-Extended resolves to 'Applebot-Extended'", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; Applebot-Extended/0.1)")).toBe("Applebot-Extended");
  });
  it("Googlebot resolves correctly", () => {
    expect(getCanonical("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("Googlebot");
  });
  it("regular browser returns null", () => {
    expect(getCanonical("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")).toBeNull();
  });
  it("empty UA returns null", () => {
    expect(getCanonical("")).toBeNull();
  });
});

describe("detectBot", () => {
  it("returns null for a regular browser UA", () => {
    expect(detectBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")).toBeNull();
  });
  it("returns the canonical name string for a known bot", () => {
    
    expect(detectBot("Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)")).toBe("GPTBot");
  });
});
