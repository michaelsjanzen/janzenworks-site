export type SectionType = "hero" | "post-feed" | "text-block" | "cta" | "featured-post";

interface BaseSection {
  id: string;
  enabled: boolean;
}

export interface HeroSection extends BaseSection {
  type: "hero";
  height: "short" | "medium" | "tall" | "full";
  imageUrl: string;
  overlayColor: string;
  overlayStyle: "flat" | "gradient-up" | "gradient-down";
  overlayOpacity: number;
  showHeadline: boolean;
  headline: string;
  showSubheadline: boolean;
  subheadline: string;
  contentAlign: "left" | "center";
  contentPosition: "top" | "center" | "bottom";
  cta1Enabled: boolean;
  cta1Text: string;
  cta1Url: string;
  cta1Style: "filled" | "outline";
  cta2Enabled: boolean;
  cta2Text: string;
  cta2Url: string;
  cta2Style: "filled" | "outline";
}

export interface PostFeedSection extends BaseSection {
  type: "post-feed";
  /** Optional heading displayed above the feed. */
  heading: string;
  /** Category slug filter. Empty string = all posts. */
  categorySlug: string;
  feedStyle: "list" | "grid";
  listStyle: "compact" | "editorial" | "feature" | "text-only";
  columns: "1" | "2" | "3";
  gap: "sm" | "md" | "lg";
  contentDisplay: "excerpt" | "none";
  /** Max posts to show. 0 = use default page size (10). */
  limit: number;
  /** Only one feed section should have pagination enabled. */
  showPagination: boolean;
}

export interface TextBlockSection extends BaseSection {
  type: "text-block";
  content: string;
  maxWidth: "narrow" | "medium" | "wide" | "full";
  align: "left" | "center";
}

export interface CtaSection extends BaseSection {
  type: "cta";
  heading: string;
  subtext: string;
  buttonText: string;
  buttonUrl: string;
  align: "left" | "center";
  style: "filled" | "subtle" | "outline";
}

export interface FeaturedPostSection extends BaseSection {
  type: "featured-post";
  /** "auto" = use the site's pinned featured post. Number = specific post ID. */
  postId: "auto" | number;
  showExcerpt: boolean;
}

export type HomepageSection =
  | HeroSection
  | PostFeedSection
  | TextBlockSection
  | CtaSection
  | FeaturedPostSection;
