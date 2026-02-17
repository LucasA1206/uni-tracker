
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
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

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "GOOGLE_API_KEY is not set" }, { status: 500 });
        }

        // 1. Validate File Type
        // Gemini supports many types, but let's keep it to audio/video
        if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
            return NextResponse.json(
                { error: "Invalid file type. Please upload audio or video." },
                { status: 400 }
            );
        }

        // 2. Save file temporarily
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
        await writeFile(tempFilePath, buffer);

        // 3. Upload to Gemini File API
        console.log("Uploading to Gemini:", tempFilePath);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type,
            displayName: file.name,
        });

        const fileUri = uploadResult.file.uri;
        console.log(`Uploaded file to Gemini with URI: ${fileUri}`);

        // Wait for file to be processed (important for video/audio)
        let fileState = await fileManager.getFile(uploadResult.file.name);
        while (fileState.state === "PROCESSING") {
            console.log("File is processing...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            fileState = await fileManager.getFile(uploadResult.file.name);
        }

        if (fileState.state === "FAILED") {
            throw new Error("Gemini file processing failed.");
        }

        // 4. Generate Content (Gemini 1.5 Flash is efficient for multimodal)
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

        // Extract a title
        const titleMatch = generatedNotes.match(/^# (.*)$/m);
        const title = titleMatch ? titleMatch[1] : `Lecture Notes: ${file.name}`;

        // 5. Save to Database
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
        // Ideally delete from Gemini too to save storage, but it auto-expires in 48h
        // await fileManager.deleteFile(uploadResult.file.name); 

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
