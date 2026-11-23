import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sanitizeString, rejectOversizedBody } from "@/lib/sanitize";
import { verifyPasswordResetToken } from "@/lib/passwordReset";

function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export async function POST(req: NextRequest) {
  const oversized = rejectOversizedBody(req, 8 * 1024);
  if (oversized) return oversized;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const raw = body as Record<string, unknown>;
    const token = sanitizeString(raw.token, 1024);
    const email = sanitizeString(raw.email, 254);
    const newPassword = sanitizeString(raw.newPassword, 256);
    const confirmPassword = sanitizeString(raw.confirmPassword, 256);

    if (!token || !email || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters and contain letters and numbers" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { universityEmail: email.toLowerCase() },
      select: { id: true, universityEmail: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired password reset link" }, { status: 400 });
    }

    // Verify token cryptographically against current password hash
    const verified = verifyPasswordResetToken(token, user);
    if (!verified || verified.userId !== user.id) {
      return NextResponse.json(
        { error: "Invalid, expired, or already used password reset link" },
        { status: 400 }
      );
    }

    // Hash the new password and update the database
    // Changing the password hash automatically invalidates the token so it can never be reused
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been successfully reset. You may now log in with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An error occurred while resetting your password" },
      { status: 500 }
    );
  }
}
