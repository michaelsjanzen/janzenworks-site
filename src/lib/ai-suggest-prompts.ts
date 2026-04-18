/**
 * System prompt builders for the AI suggest route.
 * Extracted to a standalone module so they can be unit-tested without
 * importing Next.js server internals.
 */

export type SuggestType =
  | "excerpt" | "titles" | "categories" | "tags" | "aeo" | "keywords"
  | "slug" | "topic-report" | "internal-links" | "tone-check" | "site-summary" | "site-faqs"
  | "refine-focus" | "social-post" | "seo" | "reading-level" | "swap-passage";

export function buildSystemPrompt(type: SuggestType, authorVoice: string, opts: { existingTags?: string[] } = {}): string {
  const voiceClause = authorVoice
    ? `Author's voice and style guide:\n${authorVoice}\n\n`
    : "";

  switch (type) {
    case "excerpt":
      return `${voiceClause}You are an expert copywriter. Generate a compelling 1-2 sentence excerpt (max 160 characters) for the given blog post. Return ONLY the excerpt text, nothing else.`;
    case "titles":
      return `${voiceClause}You are an expert headline writer. Generate exactly 2 alternative titles for the given blog post — one optimised for Curiosity (question-driven, creates intrigue, makes the reader want to know more) and one for Utility (benefit-focused, actionable, tells the reader exactly what they will gain). Return ONLY a JSON object: {"curiosity":"...","utility":"..."}. No explanation.`;
    case "categories":
      return `You are a content categorisation expert. Suggest 1-3 relevant category names for the given blog post. Return ONLY a JSON array of strings, e.g. ["Category 1"]. Use broad, reusable category names. No explanation.`;
    case "tags": {
      const poolClause = opts.existingTags?.length
        ? `\n\nExisting tag pool (prefer these exact names when relevant, only suggest new tags if no existing tag covers the concept):\n${opts.existingTags.join(", ")}`
        : "";
      return `You are a content tagging expert. Suggest 3-7 specific tags for the given blog post.${poolClause} Return ONLY a JSON array of strings, e.g. ["tag-one","tag-two"]. For existing tags use the exact name provided. For new tags use lowercase, hyphenated slugs. No explanation.`;
    }
    case "aeo":
      return `You are an AEO (Answer Engine Optimisation) expert. Analyse the given blog post and return a JSON object with these exact fields:
- summary: string — 2-3 sentence factual plain-text summary written for AI answer engines, not humans. Cover the main topic, key conclusion, and who this is for. No fluff.
- questions: array of { q: string, a: string } — 3-5 FAQ pairs. Each question must be a genuine search query a reader would type. Each answer must be a complete, standalone sentence (not "See above" or "As mentioned"). Do NOT include questions about the author, the site, or who wrote the post.
- entities: array of { type: string, name: string, description?: string, sameAs?: string } — named entities that are the subject of the content. Types: Person, Organization, Product, Place, Event, SoftwareApplication, CreativeWork. Only include entities that are explicitly discussed in the post. Do NOT include the post author or the publishing site as entities unless the post is specifically about them. Omit generic concepts. For sameAs, only include a Wikidata (https://www.wikidata.org/wiki/Q...) or Wikipedia (https://en.wikipedia.org/wiki/...) URL when you are highly confident it is the exact correct entity — omit the field entirely rather than guess.
Return ONLY valid JSON. No markdown fences, no explanation.`;
    case "slug":
      return `You are a URL slug generator. Convert the given post title into a clean, SEO-friendly URL slug: lowercase, words separated by hyphens, no special characters, max 60 characters. Return ONLY the slug string. No explanation.`;
    case "topic-report":
      return `You are a content analyst. Identify the primary topic of the given post and evaluate how coherently the content covers that topic. Return ONLY a JSON object: {"topic":"primary topic in 3-5 words","score":1-5,"note":"one sentence observation about focus or coherence"}. Score 5 = laser-focused, 1 = scattered. No explanation outside the JSON.`;
    case "tone-check":
      return `${voiceClause}You are a tone and style editor. Analyse the given blog post content against the Author's Voice guide provided above. Identify passages where the tone, vocabulary, or style deviates from the guide. Return ONLY a JSON array of objects:\n[\n  {\n    "quote": "exact passage from the content (20-120 characters)",\n    "issue": "one sentence describing the tone problem",\n    "suggestion": "rewritten version of the passage that matches the voice guide"\n  }\n]\nIf the content already matches the voice guide well, return an empty array []. Return 0-6 items maximum. No markdown fences, no explanation outside the JSON.`;
    case "keywords":
      return `You are an SEO keyword extraction expert. Extract 5-10 specific keywords and key phrases from the given blog post that best describe its content for search engine indexing. Focus on technical terms, product names, methodologies, and specific concepts — not generic filler words. Return ONLY a JSON array of strings, e.g. ["keyword one","keyword two"]. No explanation.`;
    case "site-summary":
      return `You are an AEO (Answer Engine Optimisation) expert. Given a site name and a sample of its published post titles and excerpts, write a 2-4 sentence factual site summary for AI crawlers and llms.txt. The summary must describe: what topics the site covers, who it is for, and what value it provides. Write in third person. Be specific — avoid generic phrases like "covers a wide range of topics". Return ONLY the summary text, nothing else.`;
    case "site-faqs":
      return `You are an AEO expert. Given a site name and a sample of its published post titles, generate 4-6 frequently asked questions a visitor might ask about this site and its subject area. Each answer must be a complete, standalone sentence — no "See above" or "As mentioned". Return ONLY a JSON array: [{"q":"...","a":"..."}]. No markdown fences, no explanation outside the JSON.`;
    case "refine-focus":
      return `You are a content focus analyst. Identify up to 4 specific areas where the given blog post loses focus, goes off-topic, or dilutes the core message. For each issue, provide a concise actionable recommendation. Return ONLY a JSON array: [{"label":"brief issue title in 3-5 words","passage":"optional exact verbatim quote from the content, 20-100 characters","recommendation":"one actionable sentence"}]. If the post is well-focused, return []. No markdown fences, no explanation outside the JSON.`;
    case "swap-passage":
      return `${voiceClause}You are a content editor. Rewrite the given passage to fix the issue described in the recommendation while preserving the author's voice and tone. Return ONLY the rewritten passage text — nothing else, no labels, no explanation.`;
    case "social-post":
      // Platform prompt is built in the special-case handler in route.ts; this branch is never reached.
      return "";
    case "seo":
      return `You are an SEO copywriter. Given a blog post, generate an optimised SEO title tag and meta description.
Rules:
- seoTitle: max 60 characters, compelling, includes the primary keyword naturally, no clickbait
- seoMetaDescription: max 155 characters, summarises the post value proposition, includes a soft call-to-action
Return ONLY a JSON object: {"seoTitle":"...","seoMetaDescription":"..."}. No markdown fences, no explanation.`;
    case "reading-level": {
      const voiceNote = authorVoice
        ? ` If an Author's Voice guide is provided, add a "fit" field — one of: "aligns with voice guide", "higher register than voice guide", "lower register than voice guide".`
        : "";
      return `You are a readability expert. Analyse the reading level of the given post content. Return ONLY a JSON object: {"level":"General Audience / High School / College / Specialist","gradeLevel":number,"note":"one factual sentence on clarity and pace — describe what the reader experiences, no judgement"}.${voiceNote} No markdown fences, no explanation outside the JSON.`;
    }
    case "internal-links":
      // Internal-links prompt is built inline in route.ts with server-side post index context.
      return "";
  }
}
