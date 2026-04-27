/**
 * Editorial theme — home view.
 *
 * Design principles:
 * - No card chrome: no rounded corners, no background surfaces, no drop shadows.
 * - Typography does the structural work. Separator lines take the place of cards.
 * - Article headings use var(--font-heading) (display serif).
 * - Generous vertical rhythm (line-height 1.8, large base size).
 * - Text-only feed by default; image-left "editorial" layout available.
 */

import Link from "next/link";
import Image from "next/image";
import type { PostSummary } from "../../../src/types";
import type { HomeLayoutConfig, HeroConfig } from "../design";
import { HeroSection } from "../../default/views/HomeView";

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

function Meta({ post }: { post: PostSummary }) {
  const date = formatDate(post.publishedAt);
  if (post.categories.length === 0 && !date) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {post.categories.map(cat => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] hover:opacity-70 transition-opacity"
        >
          {cat.name}
        </Link>
      ))}
      {date && (
        <span className="text-xs text-[var(--color-muted)]">{date}</span>
      )}
    </div>
  );
}

// ─── Text-only entry — title + excerpt + meta, no image ──────────────────────

function TextEntry({ post, showExcerpt }: { post: PostSummary; showExcerpt: boolean }) {
  return (
    <article className="py-8 first:pt-0 border-b border-[var(--color-border)] last:border-b-0">
      <Meta post={post} />
      <h2
        className="mt-2 text-2xl sm:text-3xl font-bold leading-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        <Link
          href={`/post/${post.slug}`}
          className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      {showExcerpt && post.excerpt && (
        <p className="mt-3 text-[var(--color-muted)] leading-relaxed line-clamp-3">
          {post.excerpt}
        </p>
      )}
      <Link
        href={`/post/${post.slug}`}
        className="mt-3 inline-block text-sm font-medium text-[var(--color-accent)] hover:opacity-70 transition-opacity"
      >
        Read &rarr;
      </Link>
    </article>
  );
}

// ─── Editorial entry — large image left, text right ──────────────────────────

function EditorialEntry({ post, showExcerpt }: { post: PostSummary; showExcerpt: boolean }) {
  return (
    <article className="py-10 first:pt-0 border-b border-[var(--color-border)] last:border-b-0 flex gap-8 items-start">
      {post.featuredImageUrl && (
        <Link
          href={`/post/${post.slug}`}
          className="relative shrink-0 w-2/5 aspect-[4/3] overflow-hidden"
          tabIndex={-1}
          aria-hidden
        >
          <Image
            src={post.featuredImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        </Link>
      )}
      <div className="flex-1 min-w-0 space-y-2 py-1">
        <Meta post={post} />
        <h2
          className="text-2xl sm:text-3xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Link
            href={`/post/${post.slug}`}
            className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
        {showExcerpt && post.excerpt && (
          <p className="text-[var(--color-muted)] leading-relaxed line-clamp-3">{post.excerpt}</p>
        )}
        <Link
          href={`/post/${post.slug}`}
          className="inline-block text-sm font-medium text-[var(--color-accent)] hover:opacity-70 transition-opacity"
        >
          Read &rarr;
        </Link>
      </div>
    </article>
  );
}

// ─── Featured entry — large image on top ─────────────────────────────────────

export function FeaturedCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="border-b border-[var(--color-border)] pb-10 mb-2 space-y-4">
      {post.featuredImageUrl && (
        <Link href={`/post/${post.slug}`} tabIndex={-1} aria-hidden>
          <div className="relative w-full aspect-[21/9] overflow-hidden">
            <Image
              src={post.featuredImageUrl}
              alt={post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          </div>
        </Link>
      )}
      <div className="space-y-3">
        <span
          className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]"
        >
          Featured
        </span>
        <h2
          className="text-3xl sm:text-4xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Link
            href={`/post/${post.slug}`}
            className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
        {showExcerpt && post.excerpt && (
          <p className="text-lg text-[var(--color-muted)] leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-4">
          <Meta post={post} />
          <Link
            href={`/post/${post.slug}`}
            className="text-sm font-medium text-[var(--color-accent)] hover:opacity-70 transition-opacity ml-auto"
          >
            Read &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, basePath = "/" }: { page: number; totalPages: number; basePath?: string }) {
  if (totalPages <= 1) return null;
  const prevHref = page === 2 ? basePath : `${basePath}?page=${page - 1}`;
  const nextHref = `${basePath}?page=${page + 1}`;
  return (
    <nav className="flex items-center justify-between pt-8 border-t border-[var(--color-border)] text-sm text-[var(--color-muted)]">
      {page > 1 ? (
        <Link href={prevHref} className="hover:text-[var(--color-foreground)] transition-colors">
          &larr; Newer
        </Link>
      ) : <span className="opacity-30">&larr; Newer</span>}

      <span>{page} / {totalPages}</span>

      {page < totalPages ? (
        <Link href={nextHref} className="hover:text-[var(--color-foreground)] transition-colors">
          Older &rarr;
        </Link>
      ) : <span className="opacity-30">Older &rarr;</span>}
    </nav>
  );
}

// ─── Shared feed component ────────────────────────────────────────────────────

export function PostFeed({
  posts,
  layoutConfig,
  pagination,
  paginationBasePath = "/",
}: {
  posts: PostSummary[];
  layoutConfig?: HomeLayoutConfig;
  pagination?: { page: number; totalPages: number };
  paginationBasePath?: string;
}) {
  if (posts.length === 0) return null;

  const listStyle = layoutConfig?.listStyle ?? "text-only";
  const showExcerpt = (layoutConfig?.contentDisplay ?? "excerpt") !== "none";
  const useEditorialLayout = listStyle === "editorial";

  return (
    <>
      <div>
        {posts.map(post =>
          useEditorialLayout
            ? <EditorialEntry key={post.id} post={post} showExcerpt={showExcerpt} />
            : <TextEntry key={post.id} post={post} showExcerpt={showExcerpt} />
        )}
      </div>
      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} basePath={paginationBasePath} />
      )}
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function HomeView({
  posts,
  layoutConfig,
  heroConfig,
  pagination,
  featuredPost,
}: {
  posts: PostSummary[];
  layoutConfig?: HomeLayoutConfig;
  heroConfig?: HeroConfig;
  pagination?: { page: number; totalPages: number };
  featuredPost?: PostSummary;
}) {
  const heroEnabled = heroConfig?.enabled ?? false;
  const showExcerpt = (layoutConfig?.contentDisplay ?? "excerpt") !== "none";

  return (
    <div className="space-y-12">
      {heroEnabled && heroConfig && <HeroSection config={heroConfig} />}

      {featuredPost && <FeaturedCard post={featuredPost} showExcerpt={showExcerpt} />}

      <div id="posts">
        {posts.length === 0 && !featuredPost ? (
          <p className="text-[var(--color-muted)]">No posts published yet.</p>
        ) : (
          <PostFeed posts={posts} layoutConfig={layoutConfig} pagination={pagination} paginationBasePath="/" />
        )}
      </div>
    </div>
  );
}
