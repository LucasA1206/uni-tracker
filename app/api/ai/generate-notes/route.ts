
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, appendFile, unlink, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Initialize Gemini clients
// Note: You need GOOGLE_API_KEY in .env
// Ensure environment variables are read
const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

export const maxDuration = 60;

// System prompt to guide the AI
const SYSTEM_PROMPT = `
You are an expert academic note-taker. 
Your task is to generate detailed, structured, and educational notes from the provided lecture audio/video.
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

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "GOOGLE_API_KEY is not set" }, { status: 500 });
        }

        // 1. Save Chunk
        tempFilePath = join(tmpdir(), `${fileId}-${originalName}`);

        // Check if it's the first chunk, if so, ensure we start fresh (or just append if we assume sequential)
        // We'll use appendFile. If it's chunk 0, strictly write? 
        // Actually, concurrent chunks might be issue. We assume sequential upload from client.
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

        // Validate size?
        // const stats = await stat(tempFilePath);
        // console.log("File size:", stats.size);

        // 2. Upload to Gemini File API
        console.log("Uploading to Gemini:", tempFilePath);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type || "video/mp4", // Warning: chunk might miss type, prefer passed originalType
            displayName: originalName,
        });

        const fileUri = uploadResult.file.uri;
        console.log(`Uploaded file to Gemini with URI: ${fileUri}`);

        // Wait for file to be processed
        let fileState = await fileManager.getFile(uploadResult.file.name);
        while (fileState.state === "PROCESSING") {
            console.log("File is processing...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            fileState = await fileManager.getFile(uploadResult.file.name);
        }

        if (fileState.state === "FAILED") {
            throw new Error("Gemini file processing failed.");
        }

        // 3. Generate Content
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("Generating notes...");
        const result = await model.generateContent([
            SYSTEM_PROMPT,
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: fileUri
                }
            }
        ]);

        const generatedNotes = result.response.text();
        console.log("Notes generated, length:", generatedNotes.length);

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
        // Only cleanup on error if it's the last chunk or if we want to be safe?
        // If chunk fails, we might leave partial file, but tmpdir cleans up eventually.
        // If processing fails, we should cleanup.
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
