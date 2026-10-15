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

        const resolvedParams = await params;
        const assignmentId = parseInt(resolvedParams.id);
        const attachmentId = parseInt(resolvedParams.attachmentId);

        if (isNaN(assignmentId) || isNaN(attachmentId)) {
            return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
        }

        // Verify assignment ownership through course
        const assignment = await prisma.assignment.findFirst({
            where: { id: assignmentId, course: { userId: user.userId } },
        });

        if (!assignment) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }

        const attachment = await prisma.assignmentAttachment.findFirst({
            where: { id: attachmentId, assignmentId: assignmentId },
        });

        if (!attachment) {
            return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
        }

        await prisma.assignmentAttachment.delete({
            where: { id: attachmentId },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API] Error in DELETE assignment attachment:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message
        }, { status: 500 });
    }
}
