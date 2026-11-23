import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/privacy-policy",
  "/oauth-consent",
  "/google-verification",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/signup/start",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/_next",
  "/favicon.ico",
];

/** Security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME-type sniffing
  "X-Content-Type-Options": "nosniff",
  // Allow same-origin iframes (e.g. for PDF preview viewer) while blocking third-party embedding
  "X-Frame-Options": "SAMEORIGIN",
  // Only send origin on same-origin requests
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Force HTTPS for 1 year (production only — no-op on HTTP)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  // Disable legacy XSS filter (modern browsers prefer CSP)
  "X-XSS-Protection": "0",
  // Content-Security-Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
    "frame-src 'self' blob: data:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  // Limit browser feature access — allow microphone on self for audio recording
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/** Check if the incoming request origin matches the application host for CSRF protection. */
function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    const referer = req.headers.get("referer");
    if (!referer) {
      // In same-origin server actions or direct programmatic calls without origin/referer
      return true;
    }
    try {
      const refererUrl = new URL(referer);
      return refererUrl.origin === req.nextUrl.origin;
    } catch {
      return false;
    }
  }

  return origin === req.nextUrl.origin;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const method = req.method.toUpperCase();

  // ── CSRF Protection on mutating API requests ──────────────────────────────
  const isMutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (pathname.startsWith("/api/") && isMutatingMethod) {
    if (!isAllowedOrigin(req)) {
      logSecurityEvent({
        event: "CSRF_BLOCKED",
        ip,
        path: pathname,
        details: {
          origin: req.headers.get("origin") || "none",
          referer: req.headers.get("referer") || "none",
          method,
        },
      });

      const res = new NextResponse(
        JSON.stringify({ error: "Cross-site request forgery protection: Invalid Origin header" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
      return addSecurityHeaders(res as unknown as NextResponse);
    }
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Auth routes — strict: 5 requests per 15 minutes
  const isAuthRoute =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signup/start" ||
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/forgot-password" ||
    pathname === "/api/auth/reset-password";

  if (isAuthRoute) {
    const { allowed, retryAfter } = rateLimit(`auth:${pathname}:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      logSecurityEvent({
        event: "AUTH_RATE_LIMIT_HIT",
        ip,
        path: pathname,
      });

      const res = new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
      );
      return addSecurityHeaders(res as unknown as NextResponse);
    }
  } else if (pathname === "/api/integrations/canvas/sync") {
    // Canvas sync — 10 requests per 15 minutes
    const { allowed, retryAfter } = rateLimit(`canvas:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
      const res = new NextResponse(
        JSON.stringify({ error: "Rate limit exceeded for Canvas sync. Please wait before syncing again." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
      );
      return addSecurityHeaders(res as unknown as NextResponse);
    }
  } else if (pathname.startsWith("/api/")) {
    // API routes for chunked uploads need a higher limit
    const isChunkedUpload = pathname === "/api/ai/convert-mp4" || pathname === "/api/ai/generate-notes";
    const limit = isChunkedUpload ? 5000 : 200;

    // All other API routes: 200 requests per 15 minutes
    const { allowed, retryAfter } = rateLimit(`api:${pathname}:${ip}`, limit, 15 * 60 * 1000);
    if (!allowed) {
      const res = new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
      );
      return addSecurityHeaders(res as unknown as NextResponse);
    }
  }

  // ── Admin routes guard ─────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      logSecurityEvent({
        event: "FORBIDDEN_ACCESS",
        ip,
        path: pathname,
        details: { reason: "unauthenticated admin attempt" },
      });
      return addSecurityHeaders(
        new NextResponse(JSON.stringify({ error: "Admin access requires authentication" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }) as unknown as NextResponse
      );
    }
    // Token is verified on server; non-admins will receive 403
  }

  // ── Public path passthrough ────────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow Google verification files
  if (pathname.startsWith("/google") && pathname.endsWith(".html")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow API routes (each route handles its own authentication check)
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
