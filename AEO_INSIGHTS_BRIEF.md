# AEO Bot Behavior Insights — Cross-Project Brief

This document captures live bot traffic analysis and a planned improvement roadmap developed in the WP Pugmill session. Most improvements apply directly to Pugmill CMS — both projects share the same AEO infrastructure (llms.txt, sitemap, bot analytics, AEO markdown endpoints).

---

## What the Live Traffic Data Revealed

Analysis of ~350 bot visits to a WP Pugmill-equipped site showed:

- **Claude** and **Bingbot** tied as most active (97 visits each). Claude made 35 sitemap hits — systematic structured discovery, not casual browsing.
- **ChatGPT** (50 visits) has read llms.txt and consumed one AEO markdown endpoint (`?wppugmill_llm=1`). This is a confirmed positive signal.
- **AI vs search bots** split nearly 50/50 — the site is genuinely at the crossroads of SEO and AEO relevance.
- **Most high-value content has never been served in its optimized form.** The most cross-bot popular post (SketchUp, 8 visits, ChatGPT-led) had zero AEO endpoint hits. Bots are parsing raw HTML instead of the markdown-optimized version.
- The `<link rel="alternate" type="text/markdown">` header (the "invisible handshake") is not reliably triggering bots to follow through to the AEO endpoint.

**The core problem:** Bots are finding and visiting content but aren't making the final step to consume the optimized markdown version. The infrastructure exists; the signal to bots is too weak.

---

## Planned Improvements (applicable to both projects)

### Phase 1 — Stronger Signal to Bots

**1a. llms.txt as an active AEO index**
Add the markdown endpoint URL (`?wppugmill_llm=1` in WP; equivalent in Pugmill) to each post entry in llms-full.txt. ChatGPT already reads llms.txt — giving it an explicit map to every optimized endpoint removes all inference. This is a template change, low complexity.

**1b. Sitemap alternate link annotation**
Add `<xhtml:link rel="alternate" type="text/markdown" href="[markdown-url]"/>` inside each `<url>` block in the XML sitemap. Targets Claude's systematic sitemap-consumption behavior directly. Requires adding `xmlns:xhtml` namespace and a new node per URL.

### Phase 2 — Per-Post AEO Hit Tracking

Track AEO endpoint hits attributed to specific posts in the bot analytics DB, not just as a URL pattern in aggregate. This is the data foundation Phases 3a and 3b depend on.

In Pugmill CMS, the relevant table is likely the bot analytics table; add a `post_id` foreign reference when `?llm=1` (or equivalent) is detected in the incoming request.

### Phase 3 — Analytics Dashboard Enhancements

**3a. Bot Discovery Funnel view**
Per-bot funnel with four stages: discovered site → read infrastructure (robots, llms, sitemap) → crawled HTML → consumed AEO markdown. Makes visible what raw visit counts obscure — e.g., "Claude is at stage 3, ChatGPT has reached stage 4 on one post."

**3b. Uncovered AEO post list**
Cross-reference bot visit data with per-post AEO completeness. Posts with bot traffic + complete AEO metadata + zero AEO endpoint hits = missed conversions. Surface as a prioritized list in the analytics dashboard.

**3c. llms.txt completeness score**
A site-level quality indicator: % of posts with AEO summaries, site description populated, organization info complete. Mirrors the per-post health score but for the file ChatGPT is already reading.

### Phase 4 — Smarter AI Insights

**4a. Bot-specific recommendations**
Update the AI insights prompt to generate recommendations segmented by bot behavior: Claude = sitemap/discovery suggestions; ChatGPT = llms.txt richness suggestions; Googlebot = traditional SEO. Structured prompt change, low complexity.

---

## Sequencing

- **Phase 1** ships independently — improves discoverability immediately.
- **Phase 2** must ship before 3a/3b — they depend on per-post AEO hit data.
- **3c and Phase 4** are independent and can be parallelized.
- Suggested milestones: v0.6.0 (Phase 1+2), v0.7.0 (Phase 3+4).

---

## Stack Translation Notes (WP Pugmill → Pugmill CMS)

| Concept | WP Pugmill | Pugmill CMS |
|---|---|---|
| AEO markdown endpoint | `?wppugmill_llm=1` query param | Equivalent route/param in Next.js |
| llms.txt generation | `includes/llms-txt.php` | `src/` llms.txt route handler |
| Sitemap generation | `includes/sitemap.php` | `src/` sitemap route handler |
| Bot analytics ingestion | `includes/bot-analytics.php` | Bot analytics middleware/route |
| AI insights prompt | `wppugmill_ajax_analytics_insights()` | Equivalent server action |
| Per-post AEO health score | PHP-side audit checks | Equivalent in TS |
