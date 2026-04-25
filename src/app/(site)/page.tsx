import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { getThemeHomeView } from "@/lib/theme-modules";
import { fetchPostPage, fetchFeaturedPost } from "@/lib/queries/posts";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import type { HomeLayoutConfig } from "../../../themes/default/design";
import { extractHeroConfig } from "../../../themes/default/design";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

// ─── Dynamic metadata ─────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const siteUrl = resolveSiteUrl(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    config.site?.url ?? "",
  );
  const siteName = config.site?.name ?? "Pugmill";
  const description = config.site?.description || config.site?.seoDefaults?.metaDescription || undefined;
  const ogImage = toAbsoluteUrl(config.site?.seoDefaults?.ogImage, siteUrl) ?? undefined;

  return {
    title: { absolute: siteName },
    description,
    alternates: {
      canonical: siteUrl,
      types: {
        "application/rss+xml": `${siteUrl}/feed.xml`,
      },
    },
    openGraph: {
      type: "website",
      title: siteName,
      description,
      url: siteUrl,
      siteName,
      ...(ogImage ? { images: [{ url: ogImage, alt: siteName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [config, sp, cookieStore] = await Promise.all([
    getConfig(),
    searchParams,
    cookies(),
  ]);

  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const activeTheme = sanitizeThemeName(config.appearance.activeTheme);

  const isPreview = cookieStore.get("__pugmill_design_preview")?.value === "1";
  const designConfig = await getDesignConfig(activeTheme, isPreview ? "draft" : "published");

  const layoutConfig: HomeLayoutConfig = {
    feedStyle: (designConfig.homeFeedStyle as "list" | "grid") ?? "list",
    listStyle: (designConfig.homeListStyle as "compact" | "editorial" | "feature" | "text-only") ?? "compact",
    columns: (Number(designConfig.homeColumns) as 1 | 2 | 3) ?? 1,
    gap: (designConfig.homeGap as "sm" | "md" | "lg") ?? "md",
    contentDisplay: (designConfig.homeContentDisplay as "excerpt" | "none") ?? "excerpt",
  };

  const heroConfig = extractHeroConfig(designConfig);

  // Fetch featured post and feed page in parallel.
  // Exclude the featured post from the feed so it doesn't appear twice.
  const featuredPost = await fetchFeaturedPost();
  const postPage = await fetchPostPage({ page, excludeId: featuredPost?.id });

  const HomeView = getThemeHomeView(activeTheme);

  return (
    <HomeView
      posts={postPage.posts}
      layoutConfig={layoutConfig}
      heroConfig={heroConfig}
      pagination={{ page: postPage.page, totalPages: postPage.totalPages }}
      featuredPost={featuredPost ?? undefined}
    />
  );
}
