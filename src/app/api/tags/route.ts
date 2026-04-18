import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags, postTags, posts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authorizeApiRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/tags
 *
 * Returns all tags with a count of published posts in each.
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
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        createdAt: tags.createdAt,
        postCount: sql<number>`count(distinct ${postTags.postId})`.as("post_count"),
      })
      .from(tags)
      .leftJoin(postTags, eq(postTags.tagId, tags.id))
      .leftJoin(
        posts,
        and(eq(posts.id, postTags.postId), eq(posts.published, true))
      )
      .groupBy(tags.id, tags.name, tags.slug, tags.createdAt);

    return NextResponse.json(
      { data: rows },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[API] GET /api/tags error:", err);
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
