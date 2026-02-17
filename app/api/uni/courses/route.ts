import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.uniCourse.findMany({
    where: { userId: user.userId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.code) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const course = await prisma.uniCourse.create({
    data: {
      userId: user.userId,
      name: body.name,
      code: body.code,
      term: body.term || "Autumn",
      year: body.year ? Number(body.year) : 2026,
    },
  });

  return NextResponse.json({ course });
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

  // Ensure course belongs to user
  const course = await prisma.uniCourse.findFirst({ where: { id, userId: user.userId } });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Delete related assignments and notes first to satisfy referential integrity
  await prisma.assignment.deleteMany({ where: { courseId: id } });
  await prisma.note.deleteMany({ where: { courseId: id } });

  await prisma.uniCourse.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
