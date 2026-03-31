import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Auth guard for /admin/* routes.
 * Rate limiting for /api/* is handled inside each API route handler
 * (Node.js runtime) using apiLimiter from @/lib/rate-limit.
 *
 * Must be named middleware.ts at src/ or the project root to be picked up by Next.js.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth && pathname !== "/admin/login") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
