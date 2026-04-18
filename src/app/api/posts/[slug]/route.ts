import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, categories, tags, postCategories, postTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { loadPlugins } from "@/lib/plugin-loader";
import { hooks } from "@/lib/hooks";
import type { PostPayload } from "@/lib/hook-catalogue";
import { authorizeApiRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/[slug]
 *
 * Returns a single published post with full content, categories, and tags.
 * Returns 404 if the post does not exist or is not published.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authorizeApiRequest(req);
  if (auth.ok === false) return auth.response;

  try {
    await loadPlugins();
    const { slug } = await params;

    const rows = await db.select().from(posts).where(eq(posts.slug, slug));
    const post = rows[0];

    if (!post || !post.published) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    const catRows = await db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(postCategories)
      .innerJoin(categories, eq(postCategories.categoryId, categories.id))
      .where(eq(postCategories.postId, post.id));

    const tagRows = await db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, post.id));

    const postPayload: PostPayload = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      type: post.type as "post" | "page",
      published: post.published,
      authorId: post.authorId,
      parentId: post.parentId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    const baseData: Record<string, unknown> = {
      id: post.id,
      type: post.type,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt ?? null,
      featuredImage: post.featuredImage ?? null,
      parentId: post.parentId ?? null,
      aeoMetadata: post.aeoMetadata ?? null,
      published: post.published,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      categories: catRows,
      tags: tagRows,
    };

    const data = await hooks.applyFilters("api:post:response", {
      input: baseData,
      post: postPayload,
    });

    return NextResponse.json(
      { data },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[API] GET /api/posts/[slug] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
