/**
 * DesignTokenDef — the shape of a single design token definition.
 * Exported here (not from the theme) to avoid circular imports between
 * theme code and the admin UI / design-config lib.
 */
export interface DesignTokenDef {
  key: string;
  label: string;
  description?: string;
  type: "color" | "google-font" | "select" | "toggle" | "text" | "url" | "image-url" | "media-url" | "range";
  /**
   * For type "google-font" only. Determines which font list populates the
   * dropdown in the admin UI.
   *   "sans" — uses the theme's SANS_FONTS list
   *   "mono" — uses the theme's MONO_FONTS list
   *   "all"  — merges both lists (default when omitted)
   */
  fontList?: "sans" | "mono" | "all";
  /**
   * Token group. Built-in groups: "colors" | "typography" | "layout-home" |
   * "layout-post" | "layout-page". Themes may declare additional custom groups
   * (e.g. "hero", "card") — these are rendered under their own section in the
   * admin UI with a "Theme option" badge.
   */
  group: string;
  /**
   * Human-readable label for the group header in the admin UI. Only needed for
   * custom (non-built-in) groups. Built-in groups have fixed labels. When absent,
   * the admin auto-generates a label from the group key (e.g. "hero-section" → "Hero Section").
   */
  groupLabel?: string;
  options?: { value: string; label: string }[];
  /** CSS custom property name, e.g. '--color-background'. Absent for layout/config-only tokens. */
  cssVariable?: string;
  /** range-specific: min, max, step values and optional display unit (e.g. "%") */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** text/url/image-url: placeholder hint shown in the input */
  placeholder?: string;
  /**
   * When true, this toggle token acts as a master gate for its entire group:
   * all sibling tokens are hidden in the admin UI while this toggle is off.
   * Only one token per group should have isGate: true.
   */
  isGate?: boolean;
  default: string;
  /**
   * Display order within the token's group. Lower numbers render first.
   * Tokens without an order value sort after those with one.
   */
  order?: number;
  /**
   * Whether this token is user-editable in the admin UI.
   * Set to false for tokens that are core to the theme's identity and should
   * not be changed by the site owner (e.g. a dark theme locking its background).
   * Defaults to true when omitted.
   */
  editable?: boolean;
  /**
   * When true, changes to this token are written directly to the published config
   * and take effect immediately — bypassing the draft/publish cycle.
   * Use for structural layout choices (sidebar position, content width) where
   * the draft preview safety net adds no value and would confuse users.
   */
  immediatePublish?: boolean;
}

/**
 * Known built-in token groups rendered as dedicated sections in the admin UI.
 * Tokens in any other group are collected under "Theme Options".
 */
export const BUILT_IN_GROUPS = [
  "layout-home",
  "layout-post",
  "layout-page",
  "colors",
  "typography",
] as const;

export type BuiltInGroup = (typeof BUILT_IN_GROUPS)[number];

/**
 * A named snapshot of all color token values.
 * Themes export an array of these as COLOR_PRESETS.
 * Selecting a preset populates the color fields in the design form draft —
 * it does not auto-publish.
 */
export interface ColorPreset {
  id: string;
  label: string;
  colors: {
    colorBackground: string;
    colorSurface: string;
    colorForeground: string;
    colorMuted: string;
    colorBorder: string;
    colorAccent: string;
    colorAccentFg: string;
    colorLink: string;
  };
}
