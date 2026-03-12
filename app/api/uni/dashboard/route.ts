import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const auth = await getAuthUser();
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [courses, assignments, notes] = await Promise.all([
            prisma.uniCourse.findMany({
                where: { userId: auth.userId },
                orderBy: { id: "desc" },
            }),
            prisma.assignment.findMany({
                where: { course: { userId: auth.userId } },
                include: { course: true },
                orderBy: { dueDate: "asc" },
            }),
            prisma.note.findMany({
                where: { courseId: { not: null }, course: { userId: auth.userId } },
                select: { id: true, title: true, courseId: true, createdAt: true },
                orderBy: { createdAt: "desc" },
            })
        ]);

        return NextResponse.json({ courses, assignments, notes });
    } catch (error) {
        console.error("Dashboard data fetch failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
