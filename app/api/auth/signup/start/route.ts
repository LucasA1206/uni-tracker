import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function isStrongPassword(pw: string) {
  // At least 8 chars, one letter, one digit
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "Server misconfigured: JWT_SECRET is not set" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, username, universityEmail, password, confirmPassword } = body as {
    name?: string;
    username?: string;
    universityEmail?: string;
    password?: string;
    confirmPassword?: string;
  };

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

  // Ensure username/email are not already used by a real user
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { universityEmail }],
    },
  });
  if (existingUser) {
    return NextResponse.json({ error: "Username or university email is already in use" }, { status: 400 });
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
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}