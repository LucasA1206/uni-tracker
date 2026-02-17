
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OpenAI } from "openai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createReadStream } from "fs";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Set max duration to 60 seconds (or more if needed) for Vercel/Next.js

// System prompt to guide the AI on how to format the notes
const SYSTEM_PROMPT = `
You are an expert academic note-taker. 
Your task is to generate detailed, structured, and educational notes from the provided lecture transcript.
The notes should be formatted in Markdown.

Follow this structure exactly:
1.  **# [Lecture Title]** (Infer a suitable title)
2.  **### Brief Overview**: A concise summary of the lecture's main topic.
3.  **### Key Points**: Bullet points of the most important takeaways.
4.  **---** (Horizontal rule)
5.  **## [Section Title]**: Break down the content into logical sections (e.g., Administration, Core Concepts, Examples).
6.  **Code Examples**: If any code concepts or algorithms are mentioned, provide a clear code block (e.g., \`\`\`cpp ... \`\`\`).
7.  **## Key Definitions**: A list of defined terms.

Use bold text for emphasis. Ensure the tone is professional, clear, and easy to study from.
If the transcript is messy, clean it up and capture the *intent* and *information* rather than a verbatim record.
`;

export async function POST(req: NextRequest) {
    let tempFilePath = "";

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const courseId = formData.get("courseId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 1. Validate File Type
        if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
            return NextResponse.json(
                { error: "Invalid file type. Please upload audio or video." },
                { status: 400 }
            );
        }

        // 2. Save file temporarily (OpenAI API needs a file path/stream usually)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
        await writeFile(tempFilePath, buffer);

        // 3. Transcribe Audio (Whisper)
        console.log("Transcribing file:", tempFilePath);
        const transcription = await openai.audio.transcriptions.create({
            file: createReadStream(tempFilePath),
            model: "whisper-1",
        });

        const transcriptText = transcription.text;
        console.log("Transcription complete. Length:", transcriptText.length);

        // 4. Generate Notes (GPT-4o)
        console.log("Generating notes...");
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Here is the transcript of the lecture. Please generate the notes.\n\nTRANSCRIPT:\n${transcriptText}`
                },
            ],
            temperature: 0.3,
        });

        const generatedNotes = completion.choices[0].message.content || "No notes generated.";

        // Extract a title (simple heuristic: first line or filename)
        const titleMatch = generatedNotes.match(/^# (.*)$/m);
        const title = titleMatch ? titleMatch[1] : `Lecture Notes: ${file.name}`;

        // 5. Save to Database
        // We need a userId. For now, we'll hardcode or fetch from session if available. 
        // Since we don't have auth middleware in this snippet, we'll try to find a user or fail.
        // In a real app, use: const session = await getServerSession(...); const userId = session.user.id;
        // For this existing codebase, let's peek at how other API routes get the user.
        // They seem to assume a mocked user or session.
        // We'll query a default user for now to make it work

        const user = await prisma.user.findFirst();
        if (!user) {
            throw new Error("No user found in database to attach notes to.");
        }

        const newNote = await prisma.note.create({
            data: {
                title: title.trim(),
                content: generatedNotes,
                userId: user.id,
                courseId: courseId ? parseInt(courseId) : undefined,
            },
        });

        // Cleanup
        await unlink(tempFilePath).catch(() => { });

        return NextResponse.json({ note: newNote }, { status: 201 });

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        // Cleanup if error
        if (tempFilePath) {
            await unlink(tempFilePath).catch(() => { });
        }
        return NextResponse.json(
            { error: error.message || "Failed to generate notes" },
            { status: 500 }
        );
    }
}
