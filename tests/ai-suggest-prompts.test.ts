/**
 * Unit tests for buildSystemPrompt in src/app/api/ai/suggest/route.ts.
 *
 * Covers the updated "titles" format (Curiosity + Utility JSON object) and
 * the new "swap-passage" type added in the March 2026 sync with WPPugmill.
 */
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai-suggest-prompts";

// ─── titles ───────────────────────────────────────────────────────────────────

describe('buildSystemPrompt("titles")', () => {
  it("requests exactly 2 variants", () => {
    const prompt = buildSystemPrompt("titles", "");
    expect(prompt).toMatch(/exactly 2/i);
  });

  it('labels the variants "Curiosity" and "Utility"', () => {
    const prompt = buildSystemPrompt("titles", "");
    expect(prompt).toMatch(/curiosity/i);
    expect(prompt).toMatch(/utility/i);
  });

  it("specifies a JSON object return shape with curiosity and utility keys", () => {
    const prompt = buildSystemPrompt("titles", "");
    expect(prompt).toMatch(/\{.*curiosity.*:.*utility.*\}/i);
  });

  it("does not mention a JSON array", () => {
    const prompt = buildSystemPrompt("titles", "");
    expect(prompt).not.toMatch(/json array/i);
  });

  it("includes the author voice clause when provided", () => {
    const prompt = buildSystemPrompt("titles", "Write in a casual, friendly tone.");
    expect(prompt).toMatch(/casual, friendly tone/);
  });

  it("omits the voice clause when author voice is empty", () => {
    const prompt = buildSystemPrompt("titles", "");
    expect(prompt).not.toMatch(/author.*voice/i);
  });
});

// ─── swap-passage ─────────────────────────────────────────────────────────────

describe('buildSystemPrompt("swap-passage")', () => {
  it("instructs the AI to rewrite a passage", () => {
    const prompt = buildSystemPrompt("swap-passage", "");
    expect(prompt).toMatch(/rewrite/i);
  });

  it("instructs the AI to return only the rewritten passage", () => {
    const prompt = buildSystemPrompt("swap-passage", "");
    expect(prompt).toMatch(/return only/i);
  });

  it("mentions preserving the author's voice", () => {
    const prompt = buildSystemPrompt("swap-passage", "");
    expect(prompt).toMatch(/voice/i);
  });

  it("includes the author voice clause when provided", () => {
    const prompt = buildSystemPrompt("swap-passage", "Be concise and direct.");
    expect(prompt).toMatch(/Be concise and direct/);
  });
});

// ─── unchanged types — smoke tests ───────────────────────────────────────────

describe("buildSystemPrompt — unchanged types still return non-empty strings", () => {
  const types = ["excerpt", "categories", "tags", "aeo", "keywords", "slug",
                 "topic-report", "tone-check", "refine-focus", "seo", "reading-level"] as const;
  for (const type of types) {
    it(`"${type}" returns a non-empty prompt`, () => {
      expect(buildSystemPrompt(type, "").length).toBeGreaterThan(20);
    });
  }
});
