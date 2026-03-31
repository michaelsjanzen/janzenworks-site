// PUGMILL_THEME_MODULES: Static Theme Module Registry
// ============================================================
// This file provides STATIC imports for all installed theme components.
// It must be kept in sync with theme-registry.ts.
//
// WHY THIS FILE EXISTS:
// Turbopack (Next.js dev compiler) cannot statically analyze dynamic imports
// with template literals (e.g. `import(\`../../themes/${id}/Layout\`)`).
// When such imports are used, Turbopack treats the entire themes/ directory
// as a "context module" and triggers [Fast Refresh] rebuilding on every
// server render — causing an infinite page-reload loop in dev mode.
//
// This registry solves the problem by using static imports that Turbopack
// can analyze at build time, then selects the correct module at runtime.
//
// WHEN ADDING A NEW THEME:
// STEP 1 — Add static imports for all theme module exports:
//   import MyLayout from "../../themes/<theme-id>/Layout";
//   import MyHomeView from "../../themes/<theme-id>/views/HomeView";
//   import MyPostView from "../../themes/<theme-id>/views/PostView";
//   import MyPageView from "../../themes/<theme-id>/views/PageView";
//   import {
//     DESIGN_DEFAULTS as MyDesignDefaults,
//     DESIGN_TOKEN_DEFS as MyDesignTokenDefs,
//     SANS_FONTS as MySansFonts,
//     MONO_FONTS as MyMonoFonts,
//     buildCssString as myBuildCssString,
//     buildGoogleFontsUrl as myBuildGoogleFontsUrl,
//   } from "../../themes/<theme-id>/design";
//
// STEP 2 — Add a new entry to THEME_MODULES:
//   "<theme-id>": {
//     Layout: MyLayout,
//     HomeView: MyHomeView,
//     PostView: MyPostView,
//     PageView: MyPageView,
//     design: { DESIGN_DEFAULTS: ..., DESIGN_TOKEN_DEFS: ..., ... },
//   },
//
// STEP 3 — Also update theme-registry.ts (THEME_ALLOWLIST + ALL_THEMES).
//
// DO NOT use dynamic import() with template literals — this defeats the
// purpose of this file and will re-introduce the Fast Refresh loop.
// ============================================================

import type React from "react";
import type { DesignTokenDef } from "@/types/design";

// ─── Default theme ────────────────────────────────────────────────────────────

import DefaultLayout from "../../themes/default/Layout";
import DefaultHomeView from "../../themes/default/views/HomeView";
import DefaultPostView from "../../themes/default/views/PostView";
import DefaultPageView from "../../themes/default/views/PageView";
import {
  DESIGN_DEFAULTS as DefaultDesignDefaults,
  DESIGN_TOKEN_DEFS as DefaultDesignTokenDefs,
  SANS_FONTS as DefaultSansFonts,
  MONO_FONTS as DefaultMonoFonts,
  COLOR_PRESETS as DefaultColorPresets,
  buildCssString as defaultBuildCssString,
  buildGoogleFontsUrl as defaultBuildGoogleFontsUrl,
} from "../../themes/default/design";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeDesignModule {
  DESIGN_DEFAULTS: Record<string, string>;
  DESIGN_TOKEN_DEFS: DesignTokenDef[];
  SANS_FONTS: string[];
  MONO_FONTS: string[];
  COLOR_PRESETS?: import("@/types/design").ColorPreset[];
  buildCssString: (config: Record<string, string>, defs: DesignTokenDef[]) => string;
  buildGoogleFontsUrl: (config: Record<string, string>) => string | null;
}

export interface ThemeModuleSet {
  Layout: React.ComponentType<{ children: React.ReactNode }>;
  HomeView: React.ComponentType<any>;
  PostView: React.ComponentType<any>;
  PageView: React.ComponentType<any>;
  design: ThemeDesignModule;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const THEME_MODULES: Record<string, ThemeModuleSet> = {
  default: {
    Layout: DefaultLayout,
    HomeView: DefaultHomeView,
    PostView: DefaultPostView,
    PageView: DefaultPageView,
    design: {
      DESIGN_DEFAULTS: DefaultDesignDefaults,
      DESIGN_TOKEN_DEFS: DefaultDesignTokenDefs,
      SANS_FONTS: DefaultSansFonts,
      MONO_FONTS: DefaultMonoFonts,
      COLOR_PRESETS: DefaultColorPresets,
      buildCssString: defaultBuildCssString,
      buildGoogleFontsUrl: defaultBuildGoogleFontsUrl,
    },
  },
  // ADD NEW THEMES HERE
};

const DEFAULT_MODULES = THEME_MODULES.default;

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED_MODULE_KEYS: (keyof ThemeModuleSet)[] = ["Layout", "HomeView", "PostView", "PageView", "design"];
const REQUIRED_DESIGN_KEYS: (keyof ThemeDesignModule)[] = [
  "DESIGN_DEFAULTS", "DESIGN_TOKEN_DEFS", "SANS_FONTS", "MONO_FONTS", "buildCssString", "buildGoogleFontsUrl",
];

/**
 * Validate that every allowlisted theme has a complete module registry entry.
 * Returns a list of error strings. An empty array means all themes are valid.
 * Called from validateSystem() on cold start.
 */
export function validateThemeModules(allowlist: readonly string[]): string[] {
  const errors: string[] = [];

  for (const themeId of allowlist) {
    const modules = THEME_MODULES[themeId];
    if (!modules) {
      errors.push(
        `Theme "${themeId}" is in THEME_ALLOWLIST but has no entry in THEME_MODULES ` +
        `(src/lib/theme-modules.ts STEP 2).`
      );
      continue;
    }
    for (const key of REQUIRED_MODULE_KEYS) {
      if (modules[key] == null) {
        errors.push(`Theme "${themeId}" is missing required module export: ${key}.`);
      }
    }
    if (modules.design) {
      for (const key of REQUIRED_DESIGN_KEYS) {
        if (modules.design[key] == null) {
          errors.push(`Theme "${themeId}" design module is missing required export: ${key}.`);
        }
      }
    }
  }

  return errors;
}

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getThemeLayout(themeId: string): ThemeModuleSet["Layout"] {
  return THEME_MODULES[themeId]?.Layout ?? DEFAULT_MODULES.Layout;
}

export function getThemeHomeView(themeId: string): ThemeModuleSet["HomeView"] {
  return THEME_MODULES[themeId]?.HomeView ?? DEFAULT_MODULES.HomeView;
}

export function getThemeDesign(themeId: string): ThemeDesignModule {
  return THEME_MODULES[themeId]?.design ?? DEFAULT_MODULES.design;
}

export function getThemePostView(themeId: string): ThemeModuleSet["PostView"] {
  return THEME_MODULES[themeId]?.PostView ?? DEFAULT_MODULES.PostView;
}

export function getThemePageView(themeId: string): ThemeModuleSet["PageView"] {
  return THEME_MODULES[themeId]?.PageView ?? DEFAULT_MODULES.PageView;
}
