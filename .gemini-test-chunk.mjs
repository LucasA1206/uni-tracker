import fs from 'fs';
import os from 'os';
import path from 'path';

async function run() {
    const tempMp4Path = path.join(os.tmpdir(), "test.txt");
    if (fs.existsSync(tempMp4Path)) fs.unlinkSync(tempMp4Path);

    // Create 5MB dummy buffer
    const original = Buffer.alloc(5 * 1024 * 1024);
    for (let i = 0; i < original.length; i++) original[i] = i % 256;

    const CHUNK_SIZE = 1 * 1024 * 1024;
    const totalChunks = Math.ceil(original.length / CHUNK_SIZE);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, original.length);
        const chunk = original.subarray(start, end);

        // Simulate creating FormData on the client
        const formData = new FormData();
        const blob = new Blob([chunk]);
        formData.append("file", blob, "blob");

        // Simulate server parsing
        const file = formData.get("file");
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (chunkIndex === 0) {
            fs.writeFileSync(tempMp4Path, buffer);
        } else {
            fs.appendFileSync(tempMp4Path, buffer);
        }
    }

    const assembled = fs.readFileSync(tempMp4Path);
    console.log("Original size:", original.length);
    console.log("Assembled size:", assembled.length);
    console.log("Are they equal?", original.equals(assembled));
}

run().catch(console.error);
