import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

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

/** Security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME-type sniffing
  "X-Content-Type-Options": "nosniff",
  // Block the page from being embedded in iframes
  "X-Frame-Options": "DENY",
  // Only send origin on same-origin requests
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Force HTTPS for 1 year (production only — no-op on HTTP)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  // Disable legacy XSS filter (modern browsers prefer CSP)
  "X-XSS-Protection": "0",
  // Content-Security-Policy — kept permissive for the Next.js SPA while
  // still blocking the most dangerous vectors. Tighten script-src once
  // you have a stable nonce or hash for inline scripts.
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // inline needed for Next.js HMR
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  // Limit browser feature access
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Auth routes — strict: 5 requests per 15 minutes
  const isAuthRoute =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signup/start" ||
    pathname === "/api/auth/signup";

  if (isAuthRoute) {
    const { allowed, retryAfter } = rateLimit(`auth:${pathname}:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      const res = new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
      );
      addSecurityHeaders(res as unknown as NextResponse);
      return res;
    }
  } else if (pathname.startsWith("/api/")) {
    // All other API routes — generous: 200 requests per 15 minutes
    const { allowed, retryAfter } = rateLimit(`api:${pathname}:${ip}`, 200, 15 * 60 * 1000);
    if (!allowed) {
      const res = new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
      );
      addSecurityHeaders(res as unknown as NextResponse);
      return res;
    }
  }

  // ── Public path passthrough ────────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow Google verification files
  if (pathname.startsWith("/google") && pathname.endsWith(".html")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow API routes (each route handles its own auth check)
  if (pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Page auth guard ────────────────────────────────────────────────────────
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
