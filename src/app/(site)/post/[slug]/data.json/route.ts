/**
 * GET /post/[slug]/data.json
 *
 * Returns a structured JSON payload for a published post, giving answer engines
 * direct API-like access to the full content record — title, body, taxonomy,
 * AEO metadata, and navigation links — without any HTML or hydration overhead.
 *
 * Linked from <head> via <link rel="alternate" type="application/json">.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posts,
  categories,
  tags,
  postCategories,
  postTags,
  adminUsers,
  media,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseAeoMetadata } from "@/lib/aeo";
import { getConfig } from "@/lib/config";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await db.query.posts.findFirst({ where: eq(posts.slug, slug) });
  if (!post || !post.published) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const [postCats, postTagsList, author, featuredMedia, config] = await Promise.all([
    db
      .select({ name: categories.name, slug: categories.slug })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .where(eq(postCategories.postId, post.id)),
    db
      .select({ name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(eq(postTags.postId, post.id)),
    post.authorId
      ? db.query.adminUsers.findFirst({ where: eq(adminUsers.id, post.authorId) })
      : Promise.resolve(null),
    post.featuredImage
      ? db.query.media.findFirst({ where: (m, { eq: e }) => e(m.id, post.featuredImage!) })
      : Promise.resolve(null),
    getConfig(),
  ]);

  const siteUrl = resolveSiteUrl(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    config.site?.url ?? "",
  );
  const canonicalUrl = `${siteUrl}/post/${post.slug}`;
  const featuredImageUrl = featuredMedia ? toAbsoluteUrl(featuredMedia.url, siteUrl) : null;

  const aeo = parseAeoMetadata(post.aeoMetadata);

  const payload = {
    title: post.title,
    slug: post.slug,
    type: post.type,
    excerpt: post.excerpt ?? null,
    content: post.content,
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: author?.name ? { name: author.name } : null,
    categories: postCats,
    tags: postTagsList,
    featuredImageUrl,
    aeo: aeo ?? null,
    site: {
      name: config.site?.name ?? "Pugmill",
      url: siteUrl,
    },
    _links: {
      canonical: canonicalUrl,
      markdown: `${canonicalUrl}/llm.txt`,
      json: `${canonicalUrl}/data.json`,
    },
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
    },
  });
}
