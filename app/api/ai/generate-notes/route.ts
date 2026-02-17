import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OpenAI } from "openai";
import { writeFile, appendFile, unlink, stat } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;

// System prompt to guide the AI
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
`;

export async function POST(req: NextRequest) {
    let tempFilePath = "";

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const courseId = formData.get("courseId") as string | null;
        const chunkIndex = parseInt(formData.get("chunkIndex") as string || "0");
        const totalChunks = parseInt(formData.get("totalChunks") as string || "1");
        const fileId = formData.get("fileId") as string || `upload-${Date.now()}`;
        const originalName = formData.get("originalName") as string || "file";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
        }

        // 1. Save Chunk
        tempFilePath = join(tmpdir(), `${fileId}-${originalName}`);

        // Check if it's the first chunk, if so, ensure we start fresh (or just append if we assume sequential)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (chunkIndex === 0) {
            await writeFile(tempFilePath, buffer);
        } else {
            await appendFile(tempFilePath, buffer);
        }

        // If not the last chunk, return success and wait for next
        if (chunkIndex < totalChunks - 1) {
            return NextResponse.json({ status: "chunk_received", chunkIndex }, { status: 200 });
        }

        // --- LAST CHUNK RECEIVED: PROCESS FILE ---
        console.log("All chunks received. Processing file:", tempFilePath);

        // 2. Transcribe with OpenAI Whisper
        console.log("Transcribing with Whisper...");
        // Check file size for Whisper (limit is ~25MB). 
        // If larger, we ideally need to split, but for now we'll try to send safely.
        // Note: createReadStream is needed for OpenAI SDK
        const stats = await stat(tempFilePath);
        if (stats.size > 25 * 1024 * 1024) {
            console.warn("File is larger than 25MB. OpenAI Whisper might fail.");
        }

        const transcription = await openai.audio.transcriptions.create({
            file: createReadStream(tempFilePath) as any, // Cast to any because createReadStream returns fs.ReadStream, but OpenAI expects File or Blob
            model: "whisper-1",
        });

        const transcriptText = transcription.text;
        console.log("Transcription complete. Length:", transcriptText.length);

        // 3. Generate Content with GPT-4o
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

        // Extract a title
        const titleMatch = generatedNotes.match(/^# (.*)$/m);
        const title = titleMatch ? titleMatch[1] : `Lecture Notes: ${originalName}`;

        // 4. Save to Database
        const user = await prisma.user.findFirst();
        if (!user) {
            throw new Error("No user found in database.");
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
        // Cleanup on error
        if (tempFilePath && tempFilePath.includes("upload-")) {
            // Careful not to delete if we are mid-stream in another request, but fileId should be unique
            // await unlink(tempFilePath).catch(() => {});
        }
        return NextResponse.json(
            { error: error.message || "Failed to generate notes" },
            { status: 500 }
        );
    }
}
