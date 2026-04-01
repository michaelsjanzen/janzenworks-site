---
name: pugmill-theme-your-theme-id
description: >
  One paragraph describing what this theme looks like and who it is for.
  Written for an AI agent — mention any unusual dependencies, required design
  token groups, or plugin slots it uses. Max 1024 characters.
compatibility: "Pugmill CMS v0.2+. Theme recipe."
license: MIT
metadata:
  type: theme
  pugmill-version: "0.2"
  has-routes: "false"
  has-migrations: "false"
---

This recipe installs the **your-theme-id** theme for Pugmill CMS.

**Theme id:** `your-theme-id`

## Installation

Follow the 6-step theme installation contract in `THEME_AUTHORING.md`:

1. Copy the `themes/` directory from this repository into the Pugmill project root.
2. Add `"your-theme-id"` to `THEME_ALLOWLIST` in `src/lib/theme-registry.ts`.
3. Add static imports for `Layout`, `HomeView`, `PostView`, `PageView`, and all `design.ts` exports in `src/lib/theme-modules.ts`. Add an entry to `THEME_MODULES`.
4. Import `manifest.json` and add it to `ALL_THEMES` in `src/lib/theme-registry.ts`.
5. Activate the theme in Admin > Design > Themes, or set `config.appearance.activeTheme = "your-theme-id"`.

## Notes

<!-- List anything non-standard here: required plugins, font dependencies,
     known limitations, or post-install customisation steps. -->
- No additional dependencies required.
