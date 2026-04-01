import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { fetchPostPage } from "@/lib/queries/posts";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import type { HomeLayoutConfig } from "../../../../themes/default/design";
import { PostFeed } from "../../../../themes/default/views/HomeView";
import { resolveSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const [config, sp] = await Promise.all([getConfig(), searchParams]);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const siteUrl = resolveSiteUrl(process.env.NEXTAUTH_URL ?? "http://localhost:3000", config.site?.url ?? "");
  const siteName = config.site?.name ?? "Pugmill";
  const postPage = await fetchPostPage({ page });

  const canonical = page === 1 ? `${siteUrl}/blog` : `${siteUrl}/blog?page=${page}`;
  const prev = page > 1 ? (page === 2 ? `${siteUrl}/blog` : `${siteUrl}/blog?page=${page - 1}`) : undefined;
  const next = page < postPage.totalPages ? `${siteUrl}/blog?page=${page + 1}` : undefined;

  const title = `Blog · ${siteName}`;
  const description = "All posts from this site.";

  return {
    title,
    description,
    alternates: { canonical, ...(prev ? { prev } : {}), ...(next ? { next } : {}) },
    openGraph: { type: "website", title, description, url: canonical, siteName },
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [config, sp, cookieStore] = await Promise.all([
    getConfig(),
    searchParams,
    cookies(),
  ]);

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const activeTheme = sanitizeThemeName(config.appearance.activeTheme);

  const isPreview = cookieStore.get("__pugmill_design_preview")?.value === "1";
  const designConfig = await getDesignConfig(activeTheme, isPreview ? "draft" : "published");

  const layoutConfig: HomeLayoutConfig = {
    feedStyle: (designConfig.blogFeedStyle as "list" | "grid") ?? "list",
    listStyle: (designConfig.blogListStyle as "compact" | "editorial" | "feature" | "text-only") ?? "compact",
    columns: (Number(designConfig.blogColumns) as 1 | 2 | 3) ?? 1,
    gap: (designConfig.blogGap as "sm" | "md" | "lg") ?? "md",
  };

  const postPage = await fetchPostPage({ page });

  return (
    <div className="space-y-12">
      <header className="border-b border-[var(--color-border)] pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-foreground)]">Blog</h1>
        <p className="mt-2 text-[var(--color-muted)]">All posts from this site.</p>
      </header>

      {postPage.posts.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-muted)]">
          <p className="text-lg">No posts published yet.</p>
        </div>
      ) : (
        <PostFeed
          posts={postPage.posts}
          layoutConfig={layoutConfig}
          pagination={{ page: postPage.page, totalPages: postPage.totalPages }}
          paginationBasePath="/blog"
        />
      )}
    </div>
  );
}
