import { NextRequest, NextResponse } from "next/server";
import { writeFile, appendFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

// Configure ffmpeg to use the static binary
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    let tempMp4Path = "";
    let tempMp3Path = "";

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
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
        tempMp4Path = join(tempDir, `${safeFileId}-${safeOriginalName}.mp4`);
        tempMp3Path = join(tempDir, `${safeFileId}-${safeOriginalName}.mp3`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Append chunk to the temporary MP4 file
        if (chunkIndex === 0) {
            await writeFile(tempMp4Path, buffer);
        } else {
            await appendFile(tempMp4Path, buffer);
        }

        // If not the last chunk, acknowledge receipt
        if (chunkIndex < totalChunks - 1) {
            return NextResponse.json({ status: "chunk_received", chunkIndex }, { status: 200 });
        }

        console.log("All chunks received. Converting MP4 to MP3:", tempMp4Path);

        // All chunks received, perform the conversion
        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempMp4Path)
                .toFormat("mp3")
                .audioBitrate(128)
                .on("end", () => {
                    console.log("Conversion to MP3 completed.");
                    resolve();
                })
                .on("error", (err) => {
                    console.error("Error during MP4 to MP3 conversion:", err);
                    reject(err);
                })
                .save(tempMp3Path);
        });

        // Read the converted MP3 file
        const audioBuffer = await readFile(tempMp3Path);

        // Clean up temporary files
        await unlink(tempMp4Path).catch(() => { });
        await unlink(tempMp3Path).catch(() => { });

        // Return the MP3 buffer
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mp3",
                "Content-Disposition": `attachment; filename="${safeOriginalName}.mp3"`,
            },
        });

    } catch (error: any) {
        console.error("MP4 to MP3 Conversion Error:", error);

        // Clean up on error
        if (tempMp4Path) await unlink(tempMp4Path).catch(() => { });
        if (tempMp3Path) await unlink(tempMp3Path).catch(() => { });

        return NextResponse.json(
            { error: error.message || "Failed to convert MP4 to MP3" },
            { status: 500 }
        );
    }
}
