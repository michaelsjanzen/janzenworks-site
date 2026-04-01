---
name: create-pugmill-recipe
description: >
  Creates a Pugmill CMS recipe — a packaged plugin or theme ready for
  community distribution. Guides the agent through repository structure,
  RECIPE.md authoring, and the Agent Skills-compatible frontmatter format.
  Use this when a user asks to package, distribute, or publish a Pugmill
  plugin or theme as a community recipe.
compatibility: >
  Designed for Pugmill CMS projects. Requires an existing plugin or theme
  to package. Read PLUGIN_AUTHORING.md or THEME_AUTHORING.md before
  proceeding — this skill assumes familiarity with the installation contracts
  defined there. Full recipe spec is in RECIPE_AUTHORING.md.
---

A Pugmill recipe is a GitHub repository that packages a plugin or theme for community distribution. `RECIPE.md` follows the [Agent Skills](https://agentskills.io) open standard — any Agent Skills-aware agent (including Claude Code) can read it and install the extension. This skill is the task-execution workflow; `RECIPE_AUTHORING.md` is the full reference.

---

## Step 1 — Identify what you are packaging

Ask if not already clear:

- **Plugin recipe** → repository named `pugmill-recipe-<plugin-id>`
- **Theme recipe** → repository named `pugmill-theme-<theme-id>`

The id comes from the extension's `manifest.json` → `id` field.

---

## Step 2 — Assess complexity

Before structuring the repository, answer:

| Question | Implication |
|---|---|
| Does it add pages or API routes to `src/app/`? | Include a `src/app/` directory in the repo |
| Does it add shared library files to `src/lib/`? | Include a `src/lib/` directory in the repo |
| Does it need DB tables? | Prefer `schema.migrate()` in `index.ts`; use `migrations/` only if external scripts are needed |
| Does it require secrets or external accounts? | Document as prerequisites in RECIPE.md |
| Does it add navigation entries? | Note as a post-install step |

---

## Step 3 — Structure the repository

Recipes use a **mirrored directory structure** — the repo layout matches where files land in the Pugmill project. `RECIPE.md`, `README.md`, and `LICENSE` are not copied.

**Plugin, no routes:**
```
plugins/<id>/         → copied to Pugmill's plugins/<id>/
RECIPE.md             (not copied)
README.md             (not copied)
```

**Plugin, with routes or lib files:**
```
plugins/<id>/         → Pugmill's plugins/<id>/
src/app/...           → Pugmill's src/app/... (prefix all paths with plugin id)
src/lib/...           → Pugmill's src/lib/... (prefix filenames with plugin id)
RECIPE.md             (not copied)
README.md             (not copied)
```

**Theme:**
```
themes/<id>/          → Pugmill's themes/<id>/
RECIPE.md             (not copied)
README.md             (not copied)
```

---

## Step 4 — Write RECIPE.md frontmatter

```yaml
---
name: pugmill-recipe-<plugin-id>
description: >
  Two to four sentences for an AI agent: what it does, what hooks it
  registers, what DB tables it creates, what routes it adds, what secrets
  are required. Max 1024 characters.
compatibility: "Pugmill CMS v0.2+. Plugin recipe. <one-line summary of non-standard requirements>"
license: MIT
metadata:
  type: plugin
  pugmill-version: "0.2"
  has-routes: "false"
  has-migrations: "false"
---
```

For theme recipes, use `type: theme` and `name: pugmill-theme-<theme-id>`.

---

## Step 5 — Write the RECIPE.md body

Structure the body as installation instructions for an AI agent:

1. **One-sentence summary** of what the recipe does
2. **Plugin/theme id** — state it explicitly
3. **Prerequisites** — npm packages to install, external accounts to create, secrets to add
4. **Copy step** — which directories to copy and where (mirrored structure, so this is usually brief)
5. **Plugin/theme registration** — reference `PLUGIN_AUTHORING.md` steps 2–3 (static import + ALL_PLUGINS) or `THEME_AUTHORING.md` steps 2–4. Do not duplicate the contract — reference it.
6. **Activation** — Admin UI path or config value
7. **Post-install steps** — restart, verify tables, apply navigation, etc.
8. **Environment variables table** — if secrets are required
9. **Removal instructions** — reverse of installation

Keep the body under 5000 tokens. Reference the authoring guides for the standard steps; only spell out what is non-standard about this specific recipe.

---

## Step 6 — Pre-publish checklist

Before pushing to GitHub:

- [ ] `name` in frontmatter exactly matches the GitHub repository name
- [ ] `description` is under 1024 characters and written for an AI agent (not a human)
- [ ] `has-routes` and `has-migrations` metadata values are accurate
- [ ] No secrets, credentials, or connection strings hardcoded in any file
- [ ] All `src/app/` route paths prefixed with the plugin id
- [ ] All `src/lib/` filenames prefixed with the plugin id
- [ ] `schema.migrate()` uses `CREATE TABLE IF NOT EXISTS` guards (idempotent)
- [ ] `schema.teardown()` implemented if data cleanup on uninstall matters
- [ ] RECIPE.md body tested cold — followed from a fresh Pugmill install using only those instructions
- [ ] Validate: `skills-ref validate ./pugmill-recipe-<id>`

---

## Step 7 — Distribute

1. Push the repository to GitHub under the author's account
2. Submit a listing to the [Pugmill community directory](https://github.com/michaelsjanzen/pugmill-recipe-community) with: recipe name, description, repository URL, and type
