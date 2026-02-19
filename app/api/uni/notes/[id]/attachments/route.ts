import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const noteId = parseInt(resolvedParams.id);
    if (isNaN(noteId)) {
        return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    // Verify note ownership
    const note = await prisma.note.findFirst({
        where: { id: noteId, userId: user.userId },
    });

    if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", "notes", noteId.toString());
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = join(uploadDir, filename);
    const publicUrl = `/uploads/notes/${noteId}/${filename}`;

    await writeFile(filepath, buffer);

    const attachment = await prisma.noteAttachment.create({
        data: {
            noteId: noteId,
            name: file.name,
            url: publicUrl,
            type: file.type || "application/octet-stream",
            size: file.size,
        },
    });

    return NextResponse.json({ attachment }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const noteId = parseInt(resolvedParams.id);
    if (isNaN(noteId)) {
        return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    const note = await prisma.note.findFirst({
        where: { id: noteId, userId: user.userId },
    });

    if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const attachments = await prisma.noteAttachment.findMany({
        where: { noteId },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attachments });
}
