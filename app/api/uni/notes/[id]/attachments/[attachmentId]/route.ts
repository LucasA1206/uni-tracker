import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id, attachmentId } = await params;
        const noteId = parseInt(id);
        const attId = parseInt(attachmentId);

        if (isNaN(noteId) || isNaN(attId)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        // 1. Verify ownership of the NOTE
        const note = await prisma.note.findFirst({
            where: {
                id: noteId,
                course: {
                    userId: user.userId
                }
            }
        });

        if (!note) {
            return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
        }

        // 2. Verify attachment belongs to note
        const attachment = await prisma.noteAttachment.findFirst({
            where: {
                id: attId,
                noteId: noteId
            }
        });

        if (!attachment) {
            return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
        }

        // 3. Delete
        await prisma.noteAttachment.delete({
            where: { id: attId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[API] DELETE attachment error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
