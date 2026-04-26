import type {
  HomepageSection,
  HeroSection,
  PostFeedSection,
  TextBlockSection,
  CtaSection,
  FeaturedPostSection,
  SectionType,
} from "@/types/homepage-sections";

// ─── Parse / serialize ────────────────────────────────────────────────────────

/**
 * Parse the sections array from the design config.
 * Falls back to synthesizing defaults from the old flat hero/feed keys so
 * existing sites don't lose their configuration on upgrade.
 */
export function parseHomepageSections(config: Record<string, string>): HomepageSection[] {
  const raw = config.homepageSections;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as HomepageSection[];
    } catch {
      // fall through to defaults
    }
  }
  return buildDefaultSections(config);
}

export function serializeHomepageSections(sections: HomepageSection[]): string {
  return JSON.stringify(sections);
}

// ─── Backward-compat defaults ─────────────────────────────────────────────────

/**
 * Build a default section array from the old flat design config keys.
 * Called the first time an existing site loads the new section-based homepage.
 */
function buildDefaultSections(config: Record<string, string>): HomepageSection[] {
  const hero: HeroSection = {
    id: "hero",
    type: "hero",
    enabled: config.heroEnabled === "true",
    height: (config.heroHeight as HeroSection["height"]) ?? "medium",
    imageUrl: config.heroImageUrl ?? "",
    overlayColor: config.heroOverlayColor ?? "#000000",
    overlayStyle: (config.heroOverlayStyle as HeroSection["overlayStyle"]) ?? "gradient-up",
    overlayOpacity: Number(config.heroOverlayOpacity ?? "60"),
    showHeadline: config.heroShowHeadline !== "false",
    headline: config.heroHeadline ?? "Welcome",
    showSubheadline: config.heroShowSubheadline !== "false",
    subheadline: config.heroSubheadline ?? "",
    contentAlign: (config.heroContentAlign as "left" | "center") ?? "center",
    contentPosition: (config.heroContentPosition as HeroSection["contentPosition"]) ?? "bottom",
    cta1Enabled: config.heroCta1Enabled === "true",
    cta1Text: config.heroCta1Text ?? "",
    cta1Url: config.heroCta1Url ?? "/",
    cta1Style: (config.heroCta1Style as "filled" | "outline") ?? "filled",
    cta2Enabled: config.heroCta2Enabled === "true",
    cta2Text: config.heroCta2Text ?? "",
    cta2Url: config.heroCta2Url ?? "",
    cta2Style: (config.heroCta2Style as "filled" | "outline") ?? "outline",
  };

  const feed: PostFeedSection = {
    id: "feed",
    type: "post-feed",
    enabled: true,
    heading: "",
    categorySlug: "",
    feedStyle: (config.homeFeedStyle as "list" | "grid") ?? "list",
    listStyle: (config.homeListStyle as PostFeedSection["listStyle"]) ?? "compact",
    columns: (config.homeColumns as "1" | "2" | "3") ?? "1",
    gap: (config.homeGap as "sm" | "md" | "lg") ?? "md",
    contentDisplay: (config.homeContentDisplay as "excerpt" | "none") ?? "excerpt",
    limit: 0,
    showPagination: true,
  };

  return [hero, feed];
}

// ─── Section labels ───────────────────────────────────────────────────────────

export const SECTION_LABELS: Record<SectionType, string> = {
  "hero":          "Hero",
  "post-feed":     "Post Feed",
  "text-block":    "Text Block",
  "cta":           "CTA Banner",
  "featured-post": "Featured Post",
};

// ─── Default section factories ────────────────────────────────────────────────

function uid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export function defaultHeroSection(): HeroSection {
  return {
    id: uid(), type: "hero", enabled: true,
    height: "medium", imageUrl: "",
    overlayColor: "#000000", overlayStyle: "gradient-up", overlayOpacity: 60,
    showHeadline: true, headline: "Welcome",
    showSubheadline: false, subheadline: "",
    contentAlign: "center", contentPosition: "bottom",
    cta1Enabled: false, cta1Text: "", cta1Url: "/", cta1Style: "filled",
    cta2Enabled: false, cta2Text: "", cta2Url: "", cta2Style: "outline",
  };
}

export function defaultFeedSection(): PostFeedSection {
  return {
    id: uid(), type: "post-feed", enabled: true,
    heading: "", categorySlug: "",
    feedStyle: "list", listStyle: "compact",
    columns: "1", gap: "md", contentDisplay: "excerpt",
    limit: 0, showPagination: false,
  };
}

export function defaultTextBlockSection(): TextBlockSection {
  return {
    id: uid(), type: "text-block", enabled: true,
    content: "", maxWidth: "medium", align: "left",
  };
}

export function defaultCtaSection(): CtaSection {
  return {
    id: uid(), type: "cta", enabled: true,
    heading: "", subtext: "",
    buttonText: "Learn more", buttonUrl: "/",
    align: "center", style: "filled",
  };
}

export function defaultFeaturedPostSection(): FeaturedPostSection {
  return {
    id: uid(), type: "featured-post", enabled: true,
    postId: "auto", showExcerpt: true,
  };
}

export function defaultSection(type: SectionType): HomepageSection {
  switch (type) {
    case "hero":          return defaultHeroSection();
    case "post-feed":     return defaultFeedSection();
    case "text-block":    return defaultTextBlockSection();
    case "cta":           return defaultCtaSection();
    case "featured-post": return defaultFeaturedPostSection();
  }
}
