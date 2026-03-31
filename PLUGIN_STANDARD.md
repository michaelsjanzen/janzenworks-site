# Pugmill Plugin Standard

This document defines the rules every Pugmill plugin must follow. These rules apply equally to human authors and AI agents installing or modifying plugins.

---

## Plugin anatomy

Every plugin lives in its own directory under `/plugins/`:

```
plugins/
  my-plugin/
    index.ts        -- required: exports a named const implementing PugmillPlugin
    manifest.json   -- required: id, name, version, description
    schema.ts       -- optional: Drizzle table definitions for plugin-owned tables
    README.md       -- recommended
```

### `manifest.json` shape

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What this plugin does.",
  "author": "Your Name",
  "homepage": "https://pugmill.dev/plugins/my-plugin",
  "pugmillVersion": "^0.1.0"
}
```

### `index.ts` shape

```ts
import type { PugmillPlugin } from "../../src/lib/plugin-registry";

export const myPlugin: PugmillPlugin = {
  id: "my-plugin",       // must match manifest.json and directory name
  name: "My Plugin",
  version: "1.0.0",
  initialize(hooks, settings) {
    // register hook listeners here
  },
};
```

---

## Installing a plugin (for AI agents)

**STEP 1** -- Create `/plugins/<plugin-id>/index.ts` and `/plugins/<plugin-id>/manifest.json`.

**STEP 2** -- Add a static import to `src/lib/plugin-registry.ts`:
```ts
import { myPlugin } from "../../plugins/my-plugin/index";
```
Dynamic `import()` and `require()` are prohibited -- Next.js/Turbopack requires all modules to be statically known at build time.

**STEP 3** -- Add the imported plugin to the `ALL_PLUGINS` array in `src/lib/plugin-registry.ts`.

**STEP 4** -- Activate by adding the plugin id to `config.modules.activePlugins` via the admin UI or by updating `pugmill.config.json`.

---

## Hook system

### Rules

- Hook names must come from `ActionCatalogue` or `FilterCatalogue` in `src/lib/hook-catalogue.ts`.
- Inventing hook names is not permitted. Adding a new hook means updating `hook-catalogue.ts` and the relevant core call site.
- TypeScript will reject unknown hook names at compile time -- this is intentional.

### Actions (fire-and-forget)

```ts
// Register
hooks.addAction("post:after-save", ({ post }) => {
  console.log("saved:", post.slug);
});

// Core fires
await hooks.doAction("post:after-save", { post });
```

Actions are for side effects. Return values are ignored.

### Filters (data transformation)

```ts
// Register
hooks.addFilter("content:render", ({ input, post }) => {
  return input + `<aside>Filed under post #${post.id}</aside>`;
});

// Core fires and gets back the transformed value
const html = await hooks.applyFilters("content:render", { input: rawHtml, post });
```

Filters receive a payload that includes an `input` key -- the value being transformed. The callback must return a value of the same type as `input`. Multiple filters run in registration order, each receiving the previous filter's output.

### Throwing from a hook

Throwing inside a standard action is caught and logged; it does not interrupt the request. Blocking an operation requires using an action hook marked STRICT (e.g. `comment:before-create`) and throwing; core catches this and surfaces the error to the user.

---

## Settings

Plugins declare their settings via `settingsDefs`. The admin UI renders a form automatically.

```ts
settingsDefs: [
  {
    key: "webhookUrl",
    label: "Webhook URL",
    type: "text",
    default: "",
    description: "URL to POST events to.",
  },
  {
    key: "apiKey",
    label: "API Key",
    type: "text",
    default: "",
    secret: true,     // masked in admin UI, never logged
    required: true,   // blocks save if empty
  },
  {
    key: "enabled",
    label: "Enable notifications",
    type: "boolean",
    default: true,
  },
  {
    key: "format",
    label: "Payload format",
    type: "select",
    default: "json",
    options: ["json", "form"],
  },
],
```

Settings are passed to `initialize(hooks, settings)` with defaults merged in. They are stored in `config.modules.pluginSettings` in the database.

---

## Database tables

### Rules

- Plugin-owned tables must be named `plugin_<id>_<tablename>` (e.g. `plugin_comments_threads`).
- No `REFERENCES` / foreign key constraints to core tables. Store core row IDs as plain integer columns.
- Referencing core data by integer value is fine -- the constraint is structural, not semantic.
- Plugin-to-plugin table references are also prohibited.

### Declaring a schema

```ts
// plugins/my-plugin/schema.ts
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const pluginMyPluginItems = pgTable("plugin_my_plugin_items", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(), // plain int, no REFERENCES constraint
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Wiring the schema to the plugin lifecycle

```ts
// plugins/my-plugin/index.ts
import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";

export const myPlugin: PugmillPlugin = {
  // ...
  schema: {
    async migrate() {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_my_plugin_items (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )
      `);
    },
    async teardown() {
      await db.execute(sql`DROP TABLE IF EXISTS plugin_my_plugin_items`);
    },
  },
};
```

`migrate()` is called on plugin activation. `teardown()` is called on uninstall. Omitting `teardown` preserves data after uninstall.

---

## Admin page

Plugins with `settingsDefs` get a generic settings form at `/admin/plugins/<id>` by default.

For richer UI, providing an `adminPage` React component is the right approach:

```ts
import type { AdminPageProps } from "../../src/lib/plugin-registry";

function MyAdminPage({ settings, onSave }: AdminPageProps) {
  // Custom UI
}

export const myPlugin: PugmillPlugin = {
  // ...
  adminPage: MyAdminPage,
};
```

Adding `"use client"` to the component is required when interactivity is needed. The component renders inside the standard Pugmill admin shell.

---

## Inter-plugin communication

Plugin-to-plugin imports are prohibited.

If two plugins need to communicate, the hook system or the database are the correct channels. For shared utility code between plugins, publishing it as a standalone npm package and declaring it as a dependency in both plugins is the standard approach.

---

## Distribution

Plugins are distributed as npm packages. Free plugins are published to the public npm registry. Premium plugins are gated by a license key validated at `registry.pugmill.dev`.

```bash
npx pugmill add plugin <name>         # install from registry
npx pugmill remove plugin <name>      # uninstall
```

The CLI handles: `npm install`, static import injection into `plugin-registry.ts`, and license key validation.

---

## Checklist for plugin authors

- [ ] Directory named `/plugins/<id>/` where `<id>` matches `manifest.json` and `PugmillPlugin.id`
- [ ] `index.ts` exports a named const implementing `PugmillPlugin`
- [ ] Static import added to `src/lib/plugin-registry.ts`
- [ ] Plugin added to `ALL_PLUGINS` array
- [ ] Only hook names from `hook-catalogue.ts` used
- [ ] DB tables named `plugin_<id>_<tablename>`
- [ ] No FK constraints to core tables
- [ ] No imports from other plugins
- [ ] Secret settings marked `secret: true`
- [ ] `npx tsc --noEmit` passes before shipping
