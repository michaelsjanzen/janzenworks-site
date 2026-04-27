/**
 * Mono theme — homepage section renderer.
 *
 * Phase 1: Section rendering delegates to the default theme's section renderers.
 * The monospace aesthetic comes from CSS variables — --font-sans is JetBrains Mono,
 * --color-background is near-black, --color-accent is amber. No additional
 * component changes are needed for Phase 1.
 *
 * TODO Phase 4: Add mono-specific section renderers:
 *   - Hero: no rounded buttons, terminal-style CTA (e.g. "> get started")
 *   - PostFeed: compact terminal-list style
 *   - TextBlock: no card chrome, left-border rule instead of boxed
 *   - CTA: full-width rule separator, no background fill
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
    <div className="space-y-12">
      {sections.map(section => (
        <RenderSection key={section.id} section={section} page={page} />
      ))}
      {enabled.length === 0 && (
        <p className="text-xs text-[var(--color-muted)]">// no sections enabled</p>
      )}
    </div>
  );
}
