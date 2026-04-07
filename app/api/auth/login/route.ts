import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { sanitizeString, rejectOversizedBody } from "@/lib/sanitize";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: NextRequest) {
  // Body size guard — login fields should never exceed 4 KB
  const oversized = rejectOversizedBody(req, 4 * 1024);
  if (oversized) return oversized;

  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Sanitize and enforce max lengths
  const username = sanitizeString(raw.username, 100);
  const password = sanitizeString(raw.password, 256);

  if (!username || !password) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { universityEmail: username }],
    },
  });

  // Use a constant-time failure path regardless of whether user exists
  const dummyHash =
    "$2a$12$invalidhashpaddingtoensureconstanttimePLACEHOLDERXXXXXX";
  const ok = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  const res = NextResponse.json({ success: true });
  res.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}
