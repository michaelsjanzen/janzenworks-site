/**
 * Mono theme — home view.
 *
 * Design principles:
 * - Monospace throughout (inherited from --font-sans CSS var).
 * - Near-black background, amber accent. No rounded corners, no shadows.
 * - Category tags use [bracket] notation. Dates are ISO format.
 * - Density-first: small gap, no card chrome, list-optimised.
 * - "$ " prompt prefix on the featured label — terminal aesthetic.
 */

import Link from "next/link";
import Image from "next/image";
import type { PostSummary } from "../../../src/types";
import type { HomeLayoutConfig, HeroConfig } from "../design";
import { HeroSection } from "../../default/views/HomeView";

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  // ISO-style date: YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

function Meta({ post }: { post: PostSummary }) {
  const date = formatDate(post.publishedAt);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
      {post.categories.map(cat => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="text-[var(--color-accent)] hover:opacity-70 transition-opacity"
        >
          [{cat.name}]
        </Link>
      ))}
      {date && <span>{date}</span>}
    </div>
  );
}

// ─── Compact entry — one line: date · [cat] title ────────────────────────────

function CompactEntry({ post, showExcerpt }: { post: PostSummary; showExcerpt: boolean }) {
  return (
    <article className="py-3 first:pt-0 border-b border-[var(--color-border)] last:border-b-0">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-xs text-[var(--color-muted)] shrink-0 tabular-nums">
          {formatDate(post.publishedAt) ?? "——————————"}
        </span>
        {post.categories.map(cat => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="text-xs text-[var(--color-accent)] hover:opacity-70 transition-opacity"
          >
            [{cat.name}]
          </Link>
        ))}
        <h2 className="text-sm font-medium min-w-0">
          <Link
            href={`/post/${post.slug}`}
            className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
      </div>
      {showExcerpt && post.excerpt && (
        <p className="mt-1 pl-[calc(10ch+0.75rem)] text-xs text-[var(--color-muted)] leading-relaxed line-clamp-2">
          {post.excerpt}
        </p>
      )}
    </article>
  );
}

// ─── Standard entry — title, excerpt, meta ────────────────────────────────────

function StandardEntry({ post, showExcerpt }: { post: PostSummary; showExcerpt: boolean }) {
  return (
    <article className="py-5 first:pt-0 border-b border-[var(--color-border)] last:border-b-0">
      <Meta post={post} />
      <h2 className="mt-1 text-base font-semibold leading-snug">
        <Link
          href={`/post/${post.slug}`}
          className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      {showExcerpt && post.excerpt && (
        <p className="mt-1 text-xs text-[var(--color-muted)] leading-relaxed line-clamp-2">{post.excerpt}</p>
      )}
      <Link
        href={`/post/${post.slug}`}
        className="mt-2 inline-block text-xs text-[var(--color-accent)] hover:opacity-70 transition-opacity"
      >
        read &rarr;
      </Link>
    </article>
  );
}

// ─── Featured entry ───────────────────────────────────────────────────────────

export function FeaturedCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="border border-[var(--color-border)] p-6 space-y-3">
      {post.featuredImageUrl && (
        <Link href={`/post/${post.slug}`} tabIndex={-1} aria-hidden>
          <div className="relative w-full aspect-[21/9] border border-[var(--color-border)] mb-4">
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
      <div className="text-xs text-[var(--color-accent)] font-medium">$ featured</div>
      <Meta post={post} />
      <h2 className="text-xl font-bold leading-snug">
        <Link
          href={`/post/${post.slug}`}
          className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      {showExcerpt && post.excerpt && (
        <p className="text-xs text-[var(--color-muted)] leading-relaxed line-clamp-3">{post.excerpt}</p>
      )}
      <Link
        href={`/post/${post.slug}`}
        className="inline-block text-xs text-[var(--color-accent)] hover:opacity-70 transition-opacity"
      >
        read more &rarr;
      </Link>
    </article>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, basePath = "/" }: { page: number; totalPages: number; basePath?: string }) {
  if (totalPages <= 1) return null;
  const prevHref = page === 2 ? basePath : `${basePath}?page=${page - 1}`;
  const nextHref = `${basePath}?page=${page + 1}`;
  return (
    <nav className="flex items-center gap-4 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-muted)]">
      {page > 1 ? (
        <Link href={prevHref} className="hover:text-[var(--color-accent)] transition-colors">[prev]</Link>
      ) : <span className="opacity-30">[prev]</span>}
      <span className="tabular-nums">{page}/{totalPages}</span>
      {page < totalPages ? (
        <Link href={nextHref} className="hover:text-[var(--color-accent)] transition-colors">[next]</Link>
      ) : <span className="opacity-30">[next]</span>}
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

  const listStyle = layoutConfig?.listStyle ?? "compact";
  const showExcerpt = (layoutConfig?.contentDisplay ?? "none") !== "none";
  const isCompact = listStyle === "compact" || listStyle === "text-only";

  return (
    <>
      <div>
        {posts.map(post =>
          isCompact
            ? <CompactEntry key={post.id} post={post} showExcerpt={showExcerpt} />
            : <StandardEntry key={post.id} post={post} showExcerpt={showExcerpt} />
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
  const showExcerpt = (layoutConfig?.contentDisplay ?? "none") !== "none";

  return (
    <div className="space-y-8">
      {heroEnabled && heroConfig && <HeroSection config={heroConfig} />}

      {featuredPost && <FeaturedCard post={featuredPost} showExcerpt={showExcerpt} />}

      <div id="posts">
        {posts.length === 0 && !featuredPost ? (
          <p className="text-xs text-[var(--color-muted)]">// no posts published yet</p>
        ) : (
          <PostFeed posts={posts} layoutConfig={layoutConfig} pagination={pagination} paginationBasePath="/" />
        )}
      </div>
    </div>
  );
}
