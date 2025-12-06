import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getOutlookEmailsForUser } from "@/lib/microsoftGraph";
import { getGmailEmailsForUser } from "@/lib/gmail";

function isLikelyTask(subject: string, preview?: string) {
  const text = `${subject} ${preview ?? ""}`.toLowerCase();
  const keywords = ["due", "assignment", "task", "action required", "to-do", "todo", "reminder"];
  return keywords.some((k) => text.includes(k));
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try Gmail first, fallback to Outlook
  let emails = await getGmailEmailsForUser(user.userId);
  if (emails.length === 0) {
    emails = await getOutlookEmailsForUser(user.userId);
  }

  let newCount = 0;
  for (const e of emails) {
    const existing = await prisma.emailMessage.findUnique({ where: { messageId: e.id } });
    if (existing) continue;

    const isTask = isLikelyTask(e.subject, e.preview);

    await prisma.emailMessage.create({
      data: {
        userId: user.userId,
        messageId: e.id,
        subject: e.subject,
        from: e.from,
        receivedAt: new Date(e.receivedAt),
        preview: e.preview,
        isTask,
      },
    });

    newCount++;

    if (isTask) {
      await prisma.workTask.create({
        data: {
          userId: user.userId,
          title: e.subject,
          context: e.preview ?? null,
          status: "todo",
          source: "email",
          externalId: e.id,
        },
      });
    }
  }

  return NextResponse.json({ success: true, count: emails.length, newCount });
}
