import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthUser } from "@/lib/auth";
import { rejectOversizedBody } from "@/lib/sanitize";

export const maxDuration = 300;

// Max character lengths for AI prompt inputs
const MAX_QUESTION_LEN = 2000;
const MAX_ANSWER_LEN = 5000;
const MAX_CORRECT_ANSWER_LEN = 2000;

export async function POST(req: NextRequest) {
  try {
    // ✅ Auth check BEFORE reading body
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const oversized = rejectOversizedBody(req, 16 * 1024);
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

    // Sanitize and length-check all inputs
    const question =
      typeof body.question === "string" ? body.question.trim().slice(0, MAX_QUESTION_LEN) : null;
    const userAnswer =
      typeof body.userAnswer === "string" ? body.userAnswer.trim().slice(0, MAX_ANSWER_LEN) : null;
    const correctAnswer =
      typeof body.correctAnswer === "string"
        ? body.correctAnswer.trim().slice(0, MAX_CORRECT_ANSWER_LEN)
        : "";

    if (!question || !userAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const apiKey = user.googleApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No Google API Key configured." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const promptTemplate = `
You are an expert tutor grading a short answer question.

Question: ${question}
Ideal/Correct Answer Target: ${correctAnswer || "Not provided, answer from general knowledge"}
Student's Answer: ${userAnswer}

Task:
Evaluate the student's answer. Is it fundamentally correct and captures the core knowledge requested?
If yes, provide "isCorrect": true, and feedback like "Good job!" or slight improvements.
If no, provide "isCorrect": false, and feedback explaining what they missed and how they can improve.

Output MUST be a single valid JSON object:
{
  "isCorrect": boolean,
  "feedback": "string"
}
`;

    const result = await model.generateContent(promptTemplate);
    let outputText = result.response.text();

    outputText = outputText.trim();
    if (outputText.startsWith("```json")) {
      outputText = outputText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (outputText.startsWith("```")) {
      outputText = outputText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    let evaluation;
    try {
      evaluation = JSON.parse(outputText);
    } catch {
      throw new Error("Model failed to return valid JSON.");
    }

    return NextResponse.json(evaluation);
  } catch (error: unknown) {
    console.error("Answer marking error:", error);
    const message = error instanceof Error ? error.message : "Failed to mark answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
