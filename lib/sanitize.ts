import { NextResponse } from "next/server";

/**
 * Sanitize a string field: trim whitespace and enforce a maximum length.
 * Returns null if the value is not a non-empty string after trimming.
 */
export function sanitizeString(
  value: unknown,
  maxLen: number,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLen);
}

/**
 * Parse and validate an integer.
 * Returns null if the value cannot be safely converted.
 */
export function sanitizeInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/**
 * Sanitize a filename for use in Content-Disposition headers.
 * Strips CR, LF, and non-printable characters to prevent header injection.
 */
export function sanitizeFilename(name: string): string {
  // Remove carriage return, newline, and any non-printable ASCII
  return name.replace(/[\r\n\x00-\x1f\x7f"\\]/g, "_");
}

/**
 * Reject requests whose Content-Length exceeds maxBytes.
 * Returns a 413 NextResponse if too large, or null if OK.
 */
export function rejectOversizedBody(
  req: { headers: { get: (k: string) => string | null } },
  maxBytes: number,
): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > maxBytes) {
      return NextResponse.json(
        { error: `Request body too large. Maximum is ${maxBytes} bytes.` },
        { status: 413 },
      );
    }
  }
  return null;
}

/**
 * Generic JSON body validator: reads the body, rejects if:
 *  - Content-Length exceeds maxBytes
 *  - Body is not valid JSON
 *
 * Returns { body } on success or { error: NextResponse } on failure.
 */
export async function parseJsonBody(
  req: Request & { headers: { get: (k: string) => string | null } },
  maxBytes = 64 * 1024, // 64 KB default for JSON endpoints
): Promise<{ body: Record<string, unknown> } | { error: NextResponse }> {
  const oversized = rejectOversizedBody(req, maxBytes);
  if (oversized) return { error: oversized };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      error: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
    };
  }

  return { body: body as Record<string, unknown> };
}
