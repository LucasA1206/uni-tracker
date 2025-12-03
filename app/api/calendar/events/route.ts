import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getOutlookEventsForUser } from "@/lib/microsoftGraph";

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [assignments, notes, tasks, outlookEvents, manualEvents] = await Promise.all([
    prisma.assignment.findMany({
      where: { course: { userId: user.userId } },
      include: { course: { select: { code: true, canvasId: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.note.findMany({
      where: { userId: user.userId },
      include: { course: { select: { code: true } } },
    }),
    prisma.workTask.findMany({ where: { userId: user.userId } }),
    getOutlookEventsForUser(user.userId),
    prisma.calendarEvent.findMany({ where: { userId: user.userId }, orderBy: { start: "asc" } }),
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
        title: `[${a.course.code}] ${a.title}`,
        start: a.dueDate.toISOString(),
        end: a.dueDate.toISOString(),
        type: "assignment",
        meta: {
          assignmentId: a.id,
          courseCode: a.course.code,
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
      title: n.course?.code ? `[${n.course.code}] ${n.title}` : n.title,
      start: n.createdAt.toISOString(),
      end: n.createdAt.toISOString(),
      type: "note",
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
