import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/privacy-policy",
  "/oauth-consent",
  "/google-verification",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/signup/start",
  "/_next",
  "/favicon.ico",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow Google verification files (files in public folder are served before middleware, but this ensures they're not blocked)
  if (pathname.startsWith("/google") && pathname.endsWith(".html")) {
    return NextResponse.next();
  }

  // Allow API routes that handle their own authentication
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for authentication token - if no token, redirect to login
  // The API routes will validate the token properly
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Token exists, let the request through
  // Client-side and API validation will handle invalid/expired tokens
  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
};
