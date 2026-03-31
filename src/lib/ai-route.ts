import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAiProvider } from "@/lib/ai";
import type { AiProvider } from "@/lib/ai";
import { getConfig } from "@/lib/config";
import { checkAndIncrementAi } from "@/lib/rate-limit";
import type { AiUsageResult } from "@/lib/rate-limit";

export type { AiProvider, AiUsageResult };

export interface AiRouteContext {
  ai: AiProvider;
  usage: AiUsageResult;
  userId: string;
}

/**
 * Shared bootstrap wrapper for AI API route handlers.
 *
 * Handles the auth → rate-limit → provider-availability sequence that every
 * AI route needs. The handler receives a typed context and should return a
 * NextResponse. Any unhandled errors bubble up as a 500.
 *
 * Usage:
 *   export async function POST(req: NextRequest) {
 *     return withAiRoute(req, async ({ ai, usage, userId }) => {
 *       // route-specific logic
 *     });
 *   }
 */
export async function withAiRoute(
  _req: NextRequest,
  handler: (ctx: AiRouteContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ai: { aiRateLimit } } = await getConfig();
  const usage = await checkAndIncrementAi(String(session.user.id), aiRateLimit);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "AI rate limit reached. Your limit resets in under 1 hour.", usage },
      { status: 429 },
    );
  }

  const ai = await getAiProvider();
  if (!ai) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  return handler({ ai, usage, userId: String(session.user.id) });
}
