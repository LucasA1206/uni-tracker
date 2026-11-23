import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeString, rejectOversizedBody } from "@/lib/sanitize";
import { createPasswordResetToken } from "@/lib/passwordReset";

export async function POST(req: NextRequest) {
  const oversized = rejectOversizedBody(req, 4 * 1024);
  if (oversized) return oversized;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const email = sanitizeString((body as Record<string, unknown>).email, 254);
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generic response to prevent user enumeration
    const genericResponse = {
      message: "If an account with that email exists, password reset instructions have been sent.",
    };

    const user = await prisma.user.findFirst({
      where: { universityEmail: email.toLowerCase() },
      select: { id: true, universityEmail: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(genericResponse, { status: 200 });
    }

    const resetToken = createPasswordResetToken(user);
    const resetUrl = `${new URL(req.url).origin}/login?resetToken=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.universityEmail)}`;

    // In production, an email would be dispatched here via Nodemailer / Resend.
    // In dev / test or when email service is not configured, log or return reset link securely.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ...genericResponse, devResetUrl: resetUrl }, { status: 200 });
    }

    return NextResponse.json(genericResponse, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
