import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthUser } from "@/lib/auth";
import { rejectOversizedBody, sanitizeInt } from "@/lib/sanitize";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    // ✅ Auth check BEFORE reading body
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const oversized = rejectOversizedBody(req, 8 * 1024);
    if (oversized) return oversized;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const body = rawBody as Record<string, unknown>;
    const { noteId, courseId } = body;
    const questionCountRaw = body.questionCount ?? 10;
    const questionCount = Math.min(Math.max(sanitizeInt(questionCountRaw) ?? 10, 1), 30);

    if (!noteId && !courseId) {
      return NextResponse.json({ error: "Must provide either noteId or courseId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let contentToQuiz = "";

    if (noteId) {
      const noteIdInt = sanitizeInt(noteId);
      if (noteIdInt === null) {
        return NextResponse.json({ error: "Invalid noteId" }, { status: 400 });
      }
      // ✅ Ownership check — filter by userId so users can't read each other's notes
      const note = await prisma.note.findFirst({
        where: { id: noteIdInt, userId: authUser.userId },
      });
      if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
      contentToQuiz = `Title: ${note.title}\n\nContent:\n${note.content}`;
    } else if (courseId) {
      const courseIdInt = sanitizeInt(courseId);
      if (courseIdInt === null) {
        return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
      }
      // ✅ Ownership check — verify course belongs to user before fetching its notes
      const course = await prisma.uniCourse.findFirst({
        where: { id: courseIdInt, userId: authUser.userId },
      });
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

      const notes = await prisma.note.findMany({
        where: { courseId: courseIdInt, userId: authUser.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (notes.length === 0) {
        return NextResponse.json({ error: "No notes found for this course" }, { status: 404 });
      }

      contentToQuiz = notes
        .map((n) => `Title: ${n.title}\n\nContent:\n${n.content}`)
        .join("\n\n---\n\n");
    }

    const apiKey = user.googleApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No Google API Key configured. Please add one in settings or configure the server." },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const promptTemplate = `
You are an expert tutor. Create a quiz with exactly ${questionCount} questions based on the following study notes.
Output MUST be a valid JSON array of objects.
Mix Multiple Choice Questions (MCQ) and Short Answer (SA) questions about 50/50.

Structure each object as:
{
  "type": "MCQ" or "SA",
  "question": "The question text",
  "options": ["A", "B", "C", "D"], // ONLY IF type is "MCQ"
  "correctAnswer": "The exact option match, or the model answer for SA",
  "explanation": "Why this is correct"
}

Study Content:
${contentToQuiz.substring(0, 15000)}
`;

    const result = await model.generateContent(promptTemplate);
    let outputText = result.response.text();

    outputText = outputText.trim();
    if (outputText.startsWith("```json")) {
      outputText = outputText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (outputText.startsWith("```")) {
      outputText = outputText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    let quiz;
    try {
      quiz = JSON.parse(outputText);
    } catch {
      throw new Error("Model failed to return valid JSON.");
    }

    return NextResponse.json({ quiz });
  } catch (error: unknown) {
    console.error("Quiz generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
