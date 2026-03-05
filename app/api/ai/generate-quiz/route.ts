import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthUser } from "@/lib/auth";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        const { noteId, courseId, questionCount = 10 } = await req.json();

        if (!noteId && !courseId) {
            return NextResponse.json({ error: "Must provide either noteId or courseId" }, { status: 400 });
        }

        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser.userId }
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch content based on source
        let contentToQuiz = "";

        if (noteId) {
            const note = await prisma.note.findUnique({
                where: { id: parseInt(noteId) },
            });
            if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
            contentToQuiz = `Title: ${note.title}\n\nContent:\n${note.content}`;
        } else if (courseId) {
            const notes = await prisma.note.findMany({
                where: { courseId: parseInt(courseId) },
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            if (notes.length === 0) return NextResponse.json({ error: "No notes found for this course" }, { status: 404 });

            contentToQuiz = notes.map(n => `Title: ${n.title}\n\nContent:\n${n.content}`).join("\n\n---\n\n");
        }

        const apiKey = user.googleApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "No Google API Key configured. Please add one in settings or configure the server." }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { responseMimeType: "application/json" } });

        const promptTemplate = `
You are an expert tutor. Create a quiz with exactly ${questionCount} questions based on the following study notes.
Output MUST be a valid JSON array of objects.

Structure each object as:
{
  "type": "MCQ" or "SA",
  "question": "The question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "The exact option match, or short answer model",
  "explanation": "Why this is correct"
}

Study Content:
${contentToQuiz.substring(0, 15000)}
`;

        console.log("Generating quiz with Gemini...");
        const result = await model.generateContent(promptTemplate);
        let outputText = result.response.text();

        // Attempt to clean markdown backticks if the model added them anyway
        outputText = outputText.trim();
        if (outputText.startsWith("\`\`\`json")) {
            outputText = outputText.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim();
        } else if (outputText.startsWith("\`\`\`")) {
            outputText = outputText.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim();
        }

        let quiz;
        try {
            quiz = JSON.parse(outputText);
        } catch (e: any) {
            console.error("Failed to parse JSON string returned by model:", outputText);
            throw new Error("Model failed to return valid JSON. Output was: " + outputText.substring(0, 200) + "...");
        }

        return NextResponse.json({ quiz });

    } catch (error: any) {
        console.error("Quiz generation error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
    }
}
