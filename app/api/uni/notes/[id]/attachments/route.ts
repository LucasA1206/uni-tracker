import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    console.log("[API] POST /api/uni/notes/[id]/attachments started");

    try {
        const user = await getAuthUser();
        if (!user) {
            console.log("[API] Unauthorized");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const noteId = parseInt(resolvedParams.id);
        if (isNaN(noteId)) {
            console.log("[API] Invalid note ID:", resolvedParams.id);
            return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
        }

        // Verify note ownership
        const note = await prisma.note.findFirst({
            where: { id: noteId, userId: user.userId },
        });

        if (!note) {
            console.log("[API] Note not found:", noteId);
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        console.log("[API] Parsing formData...");
        const formData = await req.formData();
        console.log("[API] formData parsed. Getting file...");

        const file = formData.get("file") as File | null;

        if (!file) {
            console.log("[API] No file provided");
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`[API] File received: ${file.name}, size: ${file.size}, type: ${file.type}`);

        // Enforce 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            console.log("[API] File too large");
            return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
        }

        console.log("[API] Reading file buffer...");
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        console.log("[API] Buffer created. Length:", buffer.length);

        // Create attachment in DB with content
        console.log("[API] Creating attachment in DB...");
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
        console.log("[API] Attachment created:", attachment.id);

        // Update URL to point to our new API
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

        console.log("[API] Attachment updated with URL. Success.");
        return NextResponse.json({ attachment: updatedAttachment }, { status: 201 });
    } catch (error: any) {
        console.error("[API] Error in POST attachment:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
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
