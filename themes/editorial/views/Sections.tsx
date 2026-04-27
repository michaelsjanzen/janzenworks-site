/**
 * Editorial theme — homepage section renderer.
 *
 * Phase 1: Section rendering delegates to the default theme's section renderers.
 * Since all styles propagate through CSS variables (set by editorial/design.ts),
 * the visual character — warm background, serif headings, generous spacing —
 * is already applied automatically.
 *
 * The editorial-specific FeaturedCard and PostFeed are used for post-feed and
 * featured-post sections so those entries match the editorial card style.
 *
 * TODO Phase 3: Add editorial-specific HeroSection with var(--font-heading) on
 * the h1, and editorial CTA button styles (no rounded corners, underline links).
 */

import type { HomepageSection } from "../../../src/types/homepage-sections";
import type { HeroConfig } from "../../default/design";
import { HeroSection } from "../../default/views/HomeView";
import { PostFeedRenderer } from "../../default/views/sections/PostFeedRenderer";
import { FeaturedPostRenderer } from "../../default/views/sections/FeaturedPostRenderer";
import { TextBlockRenderer } from "../../default/views/sections/TextBlockRenderer";
import { CtaRenderer } from "../../default/views/sections/CtaRenderer";

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
      // TODO Phase 3: Replace with an editorial-specific hero that applies
      // fontFamily: "var(--font-heading)" to the h1 and uses no rounded buttons.
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

export interface SectionsProps {
  sections: HomepageSection[];
  page: number;
}

export default async function Sections({ sections, page }: SectionsProps) {
  const enabled = sections.filter(s => s.enabled);
  return (
    <div className="space-y-16">
      {sections.map(section => (
        <RenderSection key={section.id} section={section} page={page} />
      ))}
      {enabled.length === 0 && (
        <p className="text-[var(--color-muted)]">No sections are enabled on the homepage.</p>
      )}
    </div>
  );
}
