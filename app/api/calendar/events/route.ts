import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getOutlookEventsForUser } from "@/lib/microsoftGraph";
import { getGoogleCalendarEventsForUser } from "@/lib/gmail";

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [assignments, notes, tasks, outlookEvents, googleEvents, manualEvents] = await Promise.all([
    prisma.assignment.findMany({
      where: { course: { userId: user.userId } },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        weight: true,
        maxGrade: true,
        grade: true,
        status: true,
        canvasId: true,
        course: { select: { id: true, code: true, name: true, canvasId: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.note.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        course: { select: { id: true, code: true, name: true, color: true } },
      },
    }),
    prisma.workTask.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        title: true,
        dueDate: true,
      },
    }),
    getOutlookEventsForUser(user.userId),
    getGoogleCalendarEventsForUser(user.userId),
    prisma.calendarEvent.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        title: true,
        description: true,
        start: true,
        end: true,
        type: true,
      },
      orderBy: { start: "asc" },
    }),
  ]);

  const events = [
    // Manual events created by user
    ...manualEvents.map((e) => ({
      id: `manual-${e.id}`,
      title: e.title,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      type: e.type || "manual",
      meta: e.description ? { description: e.description } : undefined,
    })),
    ...assignments.map((a) => {
      const courseCanvasId = a.course.canvasId || undefined;
      const assignmentCanvasId = a.canvasId || undefined;
      const canvasUrl =
        CANVAS_BASE_URL && courseCanvasId && assignmentCanvasId
          ? `${CANVAS_BASE_URL}/courses/${courseCanvasId}/assignments/${assignmentCanvasId}`
          : undefined;
      return {
        id: `assignment-${a.id}`,
        title: a.title,
        start: a.dueDate.toISOString(),
        end: a.dueDate.toISOString(),
        type: "assignment",
        meta: {
          courseId: a.course.id,
          assignmentId: a.id,
          courseCode: a.course.code,
          courseName: a.course.name ? a.course.name.split("-")[0].trim() : a.course.code,
          courseColor: a.course.color ?? undefined,
          description: a.description ?? undefined,
          weight: a.weight,
          maxGrade: a.maxGrade,
          grade: a.grade ?? undefined,
          status: a.status,
          canvasUrl,
        },
      };
    }),
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      title: n.title,
      start: n.createdAt.toISOString(),
      end: n.createdAt.toISOString(),
      type: "note",
      meta: {
        courseId: n.course?.id,
        courseCode: n.course?.code,
        courseName: n.course?.name ? n.course.name.split("-")[0].trim() : n.course?.code,
        courseColor: n.course?.color ?? undefined,
        noteUrl: `/dashboard/notes/${n.id}`,
        description: n.content,
      },
    })),
    ...tasks
      .filter((t) => t.dueDate)
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        start: (t.dueDate as Date).toISOString(),
        end: (t.dueDate as Date).toISOString(),
        type: "work",
      })),
    ...outlookEvents,
    ...googleEvents.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      type: e.type,
      meta: e.description ? { description: e.description } : undefined,
    })),
  ];

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.title || !body.start || !body.end) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const type = body.type ? String(body.type) : "manual";

  if (type === "assignment") {
    if (!body.courseId) return NextResponse.json({ error: "courseId required for assignment" }, { status: 400 });
    const assignment = await prisma.assignment.create({
      data: {
        courseId: Number(body.courseId),
        title: String(body.title),
        description: body.description ? String(body.description) : null,
        dueDate: new Date(body.start),
        weight: body.weight !== undefined ? Number(body.weight) : 0,
        maxGrade: body.maxGrade !== undefined ? Number(body.maxGrade) : 100,
        grade: body.grade !== undefined ? Number(body.grade) : null,
        status: "pending",
      },
    });
    return NextResponse.json({ event: { ...assignment, type: "assignment" } }, { status: 201 });
  } else if (type === "note") {
    const note = await prisma.note.create({
      data: {
        userId: user.userId,
        courseId: body.courseId ? Number(body.courseId) : null,
        title: String(body.title),
        content: body.description ? String(body.description) : "",
        createdAt: new Date(body.start),
      },
    });
    return NextResponse.json({ event: { ...note, type: "note" } }, { status: 201 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user.userId,
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      start: new Date(body.start),
      end: new Date(body.end),
      type,
      sourceId: null,
      sourceExtraJson: null,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  // Parse composite ID like "assignment-5", "note-3", "manual-10", "task-7"
  const match = eventId.match(/^(assignment|note|manual|task)-(\d+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid event id format" }, { status: 400 });
  }

  const [, type, rawId] = match;
  const numericId = Number(rawId);

  try {
    if (type === "assignment") {
      const existing = await prisma.assignment.findFirst({
        where: { id: numericId, course: { userId: user.userId } },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.assignment.delete({ where: { id: numericId } });
    } else if (type === "note") {
      const existing = await prisma.note.findFirst({
        where: { id: numericId, userId: user.userId },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.note.delete({ where: { id: numericId } });
    } else if (type === "manual") {
      const existing = await prisma.calendarEvent.findFirst({
        where: { id: numericId, userId: user.userId },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.calendarEvent.delete({ where: { id: numericId } });
    } else if (type === "task") {
      const existing = await prisma.workTask.findFirst({
        where: { id: numericId, userId: user.userId },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.workTask.delete({ where: { id: numericId } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete calendar event failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
