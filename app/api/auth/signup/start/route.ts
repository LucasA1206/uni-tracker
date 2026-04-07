import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { sanitizeString, rejectOversizedBody } from "@/lib/sanitize";

const JWT_SECRET = process.env.JWT_SECRET;

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function isStrongPassword(pw: string) {
  // At least 8 chars, one letter, one digit
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export async function POST(req: NextRequest) {
  // Body size guard — signup fields should never exceed 8 KB
  const oversized = rejectOversizedBody(req, 8 * 1024);
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Sanitize all string fields with per-field max lengths
  const name = sanitizeString(raw.name, 100);
  const username = sanitizeString(raw.username, 50);
  const universityEmail = sanitizeString(raw.universityEmail, 254); // RFC 5321 max
  const password = sanitizeString(raw.password, 256);
  const confirmPassword = sanitizeString(raw.confirmPassword, 256);

  if (!name || !username || !universityEmail || !password || !confirmPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  if (!isValidEmail(universityEmail)) {
    return NextResponse.json({ error: "Please enter a valid university email" }, { status: 400 });
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters and contain letters and numbers" },
      { status: 400 },
    );
  }

  // Username must only contain safe characters
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return NextResponse.json(
      { error: "Username may only contain letters, numbers, underscores, hyphens, and dots" },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { universityEmail }],
    },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "Username or university email is already in use" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      username,
      universityEmail,
      passwordHash,
    },
  });

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