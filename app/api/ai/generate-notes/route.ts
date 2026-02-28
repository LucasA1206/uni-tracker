import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, appendFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 300;

const SYSTEM_PROMPT = `
You are an expert academic note-taker. 
Your task is to generate highly structured, visually appealing, and educational notes from the provided lecture audio, mimicking the style of high-quality formatted PDFs.
The notes must be formatted in strict Markdown.

Follow this structure and formatting guide exactly:

1.  **# [Lecture Title]** 
    *   This should be the very first line.
    *   Infer a clear, professional title if not provided.

2.  **### Brief Overview**
    *   A concise summary of the lecture's main goals and topic.

3.  **### Key Takeaways**
    *   Use a bulleted list for the most critical points.

4.  **---** (Horizontal Rule)

5.  **## [Major Section Title]** (e.g., "Core Concepts", "Architecture", "Algorithms")
    *   Use **##** for major distinct sections.
    *   Use **###** for sub-sections within these major sections.
    *   **Bold** key terms and definitions when they are first introduced.

6.  **Code & Technical Details**:
    *   If ANY code, algorithms, or technical syntax is mentioned, you MUST use a code block.
    *   Do not inline large code snippets.

7.  **Structured Data (Tables)**:
    *   If comparisons, lists of properties, or data can be structured, USE A MARKDOWN TABLE.

8.  **## Summary & Definitions**
    *   Conclude with a glossary of terms or a final summary.
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

        const tempDir = tmpdir();
        const safeFileId = fileId.replace(/[^a-zA-Z0-9-]/g, '');
        const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, '');
        tempFilePath = join(tempDir, `${safeFileId}-${safeOriginalName}`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (chunkIndex === 0) {
            await writeFile(tempFilePath, buffer);
        } else {
            await appendFile(tempFilePath, buffer);
        }

        if (chunkIndex < totalChunks - 1) {
            return NextResponse.json({ status: "chunk_received", chunkIndex }, { status: 200 });
        }

        console.log("All chunks received. Processing file with Gemini:", tempFilePath);

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const audioBuffer = await readFile(tempFilePath);

        const ext = safeOriginalName.split('.').pop()?.toLowerCase();
        let mimeType = "audio/mp3";
        if (ext === "webm") mimeType = "audio/webm";
        else if (ext === "wav") mimeType = "audio/wav";
        else if (ext === "m4a") mimeType = "audio/mp4";

        const audioParts = [
            {
                inlineData: {
                    data: audioBuffer.toString("base64"),
                    mimeType
                }
            }
        ];

        console.log("Generating structured notes...");
        const result = await model.generateContent([
            SYSTEM_PROMPT,
            { text: "Please format the following audio recording into lecture notes." },
            ...audioParts
        ]);

        const generatedNotes = result.response.text();
        console.log("Notes generated successfully. Length:", generatedNotes.length);

        const titleMatch = generatedNotes.match(/^# (.*)$/m);
        const title = titleMatch ? titleMatch[1].replace(/[*#]/g, '').trim() : `Lecture Notes: ${originalName}`;

        const user = await prisma.user.findFirst();
        if (!user) {
            throw new Error("No user found in database.");
        }

        const newNote = await prisma.note.create({
            data: {
                title: title || "Untitled Notes",
                content: generatedNotes,
                userId: user.id,
                courseId: courseId ? parseInt(courseId) : undefined,
            },
        });

        await unlink(tempFilePath).catch(() => { });

        return NextResponse.json({ note: newNote }, { status: 201 });

    } catch (error: any) {
        console.error("AI Generation Error:", error);

        if (tempFilePath) {
            await unlink(tempFilePath).catch(() => { });
        }

        return NextResponse.json(
            { error: error.message || "Failed to generate notes" },
            { status: 500 }
        );
    }
}
