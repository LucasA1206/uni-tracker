import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.workTask.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      title: true,
      context: true,
      status: true,
      dueDate: true,
      followupPeople: true,
    },
    orderBy: { id: "desc" },
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.title) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const task = await prisma.workTask.create({
    data: {
      userId: user.userId,
      title: body.title,
      context: body.context ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: "todo",
      source: "manual",
      followupPeople: Array.isArray(body.followupPeople)
        ? JSON.stringify(body.followupPeople)
        : null,
    },
  });

  return NextResponse.json({ task });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Verify ownership first
  const existingTask = await prisma.workTask.findFirst({
    where: { id: body.id, userId: user.userId },
  });
  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await prisma.workTask.update({
    where: { id: body.id },
    data: {
      status: body.status ?? undefined,
      title: body.title ?? undefined,
      context: body.context ?? undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      followupPeople: Array.isArray(body.followupPeople)
        ? JSON.stringify(body.followupPeople)
        : undefined,
    },
    select: {
      id: true,
      title: true,
      context: true,
      status: true,
      dueDate: true,
      followupPeople: true,
    },
  });

  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  const id = idParam ? Number(idParam) : NaN;
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const task = await prisma.workTask.findFirst({ where: { id, userId: user.userId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.workTask.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
