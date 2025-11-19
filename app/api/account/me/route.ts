import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function isStrongPassword(pw: string) {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      name: true,
      username: true,
      universityEmail: true,
      canvasApiToken: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const {
    name,
    username,
    universityEmail,
    currentPassword,
    newPassword,
    confirmNewPassword,
    canvasApiToken,
  } = body as {
    name?: string;
    username?: string;
    universityEmail?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
    canvasApiToken?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (typeof name === "string" && name.trim()) {
    data.name = name.trim();
  }

  if (typeof username === "string" && username.trim() && username.trim() !== user.username) {
    const existing = await prisma.user.findFirst({
      where: { username: username.trim(), NOT: { id: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }
    data.username = username.trim();
  }

  if (
    typeof universityEmail === "string" &&
    universityEmail.trim() &&
    universityEmail.trim() !== user.universityEmail
  ) {
    if (!isValidEmail(universityEmail)) {
      return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({
      where: { universityEmail: universityEmail.trim(), NOT: { id: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
    }
    data.universityEmail = universityEmail.trim();
  }

  if (typeof canvasApiToken === "string") {
    const trimmed = canvasApiToken.trim();
    data.canvasApiToken = trimmed.length > 0 ? trimmed : null;
  }

  if (newPassword || confirmNewPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Enter your current password to set a new one" },
        { status: 400 },
      );
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
    }

    if (!newPassword || !isStrongPassword(newPassword)) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters and contain letters and numbers" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    data.passwordHash = passwordHash;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      name: true,
      username: true,
      universityEmail: true,
      canvasApiToken: true,
    },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({ where: { course: { userId: auth.userId } } });
    await tx.note.deleteMany({ where: { userId: auth.userId } });
    await tx.workTask.deleteMany({ where: { userId: auth.userId } });
    await tx.calendarEvent.deleteMany({ where: { userId: auth.userId } });
    await tx.microsoftToken.deleteMany({ where: { userId: auth.userId } });
    await tx.emailMessage.deleteMany({ where: { userId: auth.userId } });
    await tx.uniCourse.deleteMany({ where: { userId: auth.userId } });
    await tx.user.delete({ where: { id: auth.userId } });
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  return res;
}
