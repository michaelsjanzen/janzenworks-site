---
name: pugmill-theme-dawn
description: >
  A minimal, typographic blog theme for Pugmill CMS. Clean serif headings,
  generous whitespace, and a warm off-white background. Supports all standard
  design tokens (colors, fonts, spacing). No plugin dependencies. No routes
  or lib files — theme files only.
compatibility: "Pugmill CMS v0.2+. Theme recipe. No routes. No migrations."
license: MIT
metadata:
  type: theme
  pugmill-version: "0.2"
  has-routes: "false"
  has-migrations: "false"
---

A minimal typographic blog theme for Pugmill CMS.

**Theme id:** `dawn`

---

## Installation

### Step 1 — Copy theme files

Copy the `themes/` directory from this repository into the Pugmill project root:

```
themes/dawn/    →    themes/dawn/
```

### Step 2 — Register the theme

Follow steps 2–4 of the theme installation contract in `THEME_AUTHORING.md`:

**Step 2** — Add `"dawn"` to `THEME_ALLOWLIST` in `src/lib/theme-registry.ts`:
```typescript
export const THEME_ALLOWLIST = ["default", "dawn"] as const;
```

**Step 3** — Add static imports in `src/lib/theme-modules.ts`:
```typescript
import DawnLayout from "../../themes/dawn/Layout";
import DawnHomeView from "../../themes/dawn/views/HomeView";
import DawnPostView from "../../themes/dawn/views/PostView";
import DawnPageView from "../../themes/dawn/views/PageView";
import {
  DESIGN_DEFAULTS as DawnDesignDefaults,
  DESIGN_TOKEN_DEFS as DawnDesignTokenDefs,
  SANS_FONTS as DawnSansFonts,
  MONO_FONTS as DawnMonoFonts,
  buildCssString as dawnBuildCssString,
  buildGoogleFontsUrl as dawnBuildGoogleFontsUrl,
} from "../../themes/dawn/design";
```

Add an entry to `THEME_MODULES`:
```typescript
"dawn": {
  Layout: DawnLayout,
  HomeView: DawnHomeView,
  PostView: DawnPostView,
  PageView: DawnPageView,
  design: {
    DESIGN_DEFAULTS: DawnDesignDefaults,
    DESIGN_TOKEN_DEFS: DawnDesignTokenDefs,
    SANS_FONTS: DawnSansFonts,
    MONO_FONTS: DawnMonoFonts,
    buildCssString: dawnBuildCssString,
    buildGoogleFontsUrl: dawnBuildGoogleFontsUrl,
  },
},
```

**Step 4** — Import the manifest and add it to `ALL_THEMES` in `src/lib/theme-registry.ts`:
```typescript
import dawnManifest from "../../themes/dawn/manifest.json";

const ALL_THEMES: ThemeManifest[] = [
  defaultManifest,
  dawnManifest,
];
```

### Step 3 — Activate

Activate in Admin > Design > Themes, or set `config.appearance.activeTheme = "dawn"` directly.

---

## Notes

- No additional dependencies required
- Design tokens include accent color, background, foreground, serif heading font, and body font
- Compatible with all standard plugin slots (`postFooter`, `siteBanner`)
