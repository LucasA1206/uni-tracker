import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { validateUploadedFile } from "@/lib/fileValidation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const noteId = parseInt(resolvedParams.id, 10);
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

        // 10MB limit for note attachments
        const validation = await validateUploadedFile(file, 10 * 1024 * 1024);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const attachment = await prisma.noteAttachment.create({
            data: {
                noteId: noteId,
                name: validation.safeName,
                type: validation.mimeType,
                size: validation.buffer.length,
                content: new Uint8Array(validation.buffer),
                url: "",
            },
        });

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
            }
        });

        return NextResponse.json({ attachment: updatedAttachment }, { status: 201 });
    } catch (error) {
        console.error("[API] Error in POST note attachment:", error);
        return NextResponse.json({
            error: "An error occurred while uploading the attachment"
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const noteId = parseInt(resolvedParams.id, 10);
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
            }
        });

        return NextResponse.json({ attachments });
    } catch (error) {
        console.error("[API] Error in GET note attachments:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
