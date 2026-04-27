/**
 * Default theme — homepage section renderer.
 *
 * This is the section entry point registered in theme-modules.ts.
 * Each theme ships its own version so it can render sections with its
 * own card components, typography, and visual language.
 *
 * Core's src/app/(site)/page.tsx calls getThemeSections(themeId) and
 * renders <ThemeSections sections={sections} page={page} /> without
 * knowing which theme is active.
 */

import type { HomepageSection } from "../../../src/types/homepage-sections";
import type { HeroConfig } from "../design";
import { HeroSection } from "./HomeView";
import { PostFeedRenderer } from "./sections/PostFeedRenderer";
import { FeaturedPostRenderer } from "./sections/FeaturedPostRenderer";
import { TextBlockRenderer } from "./sections/TextBlockRenderer";
import { CtaRenderer } from "./sections/CtaRenderer";

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
