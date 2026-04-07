import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { rejectOversizedBody, sanitizeInt } from "@/lib/sanitize";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL ?? "https://canvas.lms.uq.edu.au";

  const assignments = await prisma.assignment.findMany({
    where: { course: { userId: user.userId } },
    include: { course: { select: { id: true, code: true, name: true, canvasId: true } } },
    orderBy: { dueDate: "asc" },
  });

  const enriched = assignments.map((a) => ({
    ...a,
    canvasUrl:
      CANVAS_BASE_URL && a.course.canvasId && a.canvasId
        ? `${CANVAS_BASE_URL}/courses/${a.course.canvasId}/assignments/${a.canvasId}`
        : null,
  }));

  return NextResponse.json({ assignments: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const oversized = rejectOversizedBody(req, 32 * 1024);
  if (oversized) return oversized;

  const body = await req.json().catch(() => null);
  if (!body || !body.courseId || !body.title || !body.dueDate || body.weight == null || body.maxGrade == null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Verify courseId belongs to the authenticated user
  const courseId = sanitizeInt(body.courseId);
  if (courseId === null) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }
  const course = await prisma.uniCourse.findFirst({
    where: { id: courseId, userId: user.userId },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Validate title length
  if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > 500) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      courseId,
      title: body.title.trim().slice(0, 500),
      description: typeof body.description === "string" ? body.description.slice(0, 5000) : null,
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

  const oversized = rejectOversizedBody(req, 32 * 1024);
  if (oversized) return oversized;

  const body = await req.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const assignmentId = sanitizeInt(body.id);
  if (assignmentId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // ✅ Ownership check — ensure assignment belongs to one of the user's courses
  const existing = await prisma.assignment.findFirst({
    where: { id: assignmentId, course: { userId: user.userId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
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

  const assignment = await prisma.assignment.findFirst({
    where: { id, course: { userId: user.userId } },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
