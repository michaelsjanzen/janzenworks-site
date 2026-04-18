import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, categories, tags, postCategories, postTags } from "@/lib/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { loadPlugins } from "@/lib/plugin-loader";
import { authorizeApiRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts
 *
 * Query params:
 *   page      — page number (default: 1)
 *   limit     — items per page, max 100 (default: 10)
 *   category  — filter by category slug
 *   tag       — filter by tag slug
 *
 * Returns only published posts. Suitable for headless frontends.
 *
 * Query count: always exactly 3 regardless of page size.
 *   1. COUNT of matching posts (for pagination meta)
 *   2. Paginated post rows (SQL LIMIT/OFFSET)
 *   3a. Batch fetch of all category associations for the page's post IDs
 *   3b. Batch fetch of all tag associations for the page's post IDs
 *   (3a and 3b run in parallel via Promise.all, counting as one round-trip)
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if (auth.ok === false) return auth.response;

  try {
    await loadPlugins();
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
    const offset = (page - 1) * limit;
    const categorySlug = searchParams.get("category");
    const tagSlug = searchParams.get("tag");

    // --- Resolve optional filter slugs to IDs (1 query each, only when filter is active) ---
    let filterPostIds: number[] | null = null;

    if (categorySlug) {
      const cat = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug));
      if (cat.length === 0) return emptyPage(page, limit);

      const rows = await db
        .select({ postId: postCategories.postId })
        .from(postCategories)
        .where(eq(postCategories.categoryId, cat[0].id));
      filterPostIds = rows.map((r) => r.postId);
      if (filterPostIds.length === 0) return emptyPage(page, limit);
    }

    if (tagSlug) {
      const tag = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.slug, tagSlug));
      if (tag.length === 0) return emptyPage(page, limit);

      const rows = await db
        .select({ postId: postTags.postId })
        .from(postTags)
        .where(eq(postTags.tagId, tag[0].id));
      const tagPostIds = rows.map((r) => r.postId);
      if (tagPostIds.length === 0) return emptyPage(page, limit);

      filterPostIds = filterPostIds
        ? filterPostIds.filter((id) => tagPostIds.includes(id))
        : tagPostIds;
      if (filterPostIds.length === 0) return emptyPage(page, limit);
    }

    const baseCondition = filterPostIds
      ? and(eq(posts.published, true), inArray(posts.id, filterPostIds))
      : eq(posts.published, true);

    // --- Query 1: total count (SQL COUNT — no full table scan into JS memory) ---
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(posts)
      .where(baseCondition);

    if (total === 0) return emptyPage(page, limit);

    // --- Query 2: paginated post rows (SQL LIMIT/OFFSET + ORDER BY) ---
    const paginated = await db
      .select()
      .from(posts)
      .where(baseCondition)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    // --- Query 3: batch-fetch all categories and tags for this page's posts ---
    // Two parallel queries, each returning flat rows tagged with postId.
    // We group them in JS — O(n) over the small result set, no extra DB round-trips.
    const pageIds = paginated.map((p) => p.id);

    const [catRows, tagRows] = await Promise.all([
      db
        .select({
          postId: postCategories.postId,
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        })
        .from(postCategories)
        .innerJoin(categories, eq(postCategories.categoryId, categories.id))
        .where(inArray(postCategories.postId, pageIds)),

      db
        .select({
          postId: postTags.postId,
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
        })
        .from(postTags)
        .innerJoin(tags, eq(postTags.tagId, tags.id))
        .where(inArray(postTags.postId, pageIds)),
    ]);

    // Group associations by postId
    const catsByPost = groupBy(catRows, (r) => r.postId);
    const tagsByPost = groupBy(tagRows, (r) => r.postId);

    const data = paginated.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? null,
      parentId: post.parentId ?? null,
      published: post.published,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      categories: (catsByPost.get(post.id) ?? []).map(({ id, name, slug }) => ({ id, name, slug })),
      tags: (tagsByPost.get(post.id) ?? []).map(({ id, name, slug }) => ({ id, name, slug })),
    }));

    return json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[API] GET /api/posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// --- helpers ---

function groupBy<T>(arr: T[], key: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of arr) {
    const k = key(item);
    const existing = map.get(k);
    if (existing) existing.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function emptyPage(page: number, limit: number) {
  return json({ data: [], meta: { page, limit, total: 0, totalPages: 0 } });
}

function json(body: unknown) {
  return NextResponse.json(body, { headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
