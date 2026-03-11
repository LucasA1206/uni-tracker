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
        course: { select: { id: true, code: true, name: true, canvasId: true } },
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
        course: { select: { id: true, code: true, name: true } },
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

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user.userId,
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      start: new Date(body.start),
      end: new Date(body.end),
      type: body.type ? String(body.type) : "manual",
      sourceId: null,
      sourceExtraJson: null,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
