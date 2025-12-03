import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getOutlookEventsForUser } from "@/lib/microsoftGraph";

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [assignments, notes, tasks, outlookEvents] = await Promise.all([
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
  ]);

  const events = [
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
