import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { writeFile, appendFile, unlink } from "fs/promises"; // stat removed as we rely on Gemini
import { join } from "path";
import { tmpdir } from "os";

export const maxDuration = 300; // Increased timeout for long audio processing

// System prompt to guide the AI
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
    *   If ANY code, algorithms, or technical syntax is mentioned, you MUST use a code block:
        \`\`\`language
        // Code here
        \`\`\`
    *   Do not inline large code snippets.

7.  **Structured Data (Tables)**:
    *   If comparisons, lists of properties, or data can be structured, USE A MARKDOWN TABLE.
    *   Example:
        | Concept | Definition | Example |
        | :--- | :--- | :--- |
        | A | B | C |

8.  **## Summary & Definitions**
    *   Conclude with a glossery of terms or a final summary.

**Formatting Rules:**
*   **Tiered Headers**: H1 (#) for Title, H2 (##) for high-level sections, H3 (###) for subsections.
*   **Emphasis**: Use **bold** for key concepts and *italics* for minor emphasis.
*   **Lists**: Use indented bullet points (-) for readability.
*   **Tables**: Essential for structured data.
`;

export async function POST(req: NextRequest) {
    let tempFilePath = "";
    let uploadedFileUri = "";

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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not set");
            return NextResponse.json({ error: "Server configuration error: GEMINI_API_KEY missing" }, { status: 500 });
        }

        // Initialize Gemini clients
        const genAI = new GoogleGenerativeAI(apiKey);
        const fileManager = new GoogleAIFileManager(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });

        // 1. Save Chunk
        // Ensure tmpdir is valid and use resolve
        const tempDir = tmpdir();
        console.log(`[AI-API] Using temp dir: ${tempDir}`);
        const safeFileId = fileId.replace(/[^a-zA-Z0-9-]/g, '');
        const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, '');
        tempFilePath = join(tempDir, `${safeFileId}-${safeOriginalName}`);

        console.log(`[AI-API] Processing chunk ${chunkIndex}/${totalChunks} for file: ${tempFilePath}`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        try {
            if (chunkIndex === 0) {
                await writeFile(tempFilePath, buffer);
            } else {
                await appendFile(tempFilePath, buffer);
            }
        } catch (fsError: any) {
            console.error("[AI-API] File system error:", fsError);
            throw new Error(`Failed to write temp file: ${fsError.message}`);
        }

        // If not the last chunk, return success and wait for next
        if (chunkIndex < totalChunks - 1) {
            return NextResponse.json({ status: "chunk_received", chunkIndex }, { status: 200 });
        }

        // --- LAST CHUNK RECEIVED: PROCESS FILE ---
        console.log("All chunks received. Processing file with Gemini:", tempFilePath);

        // 2. Upload to Gemini File API
        console.log("Uploading to Gemini File Manager...");
        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
            mimeType: "audio/mp3", // Defaulting to mp3, but Gemini is flexible. Could infer from extension.
            displayName: originalName,
        });

        uploadedFileUri = uploadResponse.file.uri;
        console.log(`Uploaded file: ${uploadResponse.file.displayName} as ${uploadedFileUri}`);

        // Wait for processing to be active
        let fileState = uploadResponse.file.state;
        while (fileState === FileState.PROCESSING) {
            console.log("Waiting for file processing...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const fileStatus = await fileManager.getFile(uploadResponse.file.name);
            fileState = fileStatus.state;
            if (fileState === FileState.FAILED) {
                throw new Error("Gemini file processing failed.");
            }
        }

        console.log("File is ready. Generating notes...");

        // 3. Generate Content
        const result = await model.generateContent([
            SYSTEM_PROMPT,
            {
                fileData: {
                    fileUri: uploadedFileUri,
                    mimeType: uploadResponse.file.mimeType,
                },
            },
        ]);

        const generatedNotes = result.response.text();
        console.log("Notes generated successfully. Length:", generatedNotes.length);

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

        // Cleanup local file
        await unlink(tempFilePath).catch(() => { });

        // Cleanup Gemini file (best practice to not clutter storage)
        // We can do this in the background or await it
        await fileManager.deleteFile(uploadResponse.file.name).catch((err) => {
            console.warn("Failed to delete file from Gemini:", err);
        });

        return NextResponse.json({ note: newNote }, { status: 201 });

    } catch (error: any) {
        console.error("AI Generation Error:", error);

        // Cleanup on error
        if (tempFilePath && tempFilePath.includes("upload-")) {
            await unlink(tempFilePath).catch(() => { });
        }

        return NextResponse.json(
            { error: error.message || "Failed to generate notes" },
            { status: 500 }
        );
    }
}
