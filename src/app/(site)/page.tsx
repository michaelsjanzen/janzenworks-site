import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { getThemeSections } from "@/lib/theme-modules";
import { parseHomepageSections } from "@/lib/homepage-sections";
import { cookies } from "next/headers";
import type { Metadata } from "next";
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
      types: { "application/rss+xml": `${siteUrl}/feed.xml` },
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
  const sections = parseHomepageSections(designConfig);

  // Each theme renders its sections with its own card components and layout.
  // Core has no knowledge of what's inside — it just passes the data.
  const ThemeSections = getThemeSections(activeTheme);

  return <ThemeSections sections={sections} page={page} />;
}
