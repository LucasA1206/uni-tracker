import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const CODE_TTL_MINUTES = 15;

function generateCode() {
  // 6-digit numeric code using crypto for better randomness
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function isStrongPassword(pw: string) {
  // At least 8 chars, one letter, one digit
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export async function POST(req: NextRequest) {
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

  // Clean up any old pending for this username/email to avoid conflicts
  await prisma.pendingUser.deleteMany({
    where: {
      OR: [{ username }, { universityEmail }],
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.pendingUser.create({
    data: {
      name,
      username,
      universityEmail,
      passwordHash,
      verificationCode: code,
      expiresAt,
    },
  });

  await sendVerificationEmail(universityEmail, code);

  return NextResponse.json({ success: true });
}
