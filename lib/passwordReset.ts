import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface ResetTokenPayload {
  userId: number;
  email: string;
  purpose: "password_reset";
}

/**
 * Creates an unguessable, single-use, time-limited password reset token (15-minute expiry).
 * The secret key incorporates the user's current password hash.
 * Once the password changes, the hash changes, permanently invalidating the token.
 */
export function createPasswordResetToken(user: { id: number; universityEmail: string; passwordHash: string }): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const secret = `${JWT_SECRET}:${user.passwordHash}`;
  const payload: ResetTokenPayload = {
    userId: user.id,
    email: user.universityEmail,
    purpose: "password_reset",
  };

  return jwt.sign(payload, secret, { expiresIn: "15m" });
}

/**
 * Verifies a password reset token against the user's current password hash.
 * Returns the decoded payload or null if invalid, expired, or already used.
 */
export function verifyPasswordResetToken(
  token: string,
  user: { passwordHash: string }
): ResetTokenPayload | null {
  if (!JWT_SECRET || !token) return null;

  try {
    const secret = `${JWT_SECRET}:${user.passwordHash}`;
    const decoded = jwt.verify(token, secret) as ResetTokenPayload;
    if (decoded.purpose !== "password_reset") return null;
    return decoded;
  } catch {
    return null;
  }
}
