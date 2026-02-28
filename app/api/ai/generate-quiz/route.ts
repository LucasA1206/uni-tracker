import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env, pipeline } from "@xenova/transformers";

// Allow enough time for local CPU inference
export const maxDuration = 300;

// Configure Transformers.js for server-side
env.allowLocalModels = false;
env.useBrowserCache = false;

export async function POST(req: NextRequest) {
    try {
        const { noteId, courseId, questionCount = 10 } = await req.json();

        if (!noteId && !courseId) {
            return NextResponse.json({ error: "Must provide either noteId or courseId" }, { status: 400 });
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

        console.log("Loading Qwen1.5-0.5B-Chat model...");
        const generator = await pipeline("text-generation", "Xenova/Qwen1.5-0.5B-Chat");

        const promptTemplate = `
You are an expert tutor. Create a quiz with exactly ${questionCount} questions based on the following study notes.
Output MUST be a valid JSON array of objects. Do not include any markdown formatting like \`\`\`json. Just the raw JSON.

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

        const prompt = `<|im_start|>system\n${promptTemplate}<|im_end|>\n<|im_start|>user\nPlease generate the JSON array quiz.<|im_end|>\n<|im_start|>assistant\n`;

        console.log("Generating quiz...");
        const result = await generator(prompt, {
            max_new_tokens: 2048,
            temperature: 0.1, // Low temp for structured outputs
        });

        let outputText = "";
        if (Array.isArray(result) && result.length > 0) {
            const rawText = (result[0] as any).generated_text as string;
            outputText = rawText.split("<|im_start|>assistant\n").pop() || "";
            outputText = outputText.replace("<|im_end|>", "").trim();
        } else {
            outputText = (result as any).generated_text || "";
        }

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
