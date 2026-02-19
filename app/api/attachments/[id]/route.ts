import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const attachmentId = parseInt(resolvedParams.id);
    if (isNaN(attachmentId)) {
        return NextResponse.json({ error: "Invalid attachment ID" }, { status: 400 });
    }

    const attachment = await prisma.noteAttachment.findUnique({
        where: { id: attachmentId },
        include: { note: true }
    });

    if (!attachment) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Check ownership via note
    if (attachment.note.userId !== user.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!attachment.content) {
        return NextResponse.json({ error: "No content found for this attachment" }, { status: 404 });
    }

    // Create response with appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", attachment.type || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename="${attachment.name}"`);
    headers.set("Content-Length", attachment.size.toString());

    return new NextResponse(attachment.content, {
        status: 200,
        headers,
    });
}
