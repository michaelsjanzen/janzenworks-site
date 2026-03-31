/**
 * Unit tests for the migration runner filename logic.
 *
 * The runner's two critical behaviours are:
 *  1. Correctly identifying migration files (regex filter)
 *  2. Applying them in alphabetical (i.e. numeric) order
 *
 * No DB or filesystem access required — logic is extracted inline.
 */
import { describe, it, expect } from "vitest";

// Replicate the runner's file detection and sort logic.
const MIGRATION_REGEX = /^migrate-\d+.*\.ts$/;

function isMigrationFile(filename: string): boolean {
  return MIGRATION_REGEX.test(filename);
}

function sortMigrations(files: string[]): string[] {
  return files.filter(isMigrationFile).sort();
}

// ── File detection ────────────────────────────────────────────────────────────

describe("migration runner — file detection", () => {
  it("matches standard numbered migration files", () => {
    expect(isMigrationFile("migrate-001-design-config-upsert.ts")).toBe(true);
    expect(isMigrationFile("migrate-007-bot-analytics-v2.ts")).toBe(true);
  });

  it("matches files with just a number suffix", () => {
    expect(isMigrationFile("migrate-001.ts")).toBe(true);
  });

  it("rejects non-migration scripts", () => {
    expect(isMigrationFile("setup.ts")).toBe(false);
    expect(isMigrationFile("create-schema.ts")).toBe(false);
    expect(isMigrationFile("run-migrations.ts")).toBe(false);
    expect(isMigrationFile("replit-init.ts")).toBe(false);
  });

  it("rejects files without a number after migrate-", () => {
    expect(isMigrationFile("migrate-design.ts")).toBe(false);
  });

  it("rejects compiled .js versions", () => {
    // Runner targets .ts files only
    expect(isMigrationFile("migrate-001-foo.js")).toBe(false);
  });
});

// ── Sort order ────────────────────────────────────────────────────────────────

describe("migration runner — sort order", () => {
  it("sorts migrations numerically by filename", () => {
    const files = [
      "migrate-007-bot-analytics-v2.ts",
      "migrate-001-design-config-upsert.ts",
      "migrate-003-ai-usage.ts",
      "migrate-006-plugin-tables.ts",
    ];
    expect(sortMigrations(files)).toEqual([
      "migrate-001-design-config-upsert.ts",
      "migrate-003-ai-usage.ts",
      "migrate-006-plugin-tables.ts",
      "migrate-007-bot-analytics-v2.ts",
    ]);
  });

  it("filters out non-migration files before sorting", () => {
    const mixed = [
      "run-migrations.ts",
      "migrate-002-featured-post.ts",
      "setup.ts",
      "migrate-001-design-config-upsert.ts",
    ];
    const result = sortMigrations(mixed);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("migrate-001-design-config-upsert.ts");
    expect(result[1]).toBe("migrate-002-featured-post.ts");
  });

  it("returns empty array when no migration files are present", () => {
    expect(sortMigrations(["setup.ts", "create-schema.ts"])).toHaveLength(0);
  });

  it("handles a single migration file", () => {
    expect(sortMigrations(["migrate-007-bot-analytics-v2.ts"])).toEqual([
      "migrate-007-bot-analytics-v2.ts",
    ]);
  });
});
