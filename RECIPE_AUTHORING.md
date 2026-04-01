# Pugmill CMS Recipe Authoring Guide

**If you are an AI agent creating a recipe:** activate the `create-pugmill-recipe` skill (`.agents/skills/create-pugmill-recipe/SKILL.md`) for a task-focused workflow. This document is the full reference.

Recipes are the community distribution format for Pugmill plugins and themes. A recipe is a GitHub repository containing all the files needed to install an extension, plus a `RECIPE.md` that gives an AI agent clear, unambiguous installation instructions.

---

## What is a Recipe?

In the Pugmill three-tier architecture:

- **Core** ships with every installation — maintained by the Pugmill team
- **Bundled plugins** ship with core in `/plugins/` — maintained by the Pugmill team
- **Recipes** are community-authored extensions hosted on GitHub and discoverable through the Pugmill community directory

A recipe is always either a **plugin recipe** or a **theme recipe**. The format follows the [Agent Skills](https://agentskills.io) open standard — `RECIPE.md` is structurally identical to a `SKILL.md` file and compatible with any Agent Skills-aware agent (including Claude Code).

The key idea: an AI agent can install any Pugmill recipe by reading `RECIPE.md` and following the instructions. No registry service, no installer tooling, no proprietary format.

### Recipes vs Skills

Recipes and skills are both agent-readable Markdown files in the Agent Skills format. The difference is in purpose and lifecycle:

| | Recipe | Skill |
|---|---|---|
| **What** | A packaged extension to install | On-demand guidance for a task |
| **Lifecycle** | Installed once; becomes part of the codebase | Activated on demand; leaves no permanent files |
| **Lives** | Author's GitHub account | `.agents/skills/` in a project |
| **Written for** | The agent doing the install | The agent doing the task |

A recipe is a deliverable. A skill is a workflow guide. Pugmill ships a `create-pugmill-recipe` skill that helps agents author recipes — a skill whose output is a recipe.

### The trust model

Recipes represent a deliberate point in the trust spectrum between "human writes all code" and "agent generates code on demand." A recipe is written once by a human author, reviewed by the community, and then executed by agents on behalf of users. This is fundamentally safer than a fully agent-generated approach: the code being installed was authored and published by a human, not synthesized at install time from a prompt.

This matters for the agents installing recipes too. An agent reading `RECIPE.md` should still review source files before copying them — the recipe format reduces risk but does not eliminate the need for judgment. See `AGENT.md` for the security review requirement.

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

> **Note on `name`:** The Agent Skills spec requires `name` to match the directory name. For Pugmill recipes, `name` is the full GitHub repository name (e.g. `pugmill-recipe-contact-form`). `git clone` defaults to a directory matching the repository name, so `skills-ref validate` works correctly when the repo is cloned with default settings. The plugin id inside `manifest.json` (e.g. `contact-form`) is a separate, shorter identifier used within Pugmill itself.

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

Recipes use a **mirrored directory structure** — the repository layout matches where files will land in the Pugmill installation. An agent installs a recipe by overlaying the repo onto the Pugmill project root, skipping `RECIPE.md`, `README.md`, and `LICENSE`.

This design was chosen deliberately: rather than inventing a mapping format (`destination:`, `routes/`, etc.), the repo *is* the overlay. An agent needs no parsing logic — it copies the directory structure. Recipe authors need no mapping knowledge — they put files where they would live in Pugmill. Zero ceremony in both directions.

### Plugin Recipe (no routes)

For plugins that don't add public pages, API routes, or shared lib files:

```
pugmill-recipe-my-plugin/   ← GitHub repository root; matches RECIPE.md name
  RECIPE.md                 ← Required. Agent Skills-compatible. Not copied.
  README.md                 ← Recommended. Human-readable docs. Not copied.
  LICENSE                   ← Optional. Not copied.
  plugins/
    my-plugin/
      index.ts              ← Required. PugmillPlugin export.
      manifest.json         ← Required. Plugin metadata.
      schema.ts             ← Optional. Drizzle table definitions.
      db.ts                 ← Optional. Query helpers.
      actions.ts            ← Optional. Next.js server actions.
      components/           ← Optional. React components.
```

### Plugin Recipe (with routes or shared lib files)

For plugins that add public pages, API routes, or shared library files:

```
pugmill-recipe-my-plugin/
  RECIPE.md                 ← Required. Not copied.
  README.md                 ← Recommended. Not copied.
  plugins/
    my-plugin/              ← Copied to Pugmill's plugins/my-plugin/
      index.ts
      manifest.json
      schema.ts
      components/
  src/
    app/
      (site)/
        my-plugin/          ← Public pages. Prefix with plugin id.
          page.tsx
      api/
        my-plugin/          ← API routes. Prefix with plugin id.
          route.ts
    lib/
      my-plugin-utils.ts    ← Shared lib files. Prefix name with plugin id.
  migrations/               ← Optional. Scripts for /scripts/ + package.json db:migrate chain.
    migrate-NNN-my-plugin.ts
```

`src/app/` and `src/lib/` files are copied to their matching paths in the Pugmill project. Prefix all paths and filenames with your plugin id to avoid conflicts with core files and other plugins.

**`migrations/`** contains Drizzle migration scripts copied to `/scripts/` and appended to the `db:migrate` command chain in `package.json`. Scripts must use `IF NOT EXISTS` / `IF EXISTS` guards.

> **Note:** If your plugin only needs database tables, implement `schema.migrate()` in `plugins/<id>/index.ts` instead — it runs automatically on cold start and no `migrations/` directory is needed. See `PLUGIN_AUTHORING.md` section 6.

### Theme Recipe

```
pugmill-theme-my-theme/     ← GitHub repository root; matches RECIPE.md name
  RECIPE.md                 ← Required. Not copied.
  README.md                 ← Recommended. Not copied.
  themes/
    my-theme/               ← Copied to Pugmill's themes/my-theme/
      manifest.json         ← Required.
      Layout.tsx            ← Required.
      design.ts             ← Required.
      views/
        HomeView.tsx        ← Required.
        PostView.tsx        ← Required.
        PageView.tsx        ← Required.
      components/           ← Optional.
```

---

## What a Well-Written RECIPE.md Enables

This section describes what happens when an agent installs your recipe — useful for understanding what your instructions need to cover.

### Plugin recipe installation flow

A complete RECIPE.md body should enable an agent to:

1. Identify the plugin id from `plugins/<id>/manifest.json`
2. Copy `plugins/` into the Pugmill project root
3. Copy `src/` contents (if present) into Pugmill's `src/`, preserving structure
4. Copy `migrations/` scripts (if present) to `/scripts/` and add them to the `db:migrate` chain in `package.json`
5. Follow the 4-step plugin installation contract in `PLUGIN_AUTHORING.md` (static import, `ALL_PLUGINS`, activate)
6. Run `npm run db:migrate` if migrations were added
7. Restart the dev server and verify

Your RECIPE.md body should call out steps 3–7 only when they apply to your recipe. Step 5 can be handled by referencing `PLUGIN_AUTHORING.md` steps 2–3 rather than duplicating the code.

### Theme recipe installation flow

A complete RECIPE.md body should enable an agent to:

1. Identify the theme id from `themes/<id>/manifest.json`
2. Copy `themes/` into the Pugmill project root
3. Follow the 6-step theme installation contract in `THEME_AUTHORING.md` (allowlist, static imports, manifest registration, activate)

Your RECIPE.md body should call out any non-standard steps or post-activation configuration. The standard contract can be handled by referencing `THEME_AUTHORING.md` steps 2–5.

---

## Distribution

Recipes are hosted on GitHub in the author's own account. Naming conventions:

| Type | Repository name |
|---|---|
| Plugin recipe | `pugmill-recipe-<plugin-id>` |
| Theme recipe | `pugmill-theme-<theme-id>` |

### Submitting to the community directory

To have your recipe listed, open a pull request against [pugmill-recipe-community](https://github.com/michaelsjanzen/pugmill-recipe-community) following the submission instructions in that repository's README. A listing includes:

- Recipe name (must match your `RECIPE.md` `name` field exactly)
- One-sentence description
- GitHub repository URL (e.g. `https://github.com/yourname/pugmill-recipe-my-plugin`)
- Type (`plugin` or `theme`)
- Minimum Pugmill version

An AI agent can install any recipe directly from a GitHub URL without a directory listing — share your repository URL and a compatible agent will read `RECIPE.md` and follow the instructions.

---

## Versioning

Recipes do not have a formal version field, but breaking changes need careful handling because agents install from `RECIPE.md` instructions that users may have cached or shared.

**Breaking changes** — require a clear note in `RECIPE.md` and a version bump in `metadata.pugmill-version` if the required Pugmill version increases:

- Changing the plugin or theme **id** (renames tables, orphans design configs, breaks existing installations)
- Changing or removing a **required route path** (breaks links saved by users)
- Adding a new **required secret** (installations will fail silently at runtime until the secret is added)
- Changing the **database schema** in a way that drops or renames columns

**Non-breaking changes** — safe to make without special notice:

- Adding optional routes or lib files
- Adding optional env vars with documented defaults
- Adding new design tokens to a theme (existing configs are unaffected)
- Bug fixes that do not change the file structure

**Guidance for incompatible changes:** If you must change the plugin id, publish a new recipe with the new id and mark the old repository as archived on GitHub with a note pointing to the replacement. Include removal instructions for the old recipe in the new recipe's RECIPE.md.

**Theme id note:** Theme ids are stored as foreign keys in the `theme_design_configs` table. Changing a theme id after users have saved design configurations orphans their data permanently. Treat the theme id as immutable once published.

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
