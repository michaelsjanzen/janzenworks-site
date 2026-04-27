// PUGMILL_REGISTRY: Theme Installation Contract
// ============================================================
// This file is the single source of truth for all installed themes.
// Themes are distributed via the pugmill.dev marketplace registry.
// The recommended install method is: npx pugmill add theme <name>
// AI agents may also install themes manually by following these steps exactly:
//
// STEP 1 — Create the theme directory and required files:
//   - /themes/<theme-id>/Layout.tsx        (default export: async Server Component)
//   - /themes/<theme-id>/manifest.json     (id, name, version, description)
//   - /themes/<theme-id>/views/HomeView.tsx (optional but conventional)
//   Theme components may use `await getConfig()` and `await hooks.applyFilters(...)`.
//
// STEP 2 — Add the theme id to THEME_ALLOWLIST (the security allowlist below).
//   Only themes in THEME_ALLOWLIST can ever be activated at runtime.
//
// STEP 3 — Register static module imports in src/lib/theme-modules.ts.
//   This is REQUIRED. Turbopack cannot analyze dynamic template literal imports,
//   so all theme components must be statically imported in that registry file.
//
// STEP 4 — Import the theme's manifest.json and add it to ALL_THEMES:
//   import myThemeManifest from "../../themes/<theme-id>/manifest.json";
//   Then add myThemeManifest to the ALL_THEMES array below.
//   ALL_THEMES drives the admin Themes page — only themes here are visible in the UI.
//
// STEP 5 — Activate the theme via the admin UI (Design → Themes → Activate)
//   or by setting config.appearance.activeTheme = "<theme-id>" directly.
//
// STEP 6 — Create the theme's design system contract:
//   - /themes/<theme-id>/design.ts  (REQUIRED for Design admin to work)
//   Exports: DESIGN_TOKEN_DEFS, DESIGN_DEFAULTS, HomeLayoutConfig, ArticleLayoutConfig,
//            SANS_FONTS, MONO_FONTS, buildGoogleFontsUrl, buildCssString
//   See /themes/_template/design.ts for the fully documented interface contract.
//   The 'default' theme ID is reserved as the system fallback. NEVER remove it.
//
// NOTE: THEME_ALLOWLIST, ALL_THEMES, theme-modules.ts, and the theme directory
// must all be updated together. A theme missing from any one will not work correctly.
// sanitizeThemeName() falls back to "default" for any name not in THEME_ALLOWLIST,
// ensuring a safe fallback even if config contains an unrecognized theme id.
//
// Registry reference: https://registry.pugmill.dev/themes
// Theme authoring guide: https://pugmill.dev/docs/themes
// ============================================================

/**
 * Allowlist of valid theme names.
 * Add new theme directory names here when creating a new theme.
 * This prevents path traversal attacks in dynamic theme imports.
 */
export const THEME_ALLOWLIST = ["default", "editorial", "mono"] as const;

export type ThemeName = (typeof THEME_ALLOWLIST)[number];

/**
 * Sanitize a theme name against the allowlist.
 * Returns "default" if the name is not in the allowlist or contains unsafe characters.
 */
export function sanitizeThemeName(theme: string): string {
  const safe = theme.replace(/[^a-z0-9-]/g, "");
  return (THEME_ALLOWLIST as readonly string[]).includes(safe) ? safe : "default";
}

// ─── Theme metadata ───────────────────────────────────────────────────────────
// Static manifest data for each installed theme.
// When adding a new theme, add its entry here AND to THEME_ALLOWLIST above.

export interface ThemeManifest {
  id: string;
  name: string;
  version: string;
  description: string;
}

import defaultManifest from "../../themes/default/manifest.json";
import editorialManifest from "../../themes/editorial/manifest.json";
import monoManifest from "../../themes/mono/manifest.json";

const ALL_THEMES: ThemeManifest[] = [
  defaultManifest,
  editorialManifest,
  monoManifest,
];

/**
 * Returns all installed themes with their active status.
 * Used by the Admin themes page.
 */
export function getAllThemes(activeThemeId: string): (ThemeManifest & { isActive: boolean })[] {
  return ALL_THEMES.map(t => ({
    ...t,
    isActive: t.id === activeThemeId,
  }));
}
