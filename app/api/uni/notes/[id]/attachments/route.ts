import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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

    // Enforce 5MB limit
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create attachment in DB with content
    const attachment = await prisma.noteAttachment.create({
        data: {
            noteId: noteId,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            content: buffer,
            url: "", // Will update with correct URL after creation
        },
    });

    // Update URL to point to our new API
    // We do this in a second step or could calculate it if ID was known, but update is safer here
    const publicUrl = `/api/attachments/${attachment.id}`;

    const updatedAttachment = await prisma.noteAttachment.update({
        where: { id: attachment.id },
        data: { url: publicUrl },
        select: {
            id: true,
            noteId: true,
            name: true,
            url: true,
            type: true,
            size: true,
            createdAt: true,
            // Exclude content from response to keep it light
        }
    });

    return NextResponse.json({ attachment: updatedAttachment }, { status: 201 });
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
        select: {
            id: true,
            noteId: true,
            name: true,
            url: true,
            type: true,
            size: true,
            createdAt: true,
            // Exclude content
        }
    });

    return NextResponse.json({ attachments });
}
