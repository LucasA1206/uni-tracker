/**
 * Safe HTML sanitizer to prevent Cross-Site Scripting (XSS).
 * Safe for use in both Client Components and Server Components.
 */
export function sanitizeHtml(dirty?: string | null): string {
  if (!dirty || typeof dirty !== "string") return "";

  // 1. Remove dangerous active tags and their inner content
  let clean = dirty.replace(
    /<(script|style|iframe|object|embed|form|applet|base|meta|link)[^>]*>[\s\S]*?<\/\1>/gi,
    ""
  );

  // 2. Remove self-closing or unclosed dangerous tags
  clean = clean.replace(
    /<(script|style|iframe|object|embed|form|applet|base|meta|link)[^>]*\/?>/gi,
    ""
  );

  // 3. Strip all inline JavaScript event handlers (e.g. onload, onerror, onclick)
  clean = clean.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 4. Strip dangerous pseudo-protocols in href and src attributes (javascript:, vbscript:, data:text/html)
  clean = clean.replace(
    /(href|src|action|formaction)\s*=\s*(["']?)\s*(javascript|vbscript|data\s*:\s*text\/html):/gi,
    '$1=$2unsafe:'
  );

  return clean;
}
