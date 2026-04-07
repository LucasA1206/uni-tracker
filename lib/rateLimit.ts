/**
 * In-memory sliding-window rate limiter.
 *
 * For single-server / single-instance deployments this works perfectly.
 * For multi-instance production (e.g. multiple Vercel regions) swap the
 * `store` Map for an Upstash Redis client with atomic INCR / EXPIRE calls.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Global store — lives for the process lifetime.
const store = new Map<string, RateLimitEntry>();

// Prune stale entries every 5 minutes to avoid unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > 15 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (only meaningful when allowed === false) */
  retryAfter: number;
}

/**
 * Check and record a rate-limit hit.
 *
 * @param key        Unique identifier, e.g. `"login:127.0.0.1"`
 * @param max        Maximum allowed requests per window
 * @param windowMs   Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // Start a fresh window.
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= max) {
    const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/** Convenience: 5 attempts per 15 minutes — used on all auth routes. */
export function authRateLimit(ip: string, route: string): RateLimitResult {
  return rateLimit(`auth:${route}:${ip}`, 5, 15 * 60 * 1000);
}

/** Convenience: 100 requests per 15 minutes — used on all other API routes. */
export function apiRateLimit(ip: string, route: string): RateLimitResult {
  return rateLimit(`api:${route}:${ip}`, 100, 15 * 60 * 1000);
}

/** Extract best-effort client IP from a Next.js request. */
export function getClientIp(req: { headers: { get: (k: string) => string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Build a 429 Response with Retry-After header. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
