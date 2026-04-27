import { describe, it, expect } from "vitest";
import { sanitizeThemeName } from "@/lib/theme-registry";

describe("sanitizeThemeName", () => {
  // ── Bundled themes ─────────────────────────────────────────────────────────

  it("returns 'default' for the default theme", () => {
    expect(sanitizeThemeName("default")).toBe("default");
  });

  it("returns 'editorial' for the editorial theme", () => {
    expect(sanitizeThemeName("editorial")).toBe("editorial");
  });

  it("returns 'mono' for the mono theme", () => {
    expect(sanitizeThemeName("mono")).toBe("mono");
  });

  // ── Unknown / invalid inputs fall back to default ─────────────────────────

  it("returns 'default' for an unknown theme name", () => {
    expect(sanitizeThemeName("hacker-theme")).toBe("default");
  });

  it("returns 'default' for an empty string", () => {
    expect(sanitizeThemeName("")).toBe("default");
  });

  // ── Sanitization ───────────────────────────────────────────────────────────

  it("strips unsafe characters before checking the allowlist", () => {
    // Uppercase letters are stripped — 'Default' → 'efault', not in allowlist
    expect(sanitizeThemeName("Default")).toBe("default");
  });

  it("strips special characters and path traversal attempts", () => {
    expect(sanitizeThemeName("../../etc/passwd")).toBe("default");
    expect(sanitizeThemeName("<script>alert(1)</script>")).toBe("default");
  });

  it("rejects a theme id that is valid-looking but not allowlisted", () => {
    expect(sanitizeThemeName("dark")).toBe("default");
    expect(sanitizeThemeName("minimal")).toBe("default");
  });
});
