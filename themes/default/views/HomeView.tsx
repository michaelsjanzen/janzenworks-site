import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PostSummary } from "../../../src/types";
import type { HomeLayoutConfig, HeroConfig } from "../design";

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const gapClass: Record<string, string> = {
  sm: "gap-4",
  md: "gap-8",
  lg: "gap-12",
};

const gridColsClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

// ─── Hero Section ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function HeroSection({ config }: { config: HeroConfig }) {
  const heightClass = {
    short: "min-h-[40vh]",
    medium: "min-h-[60vh]",
    tall: "min-h-[80vh]",
    full: "min-h-screen",
  }[config.height] ?? "min-h-[60vh]";

  const justifyClass = {
    top: "justify-start",
    center: "justify-center",
    bottom: "justify-end",
  }[config.contentPosition] ?? "justify-end";

  const rgb = hexToRgb(config.overlayColor || "#000000");
  const opacity = config.overlayOpacity / 100;
  const solid = `rgb(${rgb} / ${opacity})`;
  const transparent = `rgb(${rgb} / 0)`;

  const overlayBg = {
    flat: solid,
    "gradient-up": `linear-gradient(to top, ${solid}, ${solid} 25%, ${transparent})`,
    "gradient-down": `linear-gradient(to bottom, ${solid}, ${solid} 25%, ${transparent})`,
  }[config.overlayStyle] ?? solid;

  const hasBg = Boolean(config.imageUrl);

  const wrapperStyle: CSSProperties = {
    // Full-viewport bleed out of the parent max-w-7xl container
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    width: "100vw",
    ...(hasBg
      ? {
          backgroundImage: `url(${config.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }
      : { backgroundColor: "var(--color-accent)" }),
  };

  const alignClasses =
    config.contentAlign === "center" ? "items-center text-center" : "items-start text-left";

  const ctaAlign = config.contentAlign === "center" ? "justify-center" : "";

  const ctaClass = (style: "filled" | "outline") =>
    style === "outline"
      ? "inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm border-2 border-white text-white hover:bg-white/15 transition-colors"
      : "inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm bg-white text-zinc-900 hover:bg-white/90 transition-colors";

  return (
    <div
      className={`relative flex flex-col ${justifyClass} ${heightClass} overflow-hidden`}
      style={wrapperStyle}
    >
      {/* Overlay — only applied when there is a background image */}
      {hasBg && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: overlayBg }}
          aria-hidden
        />
      )}

      {/* Content */}
      <div
        className={`relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col gap-5 ${alignClasses}`}
      >
        {config.showHeadline && config.headline && (
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight max-w-4xl">
            {config.headline}
          </h1>
        )}
        {config.showSubheadline && config.subheadline && (
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
            {config.subheadline}
          </p>
        )}
        {(config.cta1Enabled || config.cta2Enabled) && (
          <div className={`flex flex-wrap gap-3 pt-2 ${ctaAlign}`}>
            {config.cta1Enabled && config.cta1Text && (
              <a href={config.cta1Url || "#"} className={ctaClass(config.cta1Style)}>
                {config.cta1Text}
              </a>
            )}
            {config.cta2Enabled && config.cta2Text && (
              <a href={config.cta2Url || "#"} className={ctaClass(config.cta2Style)}>
                {config.cta2Text}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Metadata for list/loop views: categories → date. Tags are deliberately not
 * shown in list views — they only appear at the bottom of the single post/page
 * view so the feed stays scannable and categorical.
 */
function Meta({ post }: { post: PostSummary }) {
  if (post.categories.length === 0 && !formatDate(post.publishedAt)) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {post.categories.map(cat => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
        >
          {cat.name}
        </Link>
      ))}
      {formatDate(post.publishedAt) && (
        <span className="text-xs text-[var(--color-muted)]">{formatDate(post.publishedAt)}</span>
      )}
    </div>
  );
}

function ReadMore() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] group-hover:gap-2 transition-all">
      Read more
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </span>
  );
}

// ─── Card helpers ─────────────────────────────────────────────────────────────
// All list/loop cards follow the same content order the user sees top-to-bottom:
//   1. Title
//   2. Content preview (excerpt, if enabled via Design > Customize → Content)
//   3. Meta: categories → date (tags intentionally omitted — tags appear only
//      on the single post/page view)
// Every card accepts a `showExcerpt` prop so the surrounding page route can
// honor the design token choice.

// ─── Featured card — hero treatment above the feed ────────────────────────────

function FeaturedCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-muted)] hover:shadow-md transition-all">
      {post.featuredImageUrl && (
        <Link href={`/post/${post.slug}`} tabIndex={-1} aria-hidden>
          <div className="relative w-full aspect-[21/9] border-b border-[var(--color-border)]">
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
      <div className="p-6 sm:p-8 space-y-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Featured</span>
        <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
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
        <div className="flex items-center justify-between pt-1">
          <Meta post={post} />
          <Link href={`/post/${post.slug}`}><ReadMore /></Link>
        </div>
      </div>
    </article>
  );
}

// ─── List card — horizontal layout, thumbnail on the right ───────────────────

function ListCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="group py-8 first:pt-0 flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold leading-snug">
          <Link
            href={`/post/${post.slug}`}
            className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
        {showExcerpt && post.excerpt && (
          <p className="text-[var(--color-muted)] line-clamp-2 text-sm sm:text-base leading-relaxed">
            {post.excerpt}
          </p>
        )}
        <Meta post={post} />
        <Link href={`/post/${post.slug}`}><ReadMore /></Link>
      </div>
      {post.featuredImageUrl && (
        <Link
          href={`/post/${post.slug}`}
          className="relative shrink-0 hidden sm:block w-40 lg:w-48 aspect-video rounded-lg overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-muted)] transition-colors"
          tabIndex={-1}
          aria-hidden
        >
          <Image
            src={post.featuredImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 160px, 192px"
          />
        </Link>
      )}
    </article>
  );
}

// ─── Editorial card — large image left (~40%), text right ─────────────────────

function EditorialCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="group py-8 first:pt-0 flex gap-8 items-start">
      {post.featuredImageUrl && (
        <Link
          href={`/post/${post.slug}`}
          className="relative shrink-0 w-2/5 aspect-[4/3] rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-muted)] transition-colors"
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
      <div className="flex-1 min-w-0 space-y-3 py-2">
        <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
          <Link
            href={`/post/${post.slug}`}
            className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
        {showExcerpt && post.excerpt && (
          <p className="text-[var(--color-muted)] line-clamp-3 leading-relaxed">
            {post.excerpt}
          </p>
        )}
        <Meta post={post} />
        <Link href={`/post/${post.slug}`}><ReadMore /></Link>
      </div>
    </article>
  );
}

// ─── Feature card — full-width image on top, content below ───────────────────

function FeatureCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="group rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-md transition-all">
      {post.featuredImageUrl && (
        <Link href={`/post/${post.slug}`} tabIndex={-1} aria-hidden>
          <div className="relative w-full aspect-[16/7]">
            <Image
              src={post.featuredImageUrl}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          </div>
        </Link>
      )}
      <div className="p-6 sm:p-8 space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
          <Link
            href={`/post/${post.slug}`}
            className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
        {showExcerpt && post.excerpt && (
          <p className="text-[var(--color-muted)] line-clamp-3 leading-relaxed">
            {post.excerpt}
          </p>
        )}
        <Meta post={post} />
        <Link href={`/post/${post.slug}`}><ReadMore /></Link>
      </div>
    </article>
  );
}

// ─── Text-only card — no images, clean reading list ──────────────────────────

function TextOnlyCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="group py-6 first:pt-0 space-y-2">
      <h2 className="text-xl sm:text-2xl font-semibold leading-snug">
        <Link
          href={`/post/${post.slug}`}
          className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      {showExcerpt && post.excerpt && (
        <p className="text-[var(--color-muted)] line-clamp-2 leading-relaxed">
          {post.excerpt}
        </p>
      )}
      <Meta post={post} />
      <Link href={`/post/${post.slug}`}><ReadMore /></Link>
    </article>
  );
}

// ─── Grid card — vertical stack: title → excerpt → meta → read more ──────────

function GridCard({ post, showExcerpt = true }: { post: PostSummary; showExcerpt?: boolean }) {
  return (
    <article className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-muted)] hover:shadow-sm transition-all">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-semibold leading-snug">
          <Link
            href={`/post/${post.slug}`}
            className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
      </div>
      {post.featuredImageUrl && (
        <Link href={`/post/${post.slug}`} tabIndex={-1} aria-hidden>
          <div className="relative w-full aspect-video border-y border-[var(--color-border)]">
            <Image
              src={post.featuredImageUrl}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </Link>
      )}
      <div className="flex flex-col flex-1 gap-3 px-5 py-4">
        {showExcerpt && post.excerpt && (
          <p className="text-[var(--color-muted)] text-sm leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>
        )}
        <Meta post={post} />
        <div className="mt-auto pt-2">
          <Link href={`/post/${post.slug}`}><ReadMore /></Link>
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
    <nav className="flex items-center justify-center gap-2 pt-8 border-t border-[var(--color-border)]">
      {page > 1 ? (
        <Link
          href={prevHref}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-foreground)] hover:border-[var(--color-muted)] hover:bg-[var(--color-surface)] transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Newer
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] opacity-40 cursor-not-allowed">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Newer
        </span>
      )}

      <span className="text-sm text-[var(--color-muted)] px-2">
        {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={nextHref}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-foreground)] hover:border-[var(--color-muted)] hover:bg-[var(--color-surface)] transition"
        >
          Older
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] opacity-40 cursor-not-allowed">
          Older
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  );
}

// ─── Shared feed component ────────────────────────────────────────────────────

/**
 * Renders a paginated post feed using the shared card components.
 * Used by both HomeView and the /blog archive page.
 */
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

  const feedStyle = layoutConfig?.feedStyle ?? "list";
  const listStyle = layoutConfig?.listStyle ?? "compact";
  const columns = layoutConfig?.columns ?? 1;
  const gap = layoutConfig?.gap ?? "md";
  const showExcerpt = (layoutConfig?.contentDisplay ?? "excerpt") !== "none";
  const isGrid = feedStyle === "grid" && columns > 1;

  return (
    <>
      {isGrid ? (
        <div className={`grid ${gridColsClass[columns] ?? "grid-cols-2"} ${gapClass[gap] ?? "gap-6"}`}>
          {posts.map(post => <GridCard key={post.id} post={post} showExcerpt={showExcerpt} />)}
        </div>
      ) : listStyle === "editorial" ? (
        <div className="divide-y divide-[var(--color-border)]">
          {posts.map(post => <EditorialCard key={post.id} post={post} showExcerpt={showExcerpt} />)}
        </div>
      ) : listStyle === "feature" ? (
        <div className={`flex flex-col ${gapClass[gap] ?? "gap-8"}`}>
          {posts.map(post => <FeatureCard key={post.id} post={post} showExcerpt={showExcerpt} />)}
        </div>
      ) : listStyle === "text-only" ? (
        <div className="divide-y divide-[var(--color-border)]">
          {posts.map(post => <TextOnlyCard key={post.id} post={post} showExcerpt={showExcerpt} />)}
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {posts.map(post => <ListCard key={post.id} post={post} showExcerpt={showExcerpt} />)}
        </div>
      )}
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
    <div className="space-y-16">
      {/* Full-width hero — bleeds out of the parent max-w container */}
      {heroEnabled && heroConfig && <HeroSection config={heroConfig} />}


      {/* Featured post */}
      {featuredPost && <FeaturedCard post={featuredPost} showExcerpt={showExcerpt} />}

      {/* Feed — id="posts" allows CTA buttons to deep-link here */}
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
