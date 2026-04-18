/**
 * GET /post/[slug]/llm.txt
 *
 * Returns a clean Markdown representation of a published post for LLM/AEO
 * crawlers. Bypasses React hydration entirely — pure text/markdown response
 * with no RSC payload, no script tags, no noise.
 *
 * Linked from <head> via <link rel="alternate" type="text/markdown">.
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
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseAeoMetadata, extractCitations } from "@/lib/aeo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await db.query.posts.findFirst({ where: eq(posts.slug, slug) });
  if (!post || !post.published) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const [postCats, postTagsList, author] = await Promise.all([
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
  ]);

  const aeo = parseAeoMetadata(post.aeoMetadata);
  const publishedDate = (post.publishedAt ?? post.createdAt).toISOString().split("T")[0];

  const lines: string[] = [];

  // ── Front matter ────────────────────────────────────────────────────────────
  lines.push(`# ${post.title}`, "");

  const meta: string[] = [`**Published:** ${publishedDate}`];
  if (author?.name) meta.push(`**Author:** ${author.name}`);
  if (postCats.length > 0) meta.push(`**Categories:** ${postCats.map(c => c.name).join(", ")}`);
  if (postTagsList.length > 0) meta.push(`**Tags:** ${postTagsList.map(t => t.name).join(", ")}`);
  if (aeo?.keywords?.length) meta.push(`**Keywords:** ${aeo.keywords.join(", ")}`);
  lines.push(meta.join("  \n"), "");

  // ── AEO summary ─────────────────────────────────────────────────────────────
  if (aeo?.summary) {
    lines.push("---", "", aeo.summary, "");
  }

  // ── Excerpt ─────────────────────────────────────────────────────────────────
  if (post.excerpt && post.excerpt !== aeo?.summary) {
    lines.push("---", "", `> ${post.excerpt}`, "");
  }

  // ── Article body ────────────────────────────────────────────────────────────
  lines.push("---", "", post.content, "");

  // ── FAQ ─────────────────────────────────────────────────────────────────────
  const questions = aeo?.questions?.filter(q => q.q && q.a) ?? [];
  if (questions.length > 0) {
    lines.push("---", "", "## Frequently Asked Questions", "");
    for (const { q, a } of questions) {
      lines.push(`**Q: ${q}**`, "", `A: ${a}`, "");
    }
  }

  // ── Citations ───────────────────────────────────────────────────────────────
  const citations = extractCitations(post.content);
  if (citations.length > 0) {
    lines.push("---", "", "## Citations", "");
    for (const { url, name } of citations) {
      lines.push(`- [${name}](${url})`);
    }
    lines.push("");
  }

  // ── Entities ────────────────────────────────────────────────────────────────
  const entities = aeo?.entities?.filter(e => e.name) ?? [];
  if (entities.length > 0) {
    lines.push("---", "", "## Key Entities", "");
    for (const e of entities) {
      const desc = e.description ? ` — ${e.description}` : "";
      const sameAs = e.sameAs ? ` <${e.sameAs}>` : "";
      lines.push(`- **${e.name}** (${e.type})${desc}${sameAs}`);
    }
    lines.push("");
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
    },
  });
}
