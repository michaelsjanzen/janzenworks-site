# Pugmill CMS: Philosophy and Design Principles

> This document is written for the AI agent working alongside a Pugmill CMS admin. Reading it fully before advising on architecture, scope, or feature decisions is expected. It is the primary decision-making reference in this repository.

---

## What Pugmill CMS Is

A pugmill in ceramics is a machine that takes raw clay and processes it into a smooth, consistent, workable material -- ready to be shaped into anything. It does not decide the final form. It prepares the material so the maker can.

Pugmill CMS applies that idea to content. It processes words, media, and metadata into a structured, consistent, web-ready form, leaving the shaping to the human and their tools.

**One-line description:** A rebuildable, AI-native CMS designed for the human-AI team.

---

## The Design Premise

Pugmill CMS is built for a team of one human and one AI agent. The human sets direction, makes decisions, and owns outcomes. The AI agent contributes context, technical judgment, and execution.

This shapes what belongs in the product, how documentation is written, and what "good" looks like. Functionality that an AI agent can handle as a one-off task does not belong in core. Core exists for things that run continuously, require deep integration, or establish trust boundaries. Everything else is either a plugin (persistent, optional, needed by many users) or agent-generated (one-time, written on demand).

---

## The Documentation Pattern

Traditional CMS documentation is written for developers who will read it once and then write code. Pugmill CMS documentation is written as an **active briefing for the AI agent** called upon to advise, build, extend, and maintain the system on behalf of a non-technical or semi-technical admin.

This means:
- Documentation is opinionated. It states what to do, not only what is possible.
- Philosophy is documented alongside technical facts, because an agent needs to understand *why* in order to give useful advice.
- When a human admin asks "should we add this feature?" or "how do we migrate our old blog?", the answer should be informed by this document.

The agent's role is to be a well-briefed advisor who consistently points effort in the right direction, especially when the human doesn't know the right questions to ask.

---

## The Scope Filter

The primary decision framework in Pugmill CMS:

> **If an AI agent can do it as a one-off task, it does not belong in core -- and may not belong in a plugin either.**

Apply this filter before building anything:

| Question | If yes |
|---|---|
| Does this need to run on every request, page load, or admin session? | Belongs in core or a plugin |
| Does it require deep integration with the hook system, auth, or design tokens? | Belongs in a plugin |
| Is it a trust or safety boundary (auth, sanitization, permissions)? | Belongs in core |
| Will multiple unrelated users need this in roughly the same form? | Belongs in a plugin |
| Is it a one-time migration, data transformation, or setup task? | Agent generates it on demand |
| Is it specific to one user's situation? | Agent generates it on demand |
| Can a capable agent write it correctly from the schema alone? | Agent generates it on demand |

---

## The Three Tiers

### Tier 1: Core

Core is what makes Pugmill CMS function for every installation. It runs continuously, is the same across all installations, and cannot be delegated to an agent at setup time.

- The content model (posts, pages, categories, tags, media)
- The admin UI and editing experience
- The authentication and permission system
- The plugin and theme APIs that third parties depend on
- The hook system and its catalog
- AEO metadata and llms.txt endpoints
- The REST API for external consumption
- The configuration system

The test for core inclusion: if this were missing, would the CMS be broken for every user?

### Tier 2: Plugins

Plugins are optional, activatable features that enough users need to make packaging worthwhile -- but that do not belong in every installation. They use core's hook and settings APIs to extend behavior without modifying core files.

Good candidates for plugins:
- Comment systems
- Cookie consent
- Analytics integration
- Search
- Contact forms
- Scheduled publishing
- Content importers (if built at all)

The test for plugin inclusion: will a meaningful percentage of users need this, in roughly the same form, as a persistent running feature?

### Tier 3: Agent-Generated

Anything that is a one-time task, a migration, or specific to one user's situation. The agent writes it when asked -- a script, a SQL migration, a data transform, an integration. Bundling it would add maintenance burden and complexity for everyone while benefiting only the few who need it.

Examples:
- Content importers (WordPress WXR, Ghost JSON, Markdown folders)
- Custom report scripts
- One-time data migrations
- Bespoke integrations with external services

**A concrete example:** During early development, a WordPress importer was considered for core. After applying the scope filter, it was removed. Given the Drizzle schema and a WXR export file, a capable agent can write a reliable import script in one session, tailored to the user's content. Bundling it would add complexity for every user while delivering no advantage to the audience Pugmill CMS is designed for.

---

## What This Means in Practice

When a human admin asks for a feature, running the scope filter before writing code is the right starting point:

1. **Is this already in core or a plugin?** Check first.
2. **Does this need to be persistent?** If it runs continuously or is needed by many users, a plugin is appropriate.
3. **Is this a one-time task?** Write a script. Do not build an admin UI for it.
4. **Is this specific to this user's situation?** Generate it on demand.

A lean core that an agent can understand completely is more useful than a feature-rich core that neither the human nor the agent can reason about clearly. The goal is a codebase:
- Small enough to be fully understood in a single context window
- Opinionated enough that the right path is evident
- Extensible enough that the agent can add anything the human needs

---

## The Built-in vs Enhanced Pattern

Every feature in Pugmill CMS operates at two levels.

**Built-in:** The feature works fully with no external dependencies. No API key required. No third-party account.

**Enhanced:** The same feature gains generation, suggestion, and automation capabilities when an AI provider is configured in Settings > AI.

The enhanced layer adds speed and intelligence. It does not unlock basic functionality.

### Where this applies

| Feature | Built-in | Enhanced |
|---|---|---|
| AEO metadata | Manual summary, Q&A builder, entity tagger | One-click generation from post content |
| Excerpt | Manual text field | AI-drafted excerpt |
| Slug | Manual entry with auto-suggestion from title | AI-suggested slug |
| Image alt text | Manual entry per image | AI-generated from image and post context |
| Content editing | Tiptap editor with Visual/Raw toggle | Inline refine, expand, and rewrite tools |
| Content revision | Revision history with restore | AI-assisted diff summaries (planned) |

### Guidance for agents building features

When building or extending a feature:
1. Implementing the built-in layer first is required. It must be complete and usable without any AI configuration.
2. The enhanced layer is additive -- new buttons, suggestions, and automations that appear only when `config.ai.provider` is set.
3. Core functionality is never gated behind AI availability.
4. The enhanced UI should be visually distinct but not dominant. It complements the built-in controls.

---

## AEO as a First-Class Feature

AI Engine Optimization (AEO) is the capability that most distinguishes Pugmill CMS. Structured AEO metadata, Q&A pairs, entity tagging, and llms.txt endpoints ship as core features.

Consequences for advising admins and building features:

- AEO metadata editing belongs in the post/page editor as a primary section, not a sidebar afterthought
- The AEO section includes a completeness indicator so authors know at a glance whether their AEO is finished
- Auto-generation via the AI provider generates all three AEO sections simultaneously from post content
- AEO is never a plugin. Moving it to a plugin would signal that it is optional. It is not.
- When advising an admin on content strategy, proactively noting incomplete AEO metadata is appropriate

---

## Version Context

Pugmill CMS is at **v0.1 Developer Preview**. The audience at this stage is technically capable humans working with AI agents in platforms like Claude Code, Cursor, Replit, or similar environments. Features that serve a non-technical solo operator are out of scope until v1.0.
