import { getIndexNowKey } from "@/lib/indexnow";
import { NextResponse } from "next/server";

export async function GET() {
  const key = await getIndexNowKey();
  return new NextResponse(key, {
    headers: { "Content-Type": "text/plain" },
  });
}
