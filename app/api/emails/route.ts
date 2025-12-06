import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emails = await prisma.emailMessage.findMany({
    where: { userId: user.userId, hidden: false },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ emails });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.emailId) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = await prisma.emailMessage.findFirst({
    where: { id: body.emailId, userId: user.userId },
  });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const existingTask = await prisma.workTask.findFirst({
    where: { userId: user.userId, source: "email", externalId: email.messageId },
  });

  if (existingTask) {
    return NextResponse.json({ task: existingTask, email });
  }

  const task = await prisma.workTask.create({
    data: {
      userId: user.userId,
      title: email.subject,
      context: email.preview ?? null,
      status: "todo",
      source: "email",
      externalId: email.messageId,
    },
  });

  if (!email.isTask) {
    await prisma.emailMessage.update({
      where: { id: email.id },
      data: { isTask: true },
    });
  }

  return NextResponse.json({ task, email });
}
