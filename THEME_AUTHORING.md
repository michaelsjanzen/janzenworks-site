# Pugmill CMS Theme Authoring Guide

Themes control the visual presentation of the public-facing site. They live in `/themes/<theme-id>/` and are registered statically across three files. This guide covers everything needed to build and distribute a theme.

---

## 1. File Structure

```
themes/
  my-theme/
    manifest.json           # Required. Theme metadata.
    Layout.tsx              # Required. Wraps every page with nav, footer, fonts, CSS tokens.
    design.ts               # Required. Design token definitions and CSS helpers.
    views/
      HomeView.tsx          # Blog post feed.
      PostView.tsx          # Single blog post.
      PageView.tsx          # Static page (about, contact, etc.).
    components/             # Optional. Shared UI components (Header, Footer, etc.).
      Header.tsx
      Footer.tsx
```

### `manifest.json`

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "version": "1.0.0",
  "description": "One-line description shown in the admin UI."
}
```

The `id` must match the directory name. Lowercase letters, numbers, and hyphens only.

---

## 2. Installation Contract (6 Steps)

When installing a theme -- manually or via `npx pugmill add theme <name>` -- updating these files in order is required:

**STEP 1** -- Create the theme directory with all required files (see section 1).

**STEP 2** -- Add the theme id to `THEME_ALLOWLIST` in `src/lib/theme-registry.ts`:
```typescript
export const THEME_ALLOWLIST = ["default", "my-theme"] as const;
```
This allowlist is the security gate that prevents path traversal. Any theme not listed here cannot be activated, even if the config says otherwise.

**STEP 3** -- Register static imports in `src/lib/theme-modules.ts`:
```typescript
import MyLayout from "../../themes/my-theme/Layout";
import MyHomeView from "../../themes/my-theme/views/HomeView";
import MyPostView from "../../themes/my-theme/views/PostView";
import MyPageView from "../../themes/my-theme/views/PageView";
import {
  DESIGN_DEFAULTS as MyDesignDefaults,
  DESIGN_TOKEN_DEFS as MyDesignTokenDefs,
  SANS_FONTS as MySansFonts,
  MONO_FONTS as MyMonoFonts,
  buildCssString as myBuildCssString,
  buildGoogleFontsUrl as myBuildGoogleFontsUrl,
} from "../../themes/my-theme/design";
```

Then add an entry to `THEME_MODULES`:
```typescript
"my-theme": {
  Layout: MyLayout,
  HomeView: MyHomeView,
  PostView: MyPostView,
  PageView: MyPageView,
  design: {
    DESIGN_DEFAULTS: MyDesignDefaults,
    DESIGN_TOKEN_DEFS: MyDesignTokenDefs,
    SANS_FONTS: MySansFonts,
    MONO_FONTS: MyMonoFonts,
    buildCssString: myBuildCssString,
    buildGoogleFontsUrl: myBuildGoogleFontsUrl,
  },
},
```

Static imports are required -- Turbopack cannot analyze dynamic template-literal imports and will cause an infinite Fast Refresh loop otherwise.

**STEP 4** -- Import the manifest and add it to `ALL_THEMES` in `src/lib/theme-registry.ts`:
```typescript
import myThemeManifest from "../../themes/my-theme/manifest.json";

const ALL_THEMES: ThemeManifest[] = [
  defaultManifest,
  myThemeManifest,
];
```

**STEP 5** -- Activate the theme in the admin UI (Design > Themes > Activate) or set `config.appearance.activeTheme = "my-theme"` directly.

**STEP 6** -- Create `design.ts` (see section 4). The Design admin page will not work without it.

---

## 3. Required Theme Components

### `Layout.tsx`

The layout wraps every page on the site. It must:
- Accept `{ children: React.ReactNode }` as props
- Be an async Server Component
- Apply design tokens as CSS custom properties via `buildCssString()`
- Load Google Fonts via `buildGoogleFontsUrl()` when applicable
- Render plugin `siteBanner` slots after the main content

```typescript
// themes/my-theme/Layout.tsx
import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { buildCssString, buildGoogleFontsUrl, DESIGN_TOKEN_DEFS } from "./design";
import { getActiveSlots } from "@/lib/plugin-registry";
import { cookies } from "next/headers";

export default async function ThemeLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig();
  const themeId = sanitizeThemeName(config.appearance.activeTheme);

  // Design token resolution -- supports draft preview mode
  const cookieStore = await cookies();
  const isPreview = cookieStore.get("__pugmill_design_preview")?.value === "1";
  const designConfig = await getDesignConfig(themeId, isPreview ? "draft" : "published");
  const cssString = buildCssString(designConfig, DESIGN_TOKEN_DEFS);
  const fontUrl = buildGoogleFontsUrl(designConfig);

  // Plugin site banner slots
  const siteBanners = getActiveSlots(
    "siteBanner",
    config.modules.activePlugins,
    config.modules.pluginSettings ?? {}
  );

  return (
    <div style={{ fontFamily: "var(--font-sans)", backgroundColor: "var(--color-background)" }}>
      <style dangerouslySetInnerHTML={{ __html: cssString }} />
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      <header>...</header>
      <main>{children}</main>
      <footer>...</footer>
      {siteBanners.map(({ pluginId, Component, settings }) => (
        <Component key={pluginId} settings={settings} />
      ))}
    </div>
  );
}
```

### `views/HomeView.tsx`

Receives the post feed data and renders the listing page. The core route passes all data as props -- the view does not fetch anything itself.

### `views/PostView.tsx`

Receives a single post's data (title, content, categories, tags, AEO metadata, etc.) and renders the article page. Content arrives as a Markdown string -- the view is responsible for rendering it (via `ReactMarkdown` with `rehypeSanitize`).

Content must pass through `rehypeSanitize` when rendering -- the `content:render` filter hook allows plugins to append raw HTML, and sanitization prevents XSS.

```typescript
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

// In render:
<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
  {content}
</ReactMarkdown>
```

The view must also render `postFooter` plugin slots:

```typescript
import { getActiveSlots } from "@/lib/plugin-registry";

// In an async server component or passed via props from the page:
const postFooters = getActiveSlots("postFooter", activePlugins, pluginSettings);

// In JSX:
{postFooters.map(({ pluginId, Component }) => (
  <Component key={pluginId} postId={post.id} postSlug={post.slug} />
))}
```

### `views/PageView.tsx`

Same pattern as PostView but for static pages (About, Contact, etc.). Typically no taxonomy, no AEO metadata, and no postFooter slots.

---

## 4. Design System (`design.ts`)

Every theme must export these symbols from `themes/<theme-id>/design.ts`:

| Export | Type | Purpose |
|---|---|---|
| `DESIGN_TOKEN_DEFS` | `DesignTokenDef[]` | Token definitions -- drives the Design admin UI |
| `DESIGN_DEFAULTS` | `Record<string, string>` | Default values for every token key |
| `SANS_FONTS` | `string[]` | Allowlist of sans-serif Google Fonts |
| `MONO_FONTS` | `string[]` | Allowlist of monospace Google Fonts |
| `buildCssString` | function | Converts token values to `:root { --var: value; }` CSS |
| `buildGoogleFontsUrl` | function | Builds Google Fonts stylesheet URL from active fonts |

The fully documented interface contract is in `/themes/_template/design.ts`. A complete working example is in `/themes/default/design.ts`.

### Token definition shape

```typescript
import type { DesignTokenDef } from "../../src/types/design";

export const DESIGN_TOKEN_DEFS: DesignTokenDef[] = [
  {
    key: "colorBackground",      // unique key -- used in DESIGN_DEFAULTS and config
    label: "Background",         // shown in admin UI
    description: "Page background color.",
    type: "color",               // "color" | "font" | "spacing" | "text"
    group: "colors",             // groups tokens into sections in admin UI
    cssVariable: "--color-background",
    default: "#ffffff",
    editable: true,              // false = internal token, hidden from admin UI
    order: 1,                    // display order within group
  },
  {
    key: "fontSans",
    label: "Body Font",
    type: "font",
    group: "typography",
    cssVariable: "--font-sans",
    default: "Inter",
    editable: true,
    order: 10,
  },
];
```

### `DESIGN_DEFAULTS`

Must include a default value for every key in `DESIGN_TOKEN_DEFS`:

```typescript
export const DESIGN_DEFAULTS: Record<string, string> = {
  colorBackground: "#ffffff",
  colorForeground: "#18181b",
  fontSans: "Inter",
  // ... one entry per token key
};
```

### `buildCssString`

Takes the resolved token config and token defs, returns a CSS string:

```typescript
export function buildCssString(
  config: Record<string, string>,
  defs: DesignTokenDef[]
): string {
  const vars = defs.map(def => {
    const value = config[def.key] ?? def.default;
    return `  ${def.cssVariable}: ${value};`;
  });
  return `:root {\n${vars.join("\n")}\n}`;
}
```

### `buildGoogleFontsUrl`

Returns a Google Fonts stylesheet URL if any active fonts are in `SANS_FONTS` or `MONO_FONTS`, or `null` if only system fonts are in use:

```typescript
export function buildGoogleFontsUrl(config: Record<string, string>): string | null {
  const families: string[] = [];
  const sans = config.fontSans ?? DESIGN_DEFAULTS.fontSans;
  if (SANS_FONTS.includes(sans)) families.push(`${sans}:wght@400;500;600;700`);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map(f => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`;
}
```

---

## 5. CSS Custom Properties

Design tokens are injected as CSS custom properties in `:root`. Referencing them in theme components via Tailwind's `[]` escape or inline `style` attributes is the correct approach:

```typescript
// Inline style (always works)
<div style={{ color: "var(--color-foreground)", background: "var(--color-background)" }}>

// Tailwind arbitrary value
<div className="text-[var(--color-foreground)] bg-[var(--color-background)]">
```

Hardcoding color or font values in components is incorrect -- CSS custom properties are the mechanism that makes Admin > Design work.

---

## 6. Hook Filters in Themes

Themes apply filters at render time for content and metadata. These are called by the core page routes before the view receives data -- the view always receives already-filtered values and does not call hooks itself.

| Filter | Applied by | What it does |
|---|---|---|
| `content:render` | `(site)/post/[slug]/page.tsx` | Transforms post Markdown before passing to PostView |
| `content:excerpt` | `(site)/post/[slug]/page.tsx` | Transforms post excerpt |
| `nav:items` | Call from `Layout.tsx` | Allows plugins to add nav entries |
| `head:meta` | Call from view or layout | Allows plugins to add `<meta>` tags |

Applying `nav:items` in a layout:

```typescript
import { hooks } from "@/lib/hooks";

const rawNav = config.appearance.navigation ?? [];
const nav = await hooks.applyFilters("nav:items", { input: rawNav });
```

---

## 7. The `default` Theme

The `default` theme is the system fallback. It must never be removed from `THEME_ALLOWLIST` or `ALL_THEMES`. Any theme missing from the module registry silently falls back to `default` at runtime via the accessor functions in `src/lib/theme-modules.ts`.

Using `default` as a reference implementation when building a new theme is recommended.

---

## 8. Conventions

- **Server Components by default.** Adding `"use client"` is appropriate only when interactivity is required. Layouts, views, and static components should all be server-rendered.
- **No direct plugin imports.** Themes use `getActiveSlots()` to render plugin UI -- importing plugin modules directly is prohibited.
- **No hardcoded colors or fonts.** CSS custom properties defined in `design.ts` are the correct mechanism.
- **`sanitizeThemeName()` must gate any dynamic theme reference.** Using a raw user-supplied or config-supplied string in an import path is prohibited.
- **The theme `id` is immutable after install.** It keys the `theme_design_configs` table. Changing it orphans existing design configurations.
