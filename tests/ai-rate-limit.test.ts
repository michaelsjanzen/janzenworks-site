/**
 * Integration tests for the AI usage rate limiter.
 *
 * Tests checkAndIncrementAi and getAiUsage against the real dev DB.
 * Uses a dedicated __test-ai-user__ user ID that is cleaned up before/after each test.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkAndIncrementAi, getAiUsage, AI_RATE_LIMIT, AI_RATE_WINDOW } from "@/lib/rate-limit";

const TEST_USER = "__test-ai-rate-user__";

async function cleanup() {
  await db.delete(aiUsage).where(eq(aiUsage.userId, TEST_USER));
}

beforeEach(cleanup);
afterAll(cleanup);

// ─── checkAndIncrementAi ──────────────────────────────────────────────────────

describe("checkAndIncrementAi", () => {
  it("creates a row on first call and returns count 1, allowed true", async () => {
    const result = await checkAndIncrementAi(TEST_USER);
    expect(result.count).toBe(1);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(AI_RATE_LIMIT);
  });

  it("increments the count on each call within the window", async () => {
    await checkAndIncrementAi(TEST_USER);
    await checkAndIncrementAi(TEST_USER);
    const result = await checkAndIncrementAi(TEST_USER);
    expect(result.count).toBe(3);
    expect(result.allowed).toBe(true);
  });

  it("returns allowed false once count exceeds the limit", async () => {
    // Manually seed a row at exactly the limit
    await db.insert(aiUsage).values({
      userId: TEST_USER,
      windowStart: new Date(),
      count: AI_RATE_LIMIT,
    } as typeof aiUsage.$inferInsert);

    const result = await checkAndIncrementAi(TEST_USER);
    expect(result.count).toBe(AI_RATE_LIMIT + 1);
    expect(result.allowed).toBe(false);
  });

  it("resets the counter when the window has expired", async () => {
    // Insert with a raw literal to avoid timezone serialization differences.
    // '2020-01-01 00:00:00' is unambiguously outside any 1-hour window.
    await db.execute(
      sql`INSERT INTO ai_usage (user_id, window_start, count) VALUES (${TEST_USER}, '2020-01-01 00:00:00', ${AI_RATE_LIMIT})`
    );

    const result = await checkAndIncrementAi(TEST_USER);
    expect(result.count).toBe(1); // reset to 1, not AI_RATE_LIMIT + 1
    expect(result.allowed).toBe(true);
  });

  it("uses limitOverride when provided, reflecting it in result.limit", async () => {
    const result = await checkAndIncrementAi(TEST_USER, 10);
    expect(result.limit).toBe(10);
    expect(result.allowed).toBe(true);
  });

  it("blocks at the overridden limit, not AI_RATE_LIMIT", async () => {
    // Seed at exactly the override limit
    await db.execute(
      sql`INSERT INTO ai_usage (user_id, window_start, count) VALUES (${TEST_USER}, NOW(), 5)`
    );

    const result = await checkAndIncrementAi(TEST_USER, 5);
    expect(result.count).toBe(6);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(5);
  });

  it("allows calls below the overridden limit", async () => {
    await db.execute(
      sql`INSERT INTO ai_usage (user_id, window_start, count) VALUES (${TEST_USER}, NOW(), 3)`
    );

    const result = await checkAndIncrementAi(TEST_USER, 10);
    expect(result.count).toBe(4);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
  });
});

// ─── getAiUsage ───────────────────────────────────────────────────────────────

describe("getAiUsage", () => {
  it("returns count 0 when no row exists", async () => {
    const result = await getAiUsage(TEST_USER);
    expect(result.count).toBe(0);
    expect(result.limit).toBe(AI_RATE_LIMIT);
  });

  it("returns the current count within an active window", async () => {
    await db.insert(aiUsage).values({
      userId: TEST_USER,
      windowStart: new Date(),
      count: 15,
    } as typeof aiUsage.$inferInsert);

    const result = await getAiUsage(TEST_USER);
    expect(result.count).toBe(15);
  });

  it("returns count 0 when the window has expired", async () => {
    await db.execute(
      sql`INSERT INTO ai_usage (user_id, window_start, count) VALUES (${TEST_USER}, '2020-01-01 00:00:00', 42)`
    );

    const result = await getAiUsage(TEST_USER);
    expect(result.count).toBe(0); // window expired — treat as fresh
  });

  it("does not modify the DB row (read-only)", async () => {
    await db.insert(aiUsage).values({
      userId: TEST_USER,
      windowStart: new Date(),
      count: 7,
    } as typeof aiUsage.$inferInsert);

    await getAiUsage(TEST_USER);

    const rows = await db.select().from(aiUsage).where(eq(aiUsage.userId, TEST_USER));
    expect(rows[0].count).toBe(7); // unchanged
  });

  it("returns the overridden limit in result.limit", async () => {
    const result = await getAiUsage(TEST_USER, 25);
    expect(result.limit).toBe(25);
    expect(result.count).toBe(0);
  });

  it("uses AI_RATE_LIMIT when no override provided", async () => {
    const result = await getAiUsage(TEST_USER);
    expect(result.limit).toBe(AI_RATE_LIMIT);
  });
});
