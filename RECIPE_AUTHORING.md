# Pugmill CMS Recipe Authoring Guide

Recipes are the community distribution format for Pugmill plugins and themes. A recipe is a GitHub repository containing all the files needed to install an extension, plus a `RECIPE.md` that gives an AI agent clear, unambiguous installation instructions.

---

## What is a Recipe?

In the Pugmill three-tier architecture:

- **Core** ships with every installation — maintained by the Pugmill team
- **Bundled plugins** ship with core in `/plugins/` — maintained by the Pugmill team
- **Recipes** are community-authored extensions hosted on GitHub and discoverable through the Pugmill community directory

A recipe is always either a **plugin recipe** or a **theme recipe**. The format follows the [Agent Skills](https://agentskills.io) open standard — `RECIPE.md` is structurally identical to a `SKILL.md` file and compatible with any Agent Skills-aware agent (including Claude Code).

The key idea: an AI agent can install any Pugmill recipe by reading `RECIPE.md` and following the instructions. No registry service, no installer tooling, no proprietary format.

---

## RECIPE.md Format

`RECIPE.md` lives at the root of the recipe repository. It uses YAML frontmatter (the Agent Skills spec) followed by installation instructions written for an AI agent.

### Frontmatter

```yaml
---
name: pugmill-recipe-my-extension
description: >
  One-paragraph description of what this recipe does and when to use it.
  Written for an AI agent — include what hooks it registers, what DB tables
  it creates, whether it adds routes to src/app/, and any secrets required.
  Max 1024 characters.
compatibility: "Pugmill CMS v0.2+. Plugin recipe. No routes. Requires SENDGRID_API_KEY secret."
license: MIT
metadata:
  type: plugin
  pugmill-version: "0.2"
  has-routes: "false"
  has-migrations: "true"
---
```

**Required fields:**

| Field | Description |
|---|---|
| `name` | Kebab-case. Max 64 characters. Must match the GitHub repository name exactly. |
| `description` | What it does and when to use it. Written for an AI agent. Max 1024 characters. |
| `compatibility` | Must include "Pugmill CMS" and the minimum version. |

**Recommended metadata:**

| Key | Values | Purpose |
|---|---|---|
| `metadata.type` | `"plugin"` or `"theme"` | Tells the agent which installation contract to follow |
| `metadata.pugmill-version` | e.g. `"0.2"` | Minimum Pugmill CMS version required |
| `metadata.has-routes` | `"true"` or `"false"` | Whether the recipe adds files to `src/app/` |
| `metadata.has-migrations` | `"true"` or `"false"` | Whether the recipe adds database migration scripts |

**Optional fields:**

| Field | Description |
|---|---|
| `license` | SPDX identifier (e.g. `MIT`, `Apache-2.0`) |

> **Note on `name`:** The Agent Skills spec requires `name` to match the directory name. For Pugmill recipes, `name` is the full GitHub repository name (e.g. `pugmill-recipe-contact-form`). The plugin id inside `manifest.json` (e.g. `contact-form`) is a separate, shorter identifier used within Pugmill itself.

### Body

The body is the installation instructions. Write them for an AI agent — step by step, unambiguous, referencing the authoritative Pugmill guides rather than duplicating their content.

A well-written recipe body:
- States what the recipe does in one sentence
- States the plugin or theme id (from `manifest.json`)
- References `PLUGIN_AUTHORING.md` or `THEME_AUTHORING.md` for the installation contract
- Calls out anything non-standard: extra routes, migration scripts, required secrets
- Lists any post-install steps the human needs to take (activating the plugin, adding secrets, etc.)

Keep the body under 5000 tokens (~3500 words). If your installation instructions are longer than that, the recipe is too large.

---

## Package Structure

### Plugin Recipe

```
pugmill-recipe-my-plugin/   ← GitHub repository root; matches RECIPE.md name
  RECIPE.md                 ← Required. Agent Skills-compatible installation instructions.
  README.md                 ← Recommended. Human-readable docs (screenshots, config examples).
  index.ts                  ← Required. PugmillPlugin export.
  manifest.json             ← Required. Plugin metadata (id, name, version, description).
  schema.ts                 ← Optional. Drizzle table definitions for plugin-owned tables.
  db.ts                     ← Optional. Query helpers.
  actions.ts                ← Optional. Next.js server actions.
  components/               ← Optional. React components for slots or the admin page.
  routes/                   ← Optional. Files to copy into src/app/.
    api/
      my-plugin/
        route.ts
  migrations/               ← Optional. Scripts to copy into /scripts/ and add to db:migrate.
    migrate-NNN-my-plugin.ts
```

**Plugin files** (`index.ts`, `manifest.json`, `schema.ts`, `components/`, etc.) sit at the repository root — this mirrors the structure they will have inside `/plugins/<plugin-id>/` after installation.

**`routes/`** maps directly to `src/app/`. Each file is copied to the same relative path. Example: `routes/api/my-plugin/route.ts` → `src/app/api/my-plugin/route.ts`. Prefix all route paths with your plugin id to avoid conflicts with core routes.

**`migrations/`** contains Drizzle migration scripts. Each file is copied to `/scripts/` and appended to the `db:migrate` command chain in `package.json`. Scripts must use `IF NOT EXISTS` / `IF EXISTS` guards — they must be safe to run multiple times.

### Theme Recipe

```
pugmill-theme-my-theme/     ← GitHub repository root; matches RECIPE.md name
  RECIPE.md                 ← Required.
  README.md                 ← Recommended.
  manifest.json             ← Required.
  Layout.tsx                ← Required.
  design.ts                 ← Required.
  views/
    HomeView.tsx            ← Required.
    PostView.tsx            ← Required.
    PageView.tsx            ← Required.
  components/               ← Optional. Shared UI components.
```

Theme recipe files mirror the structure they will have inside `/themes/<theme-id>/` after installation.

---

## Installing a Plugin Recipe

When an AI agent installs a plugin recipe:

1. Read `RECIPE.md` fully before taking any action.
2. Identify the plugin id from `manifest.json` (`id` field).
3. Copy all plugin files (everything except `RECIPE.md`, `README.md`, `routes/`, `migrations/`) into `/plugins/<plugin-id>/`.
4. If `routes/` is present: copy each file to its corresponding path under `src/app/`.
5. If `migrations/` is present: copy each script to `/scripts/` and append it to the `db:migrate` command chain in `package.json`.
6. Follow the **4-step plugin installation contract** in `PLUGIN_AUTHORING.md`:
   - Add a static import in `src/lib/plugin-registry.ts`
   - Add the plugin to `ALL_PLUGINS`
   - Activate via Admin > Settings > Plugins (or set `config.modules.activePlugins`)
7. If migrations were added: run `npm run db:migrate`.
8. Restart the dev server.

## Installing a Theme Recipe

When an AI agent installs a theme recipe:

1. Read `RECIPE.md` fully before taking any action.
2. Identify the theme id from `manifest.json` (`id` field).
3. Copy all theme files into `/themes/<theme-id>/`.
4. Follow the **6-step theme installation contract** in `THEME_AUTHORING.md`:
   - Add the id to `THEME_ALLOWLIST` in `src/lib/theme-registry.ts`
   - Add static imports in `src/lib/theme-modules.ts`
   - Import the manifest and add it to `ALL_THEMES` in `src/lib/theme-registry.ts`
5. Activate the theme in Admin > Design > Themes.

---

## Distribution

Recipes are hosted on GitHub in the author's own account. Naming conventions:

| Type | Repository name |
|---|---|
| Plugin recipe | `pugmill-recipe-<plugin-id>` |
| Theme recipe | `pugmill-theme-<theme-id>` |

To have your recipe listed in the Pugmill community directory, submit a listing to the [community plugin](https://github.com/michaelsjanzen/pugmill-recipe-community) following its submission instructions. A listing includes: recipe name, description, repository URL, type, and Pugmill version compatibility.

An AI agent can install any recipe directly from a GitHub URL — share your repository URL and a compatible agent will read `RECIPE.md` and follow the instructions.

---

## Conventions

- **Write `RECIPE.md` for an AI agent**, not for a human. Assume the agent has read `PLUGIN_AUTHORING.md` or `THEME_AUTHORING.md` and knows the installation contract, but has no other context about your specific recipe.
- **No secrets in recipe files.** Required API keys or credentials must be documented in `RECIPE.md` as settings the human adds after install — never hardcoded in source files.
- **Route paths must be prefixed with your plugin id** to avoid conflicts with core routes (e.g. `src/app/api/my-plugin/`, not `src/app/api/items/`).
- **Migration scripts must be idempotent** — use `IF NOT EXISTS` / `IF EXISTS` guards everywhere.
- **Theme ids are immutable after install.** The id keys the `theme_design_configs` table. Changing it after users have saved design configurations orphans their data. Choose carefully.
- **Test your recipe cold** — follow your own `RECIPE.md` from a fresh Pugmill install using only the instructions provided, before publishing.

---

## Validation

The [Agent Skills reference library](https://github.com/agentskills/agentskills/tree/main/skills-ref) validates `RECIPE.md` frontmatter against the Agent Skills spec:

```bash
# Install the reference library
pip install git+https://github.com/agentskills/agentskills.git#subdirectory=skills-ref

# Validate your recipe
skills-ref validate ./pugmill-recipe-my-plugin
```

This checks that `name`, `description`, frontmatter structure, and field lengths conform to the spec.
