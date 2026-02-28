import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env, pipeline } from "@xenova/transformers";
import { writeFile, appendFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { WaveFile } from "wavefile";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

// Configure fluent-ffmpeg to use the static binary
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const maxDuration = 300; // Increased timeout for long audio processing

// Configure Transformers.js for server-side
env.allowLocalModels = false;
env.useBrowserCache = false;

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
`;

export async function POST(req: NextRequest) {
    let tempFilePath = "";
    let wavFilePath = "";

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
        console.log("All chunks received. Processing file locally:", tempFilePath);

        wavFilePath = tempFilePath + ".wav";
        console.log("Converting audio to 16kHz WAV using FFmpeg...");

        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempFilePath)
                .toFormat("wav")
                .audioChannels(1)
                .audioFrequency(16000)
                .on("end", () => resolve())
                .on("error", (err: any) => reject(new Error("FFmpeg conversion failed: " + err.message)))
                .save(wavFilePath);
        });

        console.log("Reading WAV file...");
        const wavBuffer = await readFile(wavFilePath);
        const wav = new WaveFile(wavBuffer);
        wav.toBitDepth("32f"); // Convert to 32-bit float
        wav.toSampleRate(16000); // Ensure sample rate is correct

        let audioData: any = wav.getSamples(false, Float32Array as any);
        if (Array.isArray(audioData)) {
            // Downmix to mono if stereos were somehow bypassed by ffmpeg
            audioData = audioData[0];
        }

        console.log("Loading Whisper model (this may take a bit on first run)...");
        const transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en");

        console.log("Transcribing audio (local CPU processing)...");
        const output = await transcriber(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
        });

        const transcription = Array.isArray(output) ? output[0].text : output.text;
        console.log("Transcription complete. Length:", transcription.length);

        console.log("Loading instruction model for formatting...");
        // Using a tiny instruction model
        const generator = await pipeline("text-generation", "Xenova/Qwen1.5-0.5B-Chat");

        console.log("Generating structured notes...");
        const prompt = `<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\nPlease format the following lecture transcript into notes:\n\n${transcription}<|im_end|>\n<|im_start|>assistant\n`;

        const genOutput = await generator(prompt, {
            max_new_tokens: 1500,
            temperature: 0.3,
        });

        let generatedNotes = "";
        if (Array.isArray(genOutput) && genOutput.length > 0) {
            const rawText = (genOutput[0] as any).generated_text as string;
            // Extract just the assistant's reply
            generatedNotes = rawText.split("<|im_start|>assistant\\n").pop() || "";
            generatedNotes = generatedNotes.replace("<|im_end|>", "").trim();
        } else {
            generatedNotes = transcription; // Fallback to raw transcription
        }

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

        // Cleanup local files
        await unlink(tempFilePath).catch(() => { });
        await unlink(wavFilePath).catch(() => { });

        return NextResponse.json({ note: newNote }, { status: 201 });

    } catch (error: any) {
        console.error("AI Generation Error:", error);

        // Cleanup on error
        if (tempFilePath && tempFilePath.includes("upload-")) {
            await unlink(tempFilePath).catch(() => { });
        }
        if (wavFilePath) {
            await unlink(wavFilePath).catch(() => { });
        }

        return NextResponse.json(
            { error: error.message || "Failed to generate notes" },
            { status: 500 }
        );
    }
}
