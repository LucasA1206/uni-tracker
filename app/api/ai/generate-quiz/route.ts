import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { noteId, courseId, questionCount = 10 } = await req.json();

        if (!noteId && !courseId) {
            return NextResponse.json({ error: "Must provide either noteId or courseId" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        // Fetch content based on source
        let contentToQuiz = "";
        let contextTitle = "";

        if (noteId) {
            const note = await prisma.note.findUnique({
                where: { id: parseInt(noteId) },
                include: { course: true }
            });
            if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
            contentToQuiz = `Title: ${note.title}\n\nContent:\n${note.content}`;
            contextTitle = note.title;
        } else if (courseId) {
            const notes = await prisma.note.findMany({
                where: { courseId: parseInt(courseId) },
                orderBy: { createdAt: 'desc' },
                take: 10 // Limit context if too many notes, or maybe combine all? 
                // For now, let's take the most recent 5-10 to avoid token limits if they are huge.
                // Or better, we can concatenate titles and summaries if we had them.
                // Let's try sending full content of up to 5 recent notes.
            });

            if (notes.length === 0) return NextResponse.json({ error: "No notes found for this course" }, { status: 404 });

            contentToQuiz = notes.map(n => `Title: ${n.title}\n\nContent:\n${n.content}`).join("\n\n---\n\n");
            contextTitle = `Course ID ${courseId} Notes`;
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite-001",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            type: { type: SchemaType.STRING, enum: ["MCQ", "SA"] },
                            question: { type: SchemaType.STRING },
                            options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            correctAnswer: { type: SchemaType.STRING },
                            explanation: { type: SchemaType.STRING }
                        },
                        required: ["type", "question", "correctAnswer"]
                    }
                }
            }
        });

        const prompt = `
        You are an expert tutor. Create a quiz with exactly ${questionCount} questions based on the following study notes.
        
        Requirements:
        1. Mix of Multiple Choice Questions (MCQ) and Short Answer (SA).
        2. For MCQ, provide 4 options and the exact string matching one of the options as the correctAnswer.
        3. For SA, provide a concise model answer as the correctAnswer.
        4. Focus on key concepts, definitions, and understanding.
        
        Study Content:
        ${contentToQuiz.substring(0, 30000)} // Safety limit for characters
        `;

        const result = await model.generateContent(prompt);
        const quiz = JSON.parse(result.response.text());

        return NextResponse.json({ quiz });

    } catch (error: any) {
        console.error("Quiz generation error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
    }
}
