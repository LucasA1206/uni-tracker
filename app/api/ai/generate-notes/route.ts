import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, appendFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { getAuthUser } from "@/lib/auth";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

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

function getAudioMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === "webm") return "audio/webm";
    if (ext === "wav") return "audio/wav";
    if (ext === "m4a") return "audio/mp4";
    if (ext === "mp4") return "video/mp4";
    return "audio/mp3";
}

export async function POST(req: NextRequest) {
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

        const contentType = req.headers.get("content-type") || "";

        // ──────────────────────────────────────────────────────────────────────────
        // Case 1: Chunk Upload (multipart/form-data)
        // ──────────────────────────────────────────────────────────────────────────
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File | null;
            const chunkIndex = parseInt(formData.get("chunkIndex") as string || "0");
            const fileId = formData.get("fileId") as string || `upload-${Date.now()}`;

            if (!file) {
                return NextResponse.json({ error: "No file chunk provided" }, { status: 400 });
            }

            const safeFileId = fileId.replace(/[^a-zA-Z0-9-]/g, '');
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Upsert chunk in database
            await prisma.fileChunk.upsert({
                where: {
                    fileId_chunkIndex: {
                        fileId: safeFileId,
                        chunkIndex,
                    }
                },
                update: {
                    data: buffer,
                },
                create: {
                    fileId: safeFileId,
                    chunkIndex,
                    data: buffer,
                }
            });

            return NextResponse.json({ status: "chunk_received", chunkIndex }, { status: 200 });
        }

        // ──────────────────────────────────────────────────────────────────────────
        // Case 2: Trigger Generation (application/json)
        // ──────────────────────────────────────────────────────────────────────────
        if (contentType.includes("application/json")) {
            const body = await req.json();
            const { action, audio, slides, courseId } = body;

            if (action !== "generate" || !audio?.fileId) {
                return NextResponse.json({ error: "Invalid generate request: missing audio details" }, { status: 400 });
            }

            const apiKey = user.googleApiKey || process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return NextResponse.json(
                    { error: "No Google API Key configured. Please add one in settings or configure the server." },
                    { status: 400 }
                );
            }

            const tempDir = tmpdir();
            const tempFilesToClean: string[] = [];
            const googleFilesToClean: string[] = [];

            const fileManager = new GoogleAIFileManager(apiKey);
            const genAI = new GoogleGenerativeAI(apiKey);
            // gemini-2.5-flash is designed for multimodal inputs (audio + multiple PDF documents)
            // gemini-2.5-flash-lite frequently encounters 500 Internal Server Errors on large multi-file payloads
            const modelName = "gemini-2.5-flash";
            const model = genAI.getGenerativeModel({ model: modelName });

            try {
                // 1. Assemble Audio File from DB Chunks
                const safeAudioFileId = String(audio.fileId).replace(/[^a-zA-Z0-9-]/g, '');
                const safeAudioName = String(audio.name || "lecture.mp3").replace(/[^a-zA-Z0-9.-]/g, '');
                const tempAudioPath = join(tempDir, `${safeAudioFileId}-${safeAudioName}`);
                tempFilesToClean.push(tempAudioPath);

                console.log(`Assembling audio file ${safeAudioFileId} from DB...`);
                const audioChunks = await prisma.fileChunk.findMany({
                    where: { fileId: safeAudioFileId },
                    orderBy: { chunkIndex: 'asc' }
                });

                if (audioChunks.length === 0) {
                    throw new Error("No audio chunks found in database. The upload may have failed or timed out.");
                }

                await writeFile(tempAudioPath, Buffer.alloc(0));
                for (const chunk of audioChunks) {
                    await appendFile(tempAudioPath, chunk.data);
                }

                // Delete audio chunks from DB
                await prisma.fileChunk.deleteMany({
                    where: { fileId: safeAudioFileId }
                });

                // Transcode non-mp3 audio (e.g. browser .webm or .wav) to MP3 for maximum Google AI File API compatibility
                let fileToUpload = tempAudioPath;
                let mimeTypeToUpload = getAudioMimeType(safeAudioName);
                let displayNameToUpload = safeAudioName;

                const isAlreadyMp3 = safeAudioName.toLowerCase().endsWith(".mp3");
                if (!isAlreadyMp3 && ffmpegStatic) {
                    const tempMp3Path = join(tempDir, `${safeAudioFileId}-converted.mp3`);
                    tempFilesToClean.push(tempMp3Path);
                    try {
                        console.log(`Transcoding audio ${safeAudioName} to MP3 for Google AI File API...`);
                        await new Promise<void>((resolve, reject) => {
                            ffmpeg(tempAudioPath)
                                .toFormat("mp3")
                                .audioBitrate(128)
                                .on("end", () => {
                                    console.log("Audio transcoding to MP3 completed.");
                                    resolve();
                                })
                                .on("error", (err) => {
                                    console.warn("ffmpeg audio transcoding error:", err);
                                    reject(err);
                                })
                                .save(tempMp3Path);
                        });
                        fileToUpload = tempMp3Path;
                        mimeTypeToUpload = "audio/mp3";
                        displayNameToUpload = `${safeAudioName.replace(/\.[^/.]+$/, "")}.mp3`;
                    } catch (convErr) {
                        console.warn("Transcoding failed, falling back to original audio format:", convErr);
                    }
                }

                console.log(`Uploading audio to Google AI File API: ${fileToUpload} (${mimeTypeToUpload})`);
                const audioUploadResult = await fileManager.uploadFile(fileToUpload, {
                    mimeType: mimeTypeToUpload,
                    displayName: displayNameToUpload,
                });
                googleFilesToClean.push(audioUploadResult.file.name);

                // Wait for audio file to transition to ACTIVE state
                let audioFileStatus = await fileManager.getFile(audioUploadResult.file.name);
                let pollCount = 0;
                while (audioFileStatus.state === "PROCESSING" && pollCount < 45) {
                    await new Promise((r) => setTimeout(r, 2000));
                    audioFileStatus = await fileManager.getFile(audioUploadResult.file.name);
                    pollCount++;
                }

                if (audioFileStatus.state === "FAILED") {
                    console.error("Google AI File API audio error:", audioFileStatus.error);
                    throw new Error(`Google AI File API failed to process the uploaded audio file: ${audioFileStatus.error?.message || "File processing failed"}`);
                }

                const audioContentPart = {
                    fileData: {
                        fileUri: audioUploadResult.file.uri,
                        mimeType: audioUploadResult.file.mimeType,
                    }
                };

                // 2. Assemble and Upload Slide PDFs (if provided)
                const slideContentParts: Array<{ fileData: { fileUri: string; mimeType: string } }> = [];
                const slideList = Array.isArray(slides) ? slides : [];

                for (let i = 0; i < Math.min(slideList.length, 5); i++) {
                    const slideMeta = slideList[i];
                    if (!slideMeta?.fileId) continue;

                    const safeSlideId = String(slideMeta.fileId).replace(/[^a-zA-Z0-9-]/g, '');
                    const safeSlideName = String(slideMeta.name || `slide_${i}.pdf`).replace(/[^a-zA-Z0-9.-]/g, '');
                    const tempSlidePath = join(tempDir, `${safeSlideId}-${safeSlideName}`);
                    tempFilesToClean.push(tempSlidePath);

                    const sChunks = await prisma.fileChunk.findMany({
                        where: { fileId: safeSlideId },
                        orderBy: { chunkIndex: 'asc' }
                    });

                    if (sChunks.length > 0) {
                        await writeFile(tempSlidePath, Buffer.alloc(0));
                        for (const chunk of sChunks) {
                            await appendFile(tempSlidePath, chunk.data);
                        }

                        await prisma.fileChunk.deleteMany({
                            where: { fileId: safeSlideId }
                        });

                        console.log(`Uploading slide ${i + 1} (${safeSlideName}) to Google AI File API...`);
                        const slideUploadResult = await fileManager.uploadFile(tempSlidePath, {
                            mimeType: "application/pdf",
                            displayName: safeSlideName,
                        });
                        googleFilesToClean.push(slideUploadResult.file.name);

                        // Ensure slide file is ready
                        let sStatus = await fileManager.getFile(slideUploadResult.file.name);
                        let sPoll = 0;
                        while (sStatus.state === "PROCESSING" && sPoll < 20) {
                            await new Promise((r) => setTimeout(r, 1500));
                            sStatus = await fileManager.getFile(slideUploadResult.file.name);
                            sPoll++;
                        }

                        if (sStatus.state === "FAILED") {
                            console.warn(`Slide ${safeSlideName} failed processing on Google AI, skipping`);
                            continue;
                        }

                        slideContentParts.push({
                            fileData: {
                                fileUri: slideUploadResult.file.uri,
                                mimeType: slideUploadResult.file.mimeType,
                            }
                        });
                    }
                }

                // 3. Generate Notes with Gemini
                const hasSlides = slideContentParts.length > 0;
                const userPrompt = hasSlides
                    ? `Please generate comprehensive lecture notes using both the provided audio recording and the ${slideContentParts.length} lecture slide PDF${slideContentParts.length > 1 ? 's' : ''}. Use the slide structure to organise sections, and fill in details from the audio.`
                    : "Please format the following audio recording into structured lecture notes.";

                console.log(`Generating notes with Gemini (Audio + ${slideContentParts.length} slide decks)...`);

                const promptParts = [
                    SYSTEM_PROMPT,
                    { text: userPrompt },
                    audioContentPart,
                    ...slideContentParts,
                ];

                let result;
                try {
                    result = await model.generateContent(promptParts);
                } catch (firstErr: any) {
                    // If a 500 error occurs, wait briefly and retry once
                    console.warn("Initial generateContent failed, retrying in 3 seconds...", firstErr?.message);
                    await new Promise((r) => setTimeout(r, 3000));
                    result = await model.generateContent(promptParts);
                }

                const generatedNotes = result.response.text();
                console.log("Notes successfully generated! Length:", generatedNotes.length);

                const titleMatch = generatedNotes.match(/^# (.*)$/m);
                const title = titleMatch ? titleMatch[1].replace(/[*#]/g, '').trim() : `Lecture Notes: ${safeAudioName}`;

                const newNote = await prisma.note.create({
                    data: {
                        title: title || "Untitled Notes",
                        content: generatedNotes,
                        userId: user.id,
                        courseId: courseId ? parseInt(courseId) : undefined,
                    },
                });

                return NextResponse.json({ note: newNote }, { status: 201 });

            } finally {
                // Clean up local temp files on disk
                for (const p of tempFilesToClean) {
                    await unlink(p).catch(() => { });
                }
                // Clean up remote Google AI files asynchronously
                for (const gName of googleFilesToClean) {
                    fileManager.deleteFile(gName).catch((err) => {
                        console.warn(`Could not delete Google AI file ${gName}:`, err?.message);
                    });
                }
            }
        }

        return NextResponse.json({ error: "Unsupported request format" }, { status: 400 });

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate notes" },
            { status: 500 }
        );
    }
}
