export type SecurityEventType =
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_RATE_LIMIT_HIT"
  | "CSRF_BLOCKED"
  | "FORBIDDEN_ACCESS"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_SUCCESS"
  | "FILE_UPLOAD_REJECTED"
  | "ADMIN_ACTION";

interface SecurityLogPayload {
  event: SecurityEventType;
  userId?: number | string;
  ip?: string;
  path?: string;
  details?: Record<string, unknown>;
}

/**
 * Log structured security events to stdout/stderr without sensitive credentials.
 * Masks or excludes any sensitive fields (passwords, tokens, cookies).
 */
export function logSecurityEvent(payload: SecurityLogPayload) {
  const sanitizedDetails = { ...(payload.details || {}) };
  const sensitiveKeys = ["password", "token", "secret", "cookie", "authorization", "key"];

  for (const k of Object.keys(sanitizedDetails)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      delete sanitizedDetails[k];
    }
  }

  const entry = {
    timestamp: new Date().toISOString(),
    event: payload.event,
    ip: payload.ip || "unknown",
    userId: payload.userId || null,
    path: payload.path || null,
    details: sanitizedDetails,
  };

  console.warn(`[SECURITY] ${JSON.stringify(entry)}`);
}
