import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, postCategories, posts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authorizeApiRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/categories
 *
 * Returns all categories with a count of published posts in each.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if (auth.ok === false) return auth.response;

  try {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        createdAt: categories.createdAt,
        postCount: sql<number>`count(distinct ${postCategories.postId})`.as("post_count"),
      })
      .from(categories)
      .leftJoin(postCategories, eq(postCategories.categoryId, categories.id))
      .leftJoin(
        posts,
        and(eq(posts.id, postCategories.postId), eq(posts.published, true))
      )
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.createdAt
      );

    return NextResponse.json(
      { data: rows },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[API] GET /api/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
