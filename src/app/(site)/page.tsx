import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { parseHomepageSections } from "@/lib/homepage-sections";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

// Section renderers (server components)
import { HeroSection } from "../../../themes/default/views/HomeView";
import type { HeroConfig } from "../../../themes/default/design";
import { PostFeedRenderer } from "../../../themes/default/views/sections/PostFeedRenderer";
import { FeaturedPostRenderer } from "../../../themes/default/views/sections/FeaturedPostRenderer";
import { TextBlockRenderer } from "../../../themes/default/views/sections/TextBlockRenderer";
import { CtaRenderer } from "../../../themes/default/views/sections/CtaRenderer";
import type { HomepageSection } from "@/types/homepage-sections";

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

// ─── Section renderer ─────────────────────────────────────────────────────────

async function RenderSection({
  section,
  page,
}: {
  section: HomepageSection;
  page: number;
}) {
  if (!section.enabled) return null;

  switch (section.type) {
    case "hero": {
      // Map HeroSection fields to HeroConfig shape (same fields, minus id/type/enabled)
      const config: HeroConfig = {
        enabled: true,
        height: section.height,
        imageUrl: section.imageUrl,
        overlayColor: section.overlayColor,
        overlayStyle: section.overlayStyle,
        overlayOpacity: section.overlayOpacity,
        showHeadline: section.showHeadline,
        headline: section.headline,
        showSubheadline: section.showSubheadline,
        subheadline: section.subheadline,
        contentAlign: section.contentAlign,
        contentPosition: section.contentPosition,
        cta1Enabled: section.cta1Enabled,
        cta1Text: section.cta1Text,
        cta1Url: section.cta1Url,
        cta1Style: section.cta1Style,
        cta2Enabled: section.cta2Enabled,
        cta2Text: section.cta2Text,
        cta2Url: section.cta2Url,
        cta2Style: section.cta2Style,
      };
      return <HeroSection config={config} />;
    }

    case "post-feed":
      return <PostFeedRenderer section={section} page={page} basePath="/" />;

    case "featured-post":
      return <FeaturedPostRenderer section={section} />;

    case "text-block":
      return <TextBlockRenderer section={section} />;

    case "cta":
      return <CtaRenderer section={section} />;

    default:
      return null;
  }
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

  return (
    <div className="space-y-16">
      {sections.map(section => (
        <RenderSection key={section.id} section={section} page={page} />
      ))}
      {sections.every(s => !s.enabled) && (
        <p className="text-[var(--color-muted)]">No sections are enabled on the homepage.</p>
      )}
    </div>
  );
}
