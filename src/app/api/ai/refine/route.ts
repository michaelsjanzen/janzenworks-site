import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAiRoute } from "@/lib/ai-route";

export async function POST(req: NextRequest) {
  return withAiRoute(req, async ({ ai, usage, userId }) => {
    const { content, postTitle, instructions } = await req.json() as {
      content?: string;
      postTitle?: string;
      instructions?: string;
    };
    if (!content && !instructions) {
      return NextResponse.json({ error: "content or instructions is required" }, { status: 400 });
    }

    const dbUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, userId),
    });
    const authorVoice = dbUser?.authorVoice ?? "";

    const voiceClause = authorVoice
      ? `Author's voice and style guide:\n${authorVoice}`
      : "Maintain a clear, engaging, professional tone.";

    const systemPrompt = [
      "You are an expert editor collaborating with a human writer.",
      voiceClause,
      content
        ? "The writer has provided a draft. Rewrite and refine it. If the writer has provided instructions, follow them precisely — for example: \"simplify to 8th grade\", \"make it more authoritative\", \"tighten the intro\", \"rewrite the second half based on this outline\". Preserve all factual content and the writer's intent. Keep the structure (headings, lists, blockquotes) unless instructed otherwise."
        : "The writer has provided instructions but no draft yet. Write a complete, well-structured blog article based on their instructions. Use the post title as additional context if provided. Produce proper Markdown with H2/H3 headings, paragraphs, and where appropriate lists or blockquotes.",
      "Return ONLY the body content in Markdown. The post title is managed separately — do not include it. No commentary, explanations, or metadata.",
    ].join("\n\n");

    const parts: string[] = [];
    if (postTitle) parts.push(`Post title: "${postTitle}"`);
    if (instructions) parts.push(`Instructions: ${instructions}`);
    if (content) parts.push(`Draft:\n${content}`);
    const userPrompt = parts.join("\n\n");

    try {
      const result = await ai.complete(systemPrompt, userPrompt);
      return NextResponse.json({ result, usage });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      return NextResponse.json({ error: msg, usage }, { status: 502 });
    }
  });
}
