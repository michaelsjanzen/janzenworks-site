import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("db/index — build phase behaviour", () => {
  const original = {
    NEXT_PHASE: process.env.NEXT_PHASE,
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
  };

  it("does not throw at import time during next build (NEXT_PHASE=phase-production-build)", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;

    // Dynamic import so the module is evaluated with our env in place.
    // vitest isolates modules per test file, so this is safe.
    await expect(import("../src/lib/db/index")).resolves.toBeDefined();

    // Restore
    process.env.NEXT_PHASE = original.NEXT_PHASE ?? "";
    if (original.DATABASE_URL) process.env.DATABASE_URL = original.DATABASE_URL;
    if (original.POSTGRES_URL) process.env.POSTGRES_URL = original.POSTGRES_URL;
  });
});
