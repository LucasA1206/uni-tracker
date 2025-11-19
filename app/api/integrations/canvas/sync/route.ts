import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;
const CANVAS_API_TOKEN = process.env.CANVAS_API_TOKEN; // optional default / fallback

// Map specific usernames to their own Canvas API tokens from env
const USER_CANVAS_TOKENS: Record<string, string | undefined> = {
  LucasA001: process.env.CANVAS_API_TOKEN1,
  RileyS001: process.env.CANVAS_API_TOKEN2,
  LucasA06L process.env.CANVAS_API_TOKEN1,
  Riley001: process.env.CANVAS_API_TOKEN2,
};

export async function POST(_req: NextRequest) {
  if (!CANVAS_BASE_URL) {
    return NextResponse.json(
      { error: "CANVAS_BASE_URL is not set. Configure it in your environment variables." },
      { status: 400 },
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perUserToken = USER_CANVAS_TOKENS[user.username];
  const apiToken = perUserToken || CANVAS_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { error: "No Canvas API token configured for this user. Set a per-user token or CANVAS_API_TOKEN." },
      { status: 400 },
    );
  }

  const headers = {
    Authorization: `Bearer ${apiToken}`,
    Accept: "application/json",
  };

  // 1. Fetch courses
  const coursesRes = await fetch(`${CANVAS_BASE_URL}/api/v1/courses?per_page=100`, {
    headers,
  });

  if (!coursesRes.ok) {
    const body = await coursesRes.text();
    return NextResponse.json({ error: "Failed to fetch courses", body }, { status: 400 });
  }

  const courses = (await coursesRes.json()) as unknown as Array<{
    id: number;
    name: string;
    course_code?: string | null;
  }>;

  // Upsert courses into UniCourse (per user, per Canvas course)
  const courseMap: Record<number, number> = {};
  for (const c of courses) {
    if (!c.id || !c.name) continue;
    const code = c.course_code ?? c.name;
    const canvasId = String(c.id);

    const course = await prisma.uniCourse.upsert({
      where: {
        userId_canvasId: {
          userId: user.userId,
          canvasId,
        },
      },
      create: {
        userId: user.userId,
        name: c.name,
        code,
        canvasId,
      },
      update: {
        name: c.name,
        code,
      },
    });

    courseMap[c.id] = course.id;
  }

  // 2. Fetch assignments for each course and upsert
  for (const c of courses) {
    const uniCourseId = courseMap[c.id];
    if (!uniCourseId) continue;

    const assignmentsRes = await fetch(
      `${CANVAS_BASE_URL}/api/v1/courses/${c.id}/assignments?include[]=submission&per_page=100`,
      { headers },
    );

    if (!assignmentsRes.ok) continue;

    const assignments = (await assignmentsRes.json()) as unknown as Array<{
      id: number;
      name: string;
      description?: string | null;
      due_at?: string | null;
      points_possible?: number | null;
      submission?: { score?: number | null } | null;
    }>;
    const totalPoints = assignments.reduce(
      (sum, a) => sum + (a.points_possible || 0),
      0,
    );

    for (const a of assignments) {
      if (!a.id || !a.name) continue;
      const canvasId = String(a.id);
      const points = a.points_possible || 0;
      const weight = totalPoints > 0 ? points / totalPoints : 0;

      const grade =
        a.submission && typeof a.submission.score === "number"
          ? a.submission.score
          : null;

      await prisma.assignment.upsert({
        where: {
          courseId_canvasId: {
            courseId: uniCourseId,
            canvasId,
          },
        },
        create: {
          courseId: uniCourseId,
          title: a.name,
          description: a.description || null,
          // If Canvas has no due date, store a sentinel date (epoch) so the UI can show "No due date"
          dueDate: a.due_at ? new Date(a.due_at) : new Date(0),
          weight,
          maxGrade: points || 100,
          grade,
          status: grade != null ? "completed" : "pending",
          canvasId,
          followupPeople: null,
        },
        update: {
          title: a.name,
          description: a.description || null,
          // Only update dueDate when Canvas actually has one set
          dueDate: a.due_at ? new Date(a.due_at) : undefined,
          weight,
          maxGrade: points || 100,
          grade,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
