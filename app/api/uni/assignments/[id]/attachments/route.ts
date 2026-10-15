import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const assignmentId = parseInt(resolvedParams.id);
        if (isNaN(assignmentId)) {
            return NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 });
        }

        // Verify assignment ownership through course
        const assignment = await prisma.assignment.findFirst({
            where: { id: assignmentId, course: { userId: user.userId } },
        });

        if (!assignment) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 25MB limit for PDFs
        if (file.size > 25 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 25MB limit" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const attachment = await prisma.assignmentAttachment.create({
            data: {
                assignmentId: assignmentId,
                name: file.name,
                type: file.type || "application/pdf",
                size: file.size,
                content: buffer,
                url: "",
            },
        });

        const publicUrl = `/api/attachments/assignment/${attachment.id}`;

        const updatedAttachment = await prisma.assignmentAttachment.update({
            where: { id: attachment.id },
            data: { url: publicUrl },
            select: {
                id: true,
                assignmentId: true,
                name: true,
                url: true,
                type: true,
                size: true,
                createdAt: true,
            }
        });

        return NextResponse.json({ attachment: updatedAttachment }, { status: 201 });
    } catch (error: any) {
        console.error("[API] Error in POST assignment attachment:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const assignmentId = parseInt(resolvedParams.id);
    if (isNaN(assignmentId)) {
        return NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 });
    }

    const assignment = await prisma.assignment.findFirst({
        where: { id: assignmentId, course: { userId: user.userId } },
    });

    if (!assignment) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const attachments = await prisma.assignmentAttachment.findMany({
        where: { assignmentId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            assignmentId: true,
            name: true,
            url: true,
            type: true,
            size: true,
            createdAt: true,
        }
    });

    return NextResponse.json({ attachments });
}
