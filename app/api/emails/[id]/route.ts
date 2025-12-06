import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// Get full email content
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const emailId = Number(id);
  if (!emailId || Number.isNaN(emailId)) {
    return NextResponse.json({ error: "Invalid email ID" }, { status: 400 });
  }

  const email = await prisma.emailMessage.findFirst({
    where: { id: emailId, userId: user.userId },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Try to fetch full content from Gmail or Outlook
  let fullContent: string | null = null;
  
  try {
    // Check if we have Gmail token
    const gmailToken = await prisma.gmailToken.findUnique({ where: { userId: user.userId } });
    if (gmailToken) {
      const record = await prisma.gmailToken.findUnique({ where: { userId: user.userId } });
      if (record && record.accessToken) {
        const now = Date.now();
        let accessToken = record.accessToken;
        
        // Refresh if needed
        if (record.expiresAt.getTime() - now < 60_000) {
          // Token refresh logic would go here, but for now use existing token
        }

        const messageRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.messageId}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          },
        );

        if (messageRes.ok) {
          const message = (await messageRes.json()) as {
            payload?: {
              body?: { data?: string };
              parts?: Array<{
                body?: { data?: string };
                mimeType?: string;
              }>;
            };
          };

          // Extract body content
          if (message.payload?.body?.data) {
            fullContent = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
          } else if (message.payload?.parts) {
            // Find text/html or text/plain part
            const textPart = message.payload.parts.find(
              (p) => p.mimeType === "text/html" || p.mimeType === "text/plain",
            );
            if (textPart?.body?.data) {
              fullContent = Buffer.from(textPart.body.data, "base64").toString("utf-8");
            }
          }
        }
      }
    }

    // Fallback to Outlook if Gmail didn't work
    if (!fullContent) {
      const outlookToken = await prisma.microsoftToken.findUnique({ where: { userId: user.userId } });
      if (outlookToken && outlookToken.accessToken) {
        const messageRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${email.messageId}?$select=body,bodyPreview`,
          {
            headers: {
              Authorization: `Bearer ${outlookToken.accessToken}`,
              Accept: "application/json",
            },
          },
        );

        if (messageRes.ok) {
          const message = (await messageRes.json()) as {
            body?: { content?: string };
            bodyPreview?: string;
          };
          fullContent = message.body?.content || message.bodyPreview || null;
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch full email content", err);
  }

  return NextResponse.json({
    email: {
      ...email,
      fullContent: fullContent || email.preview || "No content available",
    },
  });
}

// Hide/unhide email
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const emailId = Number(id);
  if (!emailId || Number.isNaN(emailId)) {
    return NextResponse.json({ error: "Invalid email ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = await prisma.emailMessage.update({
    where: { id: emailId },
    data: { hidden: body.hidden },
  });

  // Verify ownership
  if (email.userId !== user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ email });
}

