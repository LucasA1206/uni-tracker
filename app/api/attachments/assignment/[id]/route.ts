import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sanitizeFilename } from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const attachmentId = parseInt(resolvedParams.id);
  if (isNaN(attachmentId)) {
    return NextResponse.json({ error: "Invalid attachment ID" }, { status: 400 });
  }

  const attachment = await prisma.assignmentAttachment.findUnique({
    where: { id: attachmentId },
    include: { assignment: { include: { course: true } } },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  // Ownership check via course
  if (attachment.assignment.course.userId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!attachment.content) {
    return NextResponse.json({ error: "No content found for this attachment" }, { status: 404 });
  }

  const safeFilename = sanitizeFilename(attachment.name);

  const headers = new Headers();
  headers.set("Content-Type", attachment.type || "application/pdf");
  headers.set("Content-Disposition", `inline; filename="${safeFilename}"`);
  headers.set("Content-Length", attachment.size.toString());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return new NextResponse(attachment.content, {
    status: 200,
    headers,
  });
}
