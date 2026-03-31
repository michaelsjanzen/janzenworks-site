# Changelog

All notable changes to Pugmill CMS are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.0] — 2026-03-31 — Public Beta

### Added

- **Bot Analytics plugin** — two-table model: `plugin_bot_analytics_daily` (composite PK upsert, 90-day retention) and `plugin_bot_analytics_recent` (ring buffer, 7-day / 500-row cap). Admin page shows visit totals by bot, resource type breakdown, recent visits table, and AI-generated insights when an AI provider is configured.
- **AEO endpoint bot tracking** — `llms.txt`, `llms-full.txt`, `sitemap.xml`, and `robots.txt` route handlers fire the new `request:bot-visit` action hook on every bot request, logging bot name, path, and resource type.
- **Dashboard Bot Analytics teaser** — AI Crawlers, Search Spiders, and Top Content (7-day) summary cards on the admin dashboard. Visible immediately after install; links to the full `/admin/bot-analytics` report.
- **`request:bot-visit` action hook** — new entry in `ActionCatalogue`; payload `{ botName: string; path: string; resourceType: string }`. Fired from AEO and discovery route handlers; consumed by the bot-analytics plugin.
- **Migration runner** (`scripts/run-migrations.ts`) — idempotent migration tracking via `schema_migrations` table; alphabetical file scan with `[skip]`/`[apply]` output; replaces the brittle chained npm script. `create-schema.ts` pre-marks all migrations as applied on fresh installs so the first boot completes in under 5 seconds.
- **Bot detection utilities** (`src/lib/bot-detection.ts`) — shared `detectBot()`, `classifyPath()`, `BOT_CONFIG`, `BOT_PATTERNS` covering 13 bots: ChatGPT, Claude, Perplexity, Gemini, Amazonbot, Meta, Cohere, CCBot (AI), Googlebot, Bingbot, DuckDuckBot, Bytespider, Applebot (search).
- **Per-post canonical URL and OG image** — `canonical_url` and `og_image_url` columns on the posts table; surfaced as SEO editor fields in the post editor.
- **AI Insights for Bot Analytics** — server action + `InsightsButton` client component; generates a natural language summary of bot traffic patterns when an AI provider is configured.
- **Replit install improvements:**
  - `tsx` added as a devDependency — removes the interactive npx install prompt that blocked `predev` on first boot.
  - `initialURL = "/admin/login"` in `.replit` webserver config — preview pane opens directly to the sign-in screen.
  - `HUSKY=0` in `.replit` env block — prevents git-lock conflicts during `npm install`.
  - `create-schema.ts` synced to full current schema and pre-marks all migrations on fresh installs — `predev` no longer times out.
  - Clean reinstall hint added to `.replit` for ENOTEMPTY errors when migrating from another platform.

### Changed

- **Sitemap and robots.txt** converted from Next.js metadata convention files (`src/app/sitemap.ts`, `src/app/robots.ts`) to explicit route handlers (`src/app/sitemap.xml/route.ts`, `src/app/robots.txt/route.ts`) to gain `Request` access for bot tracking.
- **Auth proxy** renamed from `src/middleware.ts` to `src/proxy.ts` per Next.js 16 convention (eliminates deprecation warning on startup).
- **Port default** changed from 3000 to 5000 in `dev` and `start` scripts, consistent with Replit's expected port.
- **`bot-analytics`** added to `activePlugins` in `pugmill.config.json` — enabled by default on fresh installs.

### Fixed

- **Autosave focus loss** — removed `revalidatePath` from `autosavePost` server action. The edit page no longer triggers a router refresh mid-keystroke; the AI natural language input and all other fields retain focus during background saves.
- **npm audit** — resolved 2 picomatch vulnerabilities (1 moderate, 1 high) via `npm audit fix`.

---

## [0.1.0] — 2026-03-30 — Developer Preview

Initial developer preview release.

### Included

- Full-stack CMS: posts, pages, categories, tags, media library with drag-and-drop upload
- Markdown-first Tiptap editor (Visual / Raw Markdown toggle, sticky toolbar, formatting shortcuts)
- AEO metadata per post (summary, Q&A pairs, entities, keywords); served via `/llms.txt`, `/llms-full.txt`, `/{slug}/llms.txt`
- JSON-LD structured data (`Article`, `FAQPage`) on every published post page
- Plugin system: `HookManager` with typed actions and filters; `ActionCatalogue` / `FilterCatalogue`
- Theme system: design token contract, draft/publish workflow, color presets, Google Fonts picker
- Default theme with full mobile navigation and design token customization
- NextAuth v5 authentication: Credentials, GitHub OAuth, Google OAuth; JWT sessions; `admin`/`editor` roles
- Storage abstraction: `LocalStorageProvider` (default) and `S3StorageProvider` (AWS S3, R2, DO Spaces, MinIO)
- REST API (`/api/posts`, `/api/categories`, `/api/tags`, `/api/media`) — read-only, CORS-enabled, `{ data, meta }` envelope
- AI integration: Anthropic, OpenAI, Gemini — Generate All sequential agent, Rewrite with instructions, Tone Check, Reading Level, Topic Focus, Internal Links, Social Post generation, Intent Classification
- Per-post SEO fields: `seo_title`, `seo_meta_description`, `robots_noindex`, `robots_nofollow`
- Admin dashboard with Getting Started onboarding checklist and monthly activity charts
- Content revisions: every save creates a snapshot; any previous version is restorable from the edit page
- RSS 2.0 feed (`/feed.xml`) with `atom:link` self-reference
- Security: bcryptjs (12 rounds), rehype-sanitize, Zod validation, rate limiting (login + AI), security headers, Husky secret-scanning pre-commit hook
- Replit-ready: `replit-init.ts` first-run wizard with sentinel pattern, auto-generated secrets, domain detection
- Built-in plugins: default-widgets, contact-form, cookie-consent
