import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAiRoute } from "@/lib/ai-route";

type KnownAction =
  | "rewrite"
  | "excerpt"
  | "slug"
  | "seo"
  | "aeo"
  | "categories"
  | "tags"
  | "tone-check"
  | "reading-level"
  | "topic-report"
  | "internal-links"
  | "unknown";

const SYSTEM_PROMPT = `You are an intent classifier for a blog post editor AI assistant. The user has typed a natural-language instruction. Classify it as exactly one of these actions:

- rewrite: any editing, rewriting, simplifying, improving, restructuring, or transforming of the post content
- excerpt: generate or suggest a post excerpt or summary blurb
- slug: generate a URL slug for the post
- seo: generate an SEO title tag and meta description
- aeo: generate AEO metadata (summary, FAQ pairs, entities)
- categories: suggest categories for the post
- tags: suggest tags or keywords for the post
- tone-check: check, analyse, or review the tone or writing style
- reading-level: check the reading level or grade level of the post
- topic-report: analyse the topic focus, coherence, or structure of the post
- internal-links: suggest internal links to other posts on the site
- unknown: the instruction cannot be mapped to any of the above

Return ONLY a JSON object with two fields:
- "action": one of the action names above
- "instructions": for the rewrite action only — the extracted editing directive as a concise string (e.g. "simplify to 8th grade", "make the intro more compelling"); for all other actions return null

No markdown fences. No explanation outside the JSON.`;

export async function POST(req: NextRequest) {
  return withAiRoute(req, async ({ ai, usage }) => {
    const bodySchema = z.object({
      instruction: z.string().min(1).max(500),
    });

    const bodyResult = bodySchema.safeParse(await req.json());
    if (!bodyResult.success) {
      return NextResponse.json({ error: "instruction is required" }, { status: 400 });
    }

    const { instruction } = bodyResult.data;

    try {
      const raw = await ai.complete(SYSTEM_PROMPT, `User instruction: "${instruction}"`);
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()) as {
        action: KnownAction;
        instructions: string | null;
      };
      return NextResponse.json({ action: parsed.action ?? "unknown", instructions: parsed.instructions ?? null, usage });
    } catch {
      return NextResponse.json({ action: "unknown" as KnownAction, instructions: null, usage });
    }
  });
}
