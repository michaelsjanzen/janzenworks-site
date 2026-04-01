# Pugmill CMS Plugin Authoring Guide

Plugins extend Pugmill CMS without touching core. They live in `/plugins/<plugin-id>/` and are registered statically in `src/lib/plugin-registry.ts`. This guide covers everything needed to build and distribute a plugin.

---

## 0. Should This Be a Plugin?

Before writing any code, applying the scope filter from [`PHILOSOPHY.md`](./PHILOSOPHY.md) is the right first step.

**Building a plugin is appropriate when:**
- The feature runs persistently (on every request, page load, or CMS event)
- It hooks into core lifecycle events via the `HookManager`
- Multiple unrelated Pugmill CMS users would need it in roughly the same form
- It requires an admin UI that will be used repeatedly over time

**Writing a one-off script is more appropriate when:**
- This is a one-time migration, data transform, or setup task
- It is specific to this site's content or configuration
- An AI agent can generate it correctly from the Drizzle schema alone
- It does not need to run after the initial execution

**Examples of things that should not be plugins:**
- Content importers from WordPress, Ghost, or other platforms -- an agent generates these on demand per site
- One-time slug cleanup or data normalization scripts
- Custom report exports for a specific use case

Starting with a script is the practical approach. If you find yourself running it repeatedly or wishing it had an admin UI, that is a plugin candidate.

---

## 0.5 Built-in vs Enhanced

Plugins follow the same two-level pattern as core features. The full principle is in `PHILOSOPHY.md`.

- **Built-in:** The plugin works fully with no AI provider configured. All settings-driven behavior, hook logic, and UI must function without `config.ai.provider`.
- **Enhanced:** When the plugin can benefit from AI (generation, classification, suggestions), those capabilities are additive -- they appear when AI is configured and are absent otherwise. The plugin must not fail or degrade core behavior when AI is unavailable.

A plugin that requires an AI API key to function at all should make that explicit in its `manifest.json` description and surface a clear message in the admin UI when the dependency is missing.

---

## 1. File Structure

```
plugins/
  my-plugin/
    index.ts          # Required. Exports the PugmillPlugin object.
    manifest.json     # Required. Plugin metadata.
    schema.ts         # Optional. Drizzle table definitions for plugin-owned tables.
    db.ts             # Optional. Query helpers.
    actions.ts        # Optional. Next.js server actions.
    components/       # Optional. React components for slots or the admin page.
      MyComponent.tsx
```

### `manifest.json`

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "One-line description shown in the admin UI."
}
```

The `id` must match the directory name and use only lowercase letters, numbers, and hyphens (`[a-z0-9-]`).

---

## 2. Installation Contract (4 Steps)

When installing a plugin -- manually or via `npx pugmill add plugin <name>` -- updating these four places in order is required:

**STEP 1** -- Create `/plugins/<plugin-id>/index.ts` and `/plugins/<plugin-id>/manifest.json`.

**STEP 2** -- Add a static import in `src/lib/plugin-registry.ts`:
```typescript
import { myPlugin } from "../../plugins/my-plugin/index";
```
Dynamic `import()` and `require()` are not allowed -- Turbopack requires all plugin modules to be statically known at build time.

**STEP 3** -- Add the plugin to `ALL_PLUGINS` in `src/lib/plugin-registry.ts`:
```typescript
const ALL_PLUGINS: PugmillPlugin[] = [
  commentsPlugin,
  cookieConsentPlugin,
  myPlugin,  // add here
];
```

**STEP 4** -- Activate the plugin via the admin UI (`/admin/plugins`) or add its id to `config.modules.activePlugins` in the database.

---

## 3. The `PugmillPlugin` Interface

```typescript
import type { PugmillPlugin } from "../../src/lib/plugin-registry";

export const myPlugin: PugmillPlugin = {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  description: "Does something useful.",

  settingsDefs: [...],   // optional
  schema: {...},         // optional -- only if the plugin needs DB tables
  slots: {...},          // optional -- frontend UI injection points
  adminPage: MyAdminPage, // optional -- custom admin screen
  actionHref: "/admin/my-plugin", // optional -- sidebar sub-nav entry

  async initialize(hooks, settings) {
    // Register hook listeners here.
  },

  destroy() {
    // Called on clean server shutdown (SIGTERM/SIGINT). Optional.
    // NOT called on plugin deactivation -- deactivation takes effect on the
    // next cold start, at which point this plugin will not be initialized.
    // Safe to omit if initialize() only registers hook listeners.
  },
};
```

---

## 4. Settings (`settingsDefs`)

Settings are rendered automatically as an inline panel on the plugin card (when no `adminPage` is defined). Saved values are passed into `initialize()`.

```typescript
settingsDefs: [
  {
    key: "apiKey",
    label: "API Key",
    type: "text",
    default: "",
    description: "Your service API key.",
    secret: true,    // masks value in admin UI; never log it
    required: true,  // prevents saving if empty
  },
  {
    key: "enabled",
    label: "Enable Feature",
    type: "boolean",
    default: true,
  },
  {
    key: "mode",
    label: "Mode",
    type: "select",
    default: "auto",
    options: ["auto", "manual"],
  },
],
```

**Field types:** `"text"` | `"boolean"` | `"select"`

Inside `initialize()`, settings values are already resolved (defaults merged with saved values):

```typescript
async initialize(hooks, settings) {
  const apiKey = settings.apiKey as string;
  const enabled = settings.enabled as boolean;
}
```

---

## 5. Hooks

Hooks are how plugins react to CMS events and transform data. All available hooks are defined in `src/lib/hook-catalogue.ts` -- plugins may only use hooks listed there.

### Actions -- side effects

Actions are fire-and-forget. Listener errors are caught, logged, and surfaced as admin notifications; they never affect the calling operation.

```typescript
async initialize(hooks, settings) {
  hooks.addAction("post:after-save", async ({ post }) => {
    await fetch("https://example.com/webhook", {
      method: "POST",
      body: JSON.stringify({ slug: post.slug }),
    });
  });

  hooks.addAction("user:after-login", ({ user }) => {
    console.log(`${user.email} logged in`);
  });
}
```

### Strict Actions -- rejection hooks

Some hooks use `doActionStrict()` at the call site, meaning a listener can throw to abort the operation. The thrown message is shown to the user. The `comment:before-create` hook works this way and is the standard pattern for spam filtering or rate limiting.

```typescript
hooks.addAction("comment:before-create", ({ comment }) => {
  if (isSpam(comment.content)) {
    throw new Error("Your comment was flagged as spam.");
  }
});
```

Throwing from a regular (non-strict) action hook has no useful effect -- the error is caught and reported as a notification.

### Filters -- data transformation

Filters transform data. Every filter has an `input` key -- the value being transformed. Return a new value of the same type. Multiple filters run in registration order, each receiving the previous filter's output.

```typescript
hooks.addFilter("content:render", ({ input, post }) => {
  return input + `\n\n---\n*Filed under: ${post.type}*`;
});

hooks.addFilter("head:meta", ({ input, post }) => {
  return [
    ...input,
    { name: "twitter:label1", content: "Reading time" },
    { name: "twitter:data1", content: "5 min" },
  ];
});
```

**Available hooks** -- see `src/lib/hook-catalogue.ts` for full payload types:

| Hook | Type | Payload |
|---|---|---|
| `post:after-save` | Action | `{ post: PostPayload }` |
| `post:before-delete` | Action | `{ postId: number }` |
| `post:after-publish` | Action | `{ post: PostPayload }` |
| `media:after-upload` | Action | `{ file: MediaPayload }` |
| `media:after-delete` | Action | `{ fileId: number }` |
| `user:after-login` | Action | `{ user: UserPayload }` |
| `user:after-logout` | Action | `{ userId: string }` |
| `comment:before-create` | **Strict Action** | `{ comment: CommentDraft }` |
| `comment:after-create` | Action | `{ comment: CommentPayload }` |
| `comment:after-approve` | Action | `{ commentId: number; approved: boolean }` |
| `consent:after-accept` | Action | `{ categories: { essential: true; nonEssential: boolean } }` |
| `consent:after-update` | Action | `{ categories: { essential: true; nonEssential: boolean } }` |
| `content:render` | Filter | `{ input: string; post: PostPayload }` |
| `content:excerpt` | Filter | `{ input: string; post: PostPayload }` |
| `nav:items` | Filter | `{ input: NavItem[] }` |
| `head:meta` | Filter | `{ input: MetaTag[]; post?: PostPayload }` |
| `api:post:response` | Filter | `{ input: Record<string, unknown>; post: PostPayload }` |

### Proposing a new hook

If none of the available hooks fit your use case, do not invent a hook name. The correct path:

1. **Check first** — scan `src/lib/hook-catalogue.ts` carefully. A hook that fires at the right moment may exist under a slightly different name.
2. **Add to the catalogue** — add the new hook name and payload type to `ActionCatalogue` or `FilterCatalogue` in `hook-catalogue.ts`. Follow the existing JSDoc pattern; mark strict actions with `@strict`.
3. **Add the call site** — add the corresponding `hooks.doAction()` or `hooks.applyFilters()` call in the relevant core action file. Remember `await loadPlugins()` before any hook call (see §12).
4. **Keep the name scoped** — use `namespace:event` convention (`post:after-save`, not `save` or `afterSave`). Choose a namespace that will make sense to future plugin authors.

New hooks added to the catalogue become part of the public plugin API — other plugins can register listeners. Name them carefully; renaming a hook later is a breaking change for anyone depending on it.

---

## 6. Database Schema

If the plugin needs its own tables, implementing `schema.migrate()` and optionally `schema.teardown()` is required.

**Naming rule:** all plugin tables must be named `plugin_<plugin-id>_<tablename>`.

**FK rule:** no `REFERENCES` / foreign key constraints to core tables. Store IDs as plain integers. This prevents constraint errors when core rows are deleted independently.

```typescript
// plugins/my-plugin/schema.ts
import { pgTable, serial, integer, text, timestamptz } from "drizzle-orm/pg-core";

export const pluginMyPluginItems = pgTable("plugin_my_plugin_items", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),   // no FK -- plain integer reference
  content: text("content").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});
```

```typescript
// In index.ts
import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";

schema: {
  async migrate() {
    // Must be idempotent -- runs on every cold start.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plugin_my_plugin_items (
        id         SERIAL PRIMARY KEY,
        post_id    INTEGER NOT NULL,
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },
  async teardown() {
    // Called on plugin uninstall. Drops all owned tables.
    await db.execute(sql`DROP TABLE IF EXISTS plugin_my_plugin_items`);
  },
},
```

`migrate()` is called automatically before `initialize()` on each cold start. It must be idempotent (`IF NOT EXISTS`). `teardown()` is optional -- omitting it preserves data after uninstall.

---

## 7. Frontend Slots

Slots let plugins inject React components into theme pages without the theme importing the plugin directly.

### `postFooter`

Rendered below post content on blog-post pages. Receives `{ postId, postSlug }`.

```typescript
// plugins/my-plugin/components/MyPostFooter.tsx
// May be a Server Component -- omit "use client" unless interactivity is needed.

export default function MyPostFooter({ postId, postSlug }: { postId: number; postSlug: string }) {
  return <div>Related to post {postSlug}</div>;
}
```

```typescript
// In index.ts
import MyPostFooter from "./components/MyPostFooter";

slots: {
  postFooter: MyPostFooter,
},
```

### `siteBanner`

Rendered on every page, appended after the theme layout. Intended for full-width banners (cookie consent, announcements). Receives `{ settings: PluginSettings }` -- resolved plugin settings passed from the server so the component avoids a separate fetch.

```typescript
// plugins/my-plugin/components/MyBanner.tsx
"use client";
import type { PluginSettings } from "../../../src/lib/plugin-registry";

export default function MyBanner({ settings }: { settings: PluginSettings }) {
  const text = settings.bannerText as string;
  return <div className="fixed bottom-0 w-full bg-zinc-900 text-white p-4">{text}</div>;
}
```

### Security — sanitizing user content in slots

Frontend slot components run in the site's public page layout. If a slot component renders any user-generated content (comments, form input, submitted text), that content **must** be sanitized before rendering.

Use the `sanitize-html` package already present in the project:

```typescript
import sanitizeHtml from "sanitize-html";

export default function MyPostFooter({ postId }: { postId: number }) {
  // If rendering user content fetched from the DB:
  const safeContent = sanitizeHtml(rawUserContent, {
    allowedTags: ["b", "i", "em", "strong", "p"],
    allowedAttributes: {},
  });
  return <div dangerouslySetInnerHTML={{ __html: safeContent }} />;
}
```

**Rules:**
- Never pass user-generated content directly to `dangerouslySetInnerHTML` without sanitizing first.
- When user content is rendered as plain text (inside a JSX expression, not `dangerouslySetInnerHTML`), React escapes it automatically — no extra work needed.
- Slot components that render only static text or plugin settings do not need sanitization.

---

## 8. Public Routes

Plugins that need public-facing pages or API endpoints add files to `src/app/` using the same mirrored structure that recipes use for distribution.

**Prefix all paths with the plugin id** to avoid collisions with core routes and other plugins.

### Public pages

```
src/app/(site)/my-plugin/          → yourdomain.com/my-plugin
  page.tsx                         → yourdomain.com/my-plugin (index)
  [slug]/page.tsx                  → yourdomain.com/my-plugin/some-slug
```

```tsx
// src/app/(site)/my-plugin/page.tsx
// Server component — renders inside the active theme layout automatically.

export default async function MyPluginPage() {
  return <div>Public plugin page</div>;
}
```

### Public API routes

```
src/app/api/my-plugin/route.ts     → /api/my-plugin
src/app/api/my-plugin/[id]/route.ts
```

```typescript
// src/app/api/my-plugin/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true });
}
```

### Rules

- **Always prefix** route paths with the plugin id: `src/app/(site)/my-plugin/`, `src/app/api/my-plugin/`. Never `src/app/(site)/contact/` or `src/app/api/submit/`.
- Route files live in `src/`, not in `plugins/`. They are separate from the plugin directory.
- Public pages inside `(site)/` are automatically wrapped in the active theme's `Layout.tsx` — no extra wiring needed.
- If the plugin is deactivated, its routes still exist in `src/app/` — either guard the page content with a check, or document that routes must be removed manually on uninstall.

---

## 9. Custom Admin Page

For plugins that need to display or manage data, providing an `adminPage` component is the right pattern. It renders at `/admin/plugins/<plugin-id>` and handles its own data fetching and server actions. `searchParams` are passed through for filter and pagination support.

```typescript
// plugins/my-plugin/components/MyAdminPage.tsx
// Server component -- no "use client".

import { db } from "../../../src/lib/db";
import { pluginMyPluginItems } from "../schema";

export default async function MyAdminPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const items = await db.select().from(pluginMyPluginItems);
  return (
    <div>
      <h1>My Plugin</h1>
      {items.map(item => <div key={item.id}>{item.content}</div>)}
    </div>
  );
}
```

When `adminPage` is set, the inline settings panel is hidden from the plugin card. Any settings UI should be moved into the admin page.

---

## 10. Sidebar Sub-Nav (`actionHref`)

When set, `actionHref` causes the plugin to appear as a sub-section under Notifications in the admin sidebar. Use this for plugins that have a moderation queue or primary action destination.

```typescript
actionHref: "/admin/my-plugin",
```

The sidebar shows unread notification counts alongside the link. The admin page at `/admin/plugins/<id>` (for settings) is separate from this.

---

## 11. Notifications

Plugins can surface events to admin users via the notification feed.

```typescript
import { createNotification } from "../../src/lib/notifications";

hooks.addAction("post:after-publish", async ({ post }) => {
  await createNotification({
    pluginId: "my-plugin",
    type: "info",          // "info" (default) | "warning" | "error"
    message: `"${post.title}" was published.`,
    href: `/admin/posts/${post.id}`,
    replaceKey: `published:${post.id}`, // optional -- upserts instead of inserting
  });
});
```

Using `replaceKey` for aggregate counts (e.g. "5 items pending") updates the count in place rather than creating a new notification each time. The key is scoped to the `pluginId`.

Calling `deletePluginNotifications(pluginId)` from `teardown()` cleans up on uninstall.

---

## 12. Server Actions

Plugin server actions must call `await loadPlugins()` in each exported function. Layouts are not re-rendered during server action requests, so `initialize()` may not have run. `loadPlugins()` is idempotent -- it returns immediately if already loaded.

### Admin-only actions

Auth check first (lightweight), then `loadPlugins()`:

```typescript
// plugins/my-plugin/actions.ts
"use server";

import { loadPlugins } from "../../src/lib/plugin-loader";
import { getCurrentUser } from "../../src/lib/get-current-user";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
  return user;
}

export async function myAdminAction(id: number) {
  const user = await requireAdmin(); // auth first
  await loadPlugins();               // then plugins
  // ...
}
```

### Public-facing actions

Actions callable by unauthenticated visitors — contact forms, newsletter signups, public votes — omit the auth guard but still require `loadPlugins()`. Return a typed result object rather than throwing, so errors reach the user gracefully:

```typescript
export async function submitContactForm(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await loadPlugins(); // no auth guard — public action
  try {
    const name = (formData.get("name") as string ?? "").trim();
    const email = (formData.get("email") as string ?? "").trim();
    if (!name || !email) return { ok: false, error: "Name and email are required." };
    // ... write to DB
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
```

**Do not add an auth guard to a public action** — `getCurrentUser()` returns `null` for visitors, and checking `if (!user) throw new Error("Unauthorized")` would silently block every public submission. If the action should be available to anyone, the absence of an auth guard is correct and intentional.

---

## 13. Distributing as a Recipe

If you want to share a plugin with the Pugmill community, package it as a recipe. A recipe is a GitHub repository containing your plugin files plus a `RECIPE.md` that tells an AI agent how to install it.

The full spec is in [`RECIPE_AUTHORING.md`](./RECIPE_AUTHORING.md). The short version:

1. Create a GitHub repository named `pugmill-recipe-<plugin-id>`.
2. Use a **mirrored directory structure** — the repo layout matches where files land in Pugmill. Plugin files go in `plugins/<id>/`, routes in `src/app/`, lib files in `src/lib/`. An agent installs by overlaying the repo onto the Pugmill project root.
3. If your plugin needs a migration script, place it in `migrations/`.
4. Write a `RECIPE.md` at the repository root using the Agent Skills frontmatter format. The body should be step-by-step installation instructions for an AI agent, referencing this guide for the 4-step installation contract.
5. Submit a listing to the [Pugmill community directory](https://github.com/michaelsjanzen/pugmill-recipe-community).

---

## 14. Conventions

- **No plugin-to-plugin imports.** Shared hooks are the mechanism for inter-plugin communication. Shared utilities belong in npm packages.
- **Table naming:** `plugin_<plugin-id>_<tablename>` -- no exceptions.
- **No FK constraints to core tables** -- store IDs as plain integers.
- **Hook names** must come from `ActionCatalogue` / `FilterCatalogue` in `hook-catalogue.ts`. Proposing a new hook means adding it to the catalog and updating the relevant core call site.
- **Secrets** in settings should set `secret: true`. Logging them is prohibited.
- **`initialize()` is for registering listeners**, not for running queries on every request. Heavy startup work should be gated or cached.
- **Public actions omit auth guards.** An action callable by unauthenticated visitors must not check `getCurrentUser()` and throw — that silently blocks all public submissions. See §12 for the correct pattern.
- **Route paths must be prefixed with the plugin id.** `src/app/(site)/my-plugin/` not `src/app/(site)/contact/`. See §8.
