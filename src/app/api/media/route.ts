import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { authorizeApiRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/media
 *
 * Query params:
 *   page   — page number (default: 1)
 *   limit  — items per page, max 100 (default: 20)
 *
 * Returns the public media library (file name, URL, alt text, type, size).
 *
 * Query count: always exactly 2.
 *   1. COUNT(*) for pagination meta
 *   2. Paginated rows via SQL LIMIT/OFFSET + ORDER BY
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if (auth.ok === false) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(media);

    const rows = await db
      .select({
        id: media.id,
        fileName: media.fileName,
        fileType: media.fileType,
        fileSize: media.fileSize,
        url: media.url,
        altText: media.altText,
        createdAt: media.createdAt,
      })
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(
      { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[API] GET /api/media error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
