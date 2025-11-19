import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

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

  const { username, universityEmail, code } = body as {
    username?: string;
    universityEmail?: string;
    code?: string;
  };

  if (!username || !universityEmail || !code) {
    return NextResponse.json({ error: "Username, university email and code are required" }, { status: 400 });
  }

  const pending = await prisma.pendingUser.findFirst({
    where: {
      username,
      universityEmail,
    },
  });

  if (!pending) {
    return NextResponse.json({ error: "No pending signup found. Please start again." }, { status: 400 });
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.pendingUser.delete({ where: { id: pending.id } });
    return NextResponse.json({ error: "Verification code has expired. Please sign up again." }, { status: 400 });
  }

  if (pending.verificationCode !== code) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  // Final guard: make sure user wasn't created while pending record existed
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: pending.username },
        { universityEmail: pending.universityEmail },
      ],
    },
  });
  if (existingUser) {
    await prisma.pendingUser.delete({ where: { id: pending.id } });
    return NextResponse.json({ error: "Account already exists for this username or email" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name: pending.name,
      username: pending.username,
      universityEmail: pending.universityEmail,
      passwordHash: pending.passwordHash,
    },
  });

  await prisma.pendingUser.delete({ where: { id: pending.id } });

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
