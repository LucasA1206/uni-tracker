import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export type AuthUser = {
  userId: number;
  username: string;
  role: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "";

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const store = await cookies();
    // @ts-expect-error: cookies() in Next 16 returns a promise resolving to a store with get()
    const token = store.get("auth-token")?.value as string | undefined;
    if (!token || !JWT_SECRET) return null;

    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    return payload;
  } catch {
    return null;
  }
}
