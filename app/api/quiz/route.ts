import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { noteId, courseId, title, score, totalQuestions, currentIndex, questions, wrongAnswers, isCompleted, quizId } = await req.json();

        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = {
            userId: authUser.userId,
            noteId: noteId || null,
            courseId: courseId || null,
            title: title || "Quiz",
            score: score || 0,
            totalQuestions,
            currentIndex: currentIndex || 0,
            questionsJson: JSON.stringify(questions),
            wrongAnswersJson: wrongAnswers ? JSON.stringify(wrongAnswers) : null,
            isCompleted: isCompleted || false
        };

        let quiz;
        if (quizId) {
            quiz = await prisma.recentQuiz.update({
                where: { id: quizId, userId: authUser.userId },
                data: {
                    score: data.score,
                    currentIndex: data.currentIndex,
                    wrongAnswersJson: data.wrongAnswersJson,
                    isCompleted: data.isCompleted
                }
            });
        } else {
            quiz = await prisma.recentQuiz.create({
                data
            });
        }

        return NextResponse.json({ quiz });
    } catch (error: any) {
        console.error("Failed to save quiz progress:", error);
        return NextResponse.json({ error: error.message || "Failed to save quiz" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const quizzes = await prisma.recentQuiz.findMany({
            where: { userId: authUser.userId },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({ quizzes });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
