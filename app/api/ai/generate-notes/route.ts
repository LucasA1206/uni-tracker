import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, appendFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthUser } from "@/lib/auth";

export const maxDuration = 300;

const SYSTEM_PROMPT = `
You are an expert academic note-taker. 
Your task is to generate highly structured, visually appealing, and educational notes from the provided lecture content.
You may be given a lecture audio recording, one or more lecture slide PDFs, or both — use ALL provided materials to create the most complete, accurate notes possible.
When slides are provided, extract key diagrams, definitions, titles, and bullet points from them and integrate them into the notes. Cross-reference the audio content with slide content.
The notes must be formatted in strict Markdown.

Follow this structure and formatting guide exactly:

1.  **# [Lecture Title]** 
    *   This should be the very first line.
    *   Infer a clear, professional title from the slides or audio if not explicitly stated.

2.  **### Brief Overview**
    *   A concise summary of the lecture's main goals and topic.

3.  **### Key Takeaways**
    *   Use a bulleted list for the most critical points.

4.  **---** (Horizontal Rule)

5.  **## [Major Section Title]** (e.g., "Core Concepts", "Architecture", "Algorithms")
    *   Use **##** for major distinct sections.
    *   Use **###** for sub-sections within these major sections.
    *   **Bold** key terms and definitions when they are first introduced.
    *   If slides are present, follow their section/chapter structure.

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
        const authUser = await getAuthUser(req);
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser.userId }
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const apiKey = user.googleApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "No Google API Key configured. Please add one in settings or configure the server." },
                { status: 400 }
            );
        }

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

        // Save chunk to database
        await prisma.fileChunk.create({
            data: {
                fileId: safeFileId,
                chunkIndex,
                data: buffer,
            }
        });

        if (chunkIndex < totalChunks - 1) {
            return NextResponse.json({ status: "chunk_received", chunkIndex }, { status: 200 });
        }

        console.log("All chunks received. Assembling file from DB...", safeFileId);

        // Fetch all chunks from DB in order
        const chunks = await prisma.fileChunk.findMany({
            where: { fileId: safeFileId },
            orderBy: { chunkIndex: 'asc' }
        });

        if (chunks.length !== totalChunks) {
            throw new Error(`Expected ${totalChunks} chunks but found ${chunks.length}. Upload may have been interrupted. Please try again.`);
        }

        // Write all chunks to the temporary file
        await writeFile(tempFilePath, Buffer.alloc(0));
        for (const chunk of chunks) {
            await appendFile(tempFilePath, chunk.data);
        }

        // Clean up chunks from DB
        await prisma.fileChunk.deleteMany({
            where: { fileId: safeFileId }
        });

        console.log("File assembled. Processing file with Gemini:", tempFilePath);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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

        // Handle optional slide PDFs (up to 5)
        const slideCount = parseInt(formData.get("slideCount") as string || "0");
        const slideParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];

        for (let i = 0; i < Math.min(slideCount, 5); i++) {
            const slideFile = formData.get(`slideFile_${i}`) as File | null;
            const slideName = (formData.get(`slideName_${i}`) as string) || `slide_${i}.pdf`;
            if (slideFile) {
                const slideBuffer = Buffer.from(await slideFile.arrayBuffer());
                slideParts.push({
                    inlineData: {
                        data: slideBuffer.toString("base64"),
                        mimeType: "application/pdf"
                    }
                });
                console.log(`Loaded slide ${i + 1}: ${slideName} (${(slideBuffer.length / 1024).toFixed(1)} KB)`);
            }
        }

        const hasSlides = slideParts.length > 0;
        const userPrompt = hasSlides
            ? `Please generate comprehensive lecture notes using both the provided audio recording and the ${slideParts.length} lecture slide PDF${slideParts.length > 1 ? 's' : ''}. Use the slide structure to organise sections, and fill in details from the audio.`
            : "Please format the following audio recording into lecture notes.";

        console.log(`Generating structured notes... (audio + ${slideParts.length} slide file(s))`);
        const result = await model.generateContent([
            SYSTEM_PROMPT,
            { text: userPrompt },
            ...audioParts,
            ...slideParts,
        ]);

        const generatedNotes = result.response.text();
        console.log("Notes generated successfully. Length:", generatedNotes.length);

        const titleMatch = generatedNotes.match(/^# (.*)$/m);
        const title = titleMatch ? titleMatch[1].replace(/[*#]/g, '').trim() : `Lecture Notes: ${originalName}`;

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
