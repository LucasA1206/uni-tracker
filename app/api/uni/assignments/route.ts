import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.assignment.findMany({
    where: { course: { userId: user.userId } },
    include: { course: { select: { id: true, code: true } } },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.courseId || !body.title || !body.dueDate || body.weight == null || body.maxGrade == null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      courseId: body.courseId,
      title: body.title,
      description: body.description ?? null,
      dueDate: new Date(body.dueDate),
      weight: Number(body.weight),
      maxGrade: Number(body.maxGrade),
      grade: body.grade != null ? Number(body.grade) : undefined,
      status: body.status ?? undefined,
      followupPeople: Array.isArray(body.followupPeople)
        ? JSON.stringify(body.followupPeople)
        : undefined,
    },
  });

  return NextResponse.json({ assignment });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const assignment = await prisma.assignment.update({
    where: { id: body.id },
    data: {
      grade: body.grade != null ? Number(body.grade) : undefined,
      status: body.status ?? undefined,
      followupPeople: Array.isArray(body.followupPeople)
        ? JSON.stringify(body.followupPeople)
        : undefined,
    },
  });

  return NextResponse.json({ assignment });
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

  // Ensure assignment belongs to one of the user's courses
  const assignment = await prisma.assignment.findFirst({
    where: { id, course: { userId: user.userId } },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
