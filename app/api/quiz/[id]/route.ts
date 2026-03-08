import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const quizId = parseInt(resolvedParams.id);

        const quiz = await prisma.recentQuiz.findUnique({
            where: { id: quizId }
        });

        if (!quiz || quiz.userId !== authUser.userId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.recentQuiz.delete({
            where: { id: quizId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
