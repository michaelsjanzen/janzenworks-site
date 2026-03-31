/**
 * Integration tests for the per-post AEO route handlers:
 *   GET /post/[slug]/llm.txt  → text/markdown
 *   GET /post/[slug]/data.json → application/json
 *
 * Uses a __test-aeo__ slug that is cleaned up before/after every test.
 * Calls the route handler GET functions directly (no HTTP server needed).
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock Next.js / app internals ────────────────────────────────────────────

vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("next/cache",      () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/config", () => ({
  getConfig: vi.fn().mockResolvedValue({
    site: { name: "Test Site" },
    appearance: { activeTheme: "default" },
  }),
}));

// ─── Real DB ──────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { posts, adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GET as getLlmTxt  } from "@/app/(site)/post/[slug]/llm.txt/route";
import { GET as getDataJson } from "@/app/(site)/post/[slug]/data.json/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SLUG        = "__test-aeo-post__";
const TEST_AUTHOR = "__test-aeo-author__";

function makeRequest(slug: string) {
  return {
    req: new NextRequest(`http://localhost/post/${slug}/llm.txt`),
    ctx: { params: Promise.resolve({ slug }) },
  };
}

async function insertPost(overrides: Record<string, unknown> = {}) {
  await db.insert(posts).values({
    slug: SLUG,
    title: "Test AEO Post",
    content: "## Section\n\nThis is the body.",
    published: true,
    publishedAt: new Date("2025-01-15"),
    aeoMetadata: {
      summary: "A test summary.",
      questions: [{ q: "What is this?", a: "A test post." }],
      entities: [{ type: "Organization", name: "Test Corp", description: "A company." }],
      keywords: ["testing", "aeo"],
    },
    ...overrides,
  } as typeof posts.$inferInsert);
}

async function cleanup() {
  await db.delete(posts).where(eq(posts.slug, SLUG));
  await db.delete(adminUsers).where(eq(adminUsers.id, TEST_AUTHOR));
}

beforeEach(cleanup);
afterAll(cleanup);

// ─── llm.txt ──────────────────────────────────────────────────────────────────

describe("GET /post/[slug]/llm.txt", () => {
  it("returns 404 for a missing slug", async () => {
    const { req, ctx } = makeRequest("__nonexistent__");
    const res = await getLlmTxt(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unpublished post", async () => {
    await insertPost({ published: false });
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 text/markdown for a published post", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/markdown/);
  });

  it("body contains the post title as a heading", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    const text = await res.text();
    expect(text).toContain("# Test AEO Post");
  });

  it("body contains the article content", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    const text = await res.text();
    expect(text).toContain("This is the body.");
  });

  it("body contains AEO summary", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    const text = await res.text();
    expect(text).toContain("A test summary.");
  });

  it("body contains FAQ section", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    const text = await res.text();
    expect(text).toContain("Frequently Asked Questions");
    expect(text).toContain("What is this?");
    expect(text).toContain("A test post.");
  });

  it("body contains entities section", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    const text = await res.text();
    expect(text).toContain("Key Entities");
    expect(text).toContain("Test Corp");
  });

  it("includes author name when present", async () => {
    await db.insert(adminUsers).values({
      id: TEST_AUTHOR,
      name: "Jane Author",
      email: "jane@example.com",
    } as typeof adminUsers.$inferInsert);
    await insertPost({ authorId: TEST_AUTHOR });

    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    const text = await res.text();
    expect(text).toContain("Jane Author");
  });

  it("omits FAQ section when post has no questions", async () => {
    await insertPost({ aeoMetadata: { summary: "No FAQ here." } });
    const { req, ctx } = makeRequest(SLUG);
    const res = await getLlmTxt(req, ctx);
    const text = await res.text();
    expect(text).not.toContain("Frequently Asked Questions");
  });
});

// ─── data.json ────────────────────────────────────────────────────────────────

describe("GET /post/[slug]/data.json", () => {
  it("returns 404 for a missing slug", async () => {
    const { req, ctx } = makeRequest("__nonexistent__");
    const res = await getDataJson(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unpublished post", async () => {
    await insertPost({ published: false });
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 application/json for a published post", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
  });

  it("payload contains expected top-level fields", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    const json = await res.json();
    expect(json.title).toBe("Test AEO Post");
    expect(json.slug).toBe(SLUG);
    expect(json.content).toContain("This is the body.");
    expect(json.publishedAt).toMatch(/2025-01-15/);
  });

  it("payload includes AEO metadata", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    const json = await res.json();
    expect(json.aeo.summary).toBe("A test summary.");
    expect(json.aeo.questions).toHaveLength(1);
    expect(json.aeo.entities[0].name).toBe("Test Corp");
    expect(json.aeo.keywords).toContain("testing");
  });

  it("payload includes _links with canonical, markdown, and json URLs", async () => {
    await insertPost();
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    const json = await res.json();
    expect(json._links.canonical).toContain(`/post/${SLUG}`);
    expect(json._links.markdown).toContain("/llm.txt");
    expect(json._links.json).toContain("/data.json");
  });

  it("does not expose internal DB IDs or authorId", async () => {
    await db.insert(adminUsers).values({
      id: TEST_AUTHOR,
      name: "Jane Author",
      email: "jane@example.com",
    } as typeof adminUsers.$inferInsert);
    await insertPost({ authorId: TEST_AUTHOR });
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    const json = await res.json();
    expect(json.authorId).toBeUndefined();
    expect(json.id).toBeUndefined();
    expect(json.featuredImage).toBeUndefined();
  });

  it("author is null when no authorId set", async () => {
    await insertPost({ authorId: null });
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    const json = await res.json();
    expect(json.author).toBeNull();
  });

  it("aeo is null when no aeoMetadata stored", async () => {
    await insertPost({ aeoMetadata: null });
    const { req, ctx } = makeRequest(SLUG);
    const res = await getDataJson(req, ctx);
    const json = await res.json();
    expect(json.aeo).toBeNull();
  });
});
