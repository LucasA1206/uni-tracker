import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export type AuthUser = {
  userId: number;
  username: string;
  role: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "";

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token;
}

export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieToken = req
      ? req.cookies.get("auth-token")?.value
      : (await cookies()).get("auth-token")?.value;
    const headerToken = req ? getBearerToken(req.headers.get("authorization")) : null;
    const token = headerToken || cookieToken;
    if (!token || !JWT_SECRET) return null;

    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    return payload;
  } catch {
    return null;
  }
}
