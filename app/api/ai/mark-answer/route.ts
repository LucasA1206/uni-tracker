import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthUser } from "@/lib/auth";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        const { question, correctAnswer, userAnswer } = await req.json();

        if (!question || !userAnswer) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser.userId }
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const apiKey = user.googleApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "No Google API Key configured." }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { responseMimeType: "application/json" } });

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
        if (outputText.startsWith("\`\`\`json")) {
            outputText = outputText.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim();
        } else if (outputText.startsWith("\`\`\`")) {
            outputText = outputText.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim();
        }

        let evaluation;
        try {
            evaluation = JSON.parse(outputText);
        } catch (e: any) {
            throw new Error("Model failed to return valid JSON.");
        }

        return NextResponse.json(evaluation);

    } catch (error: any) {
        console.error("Answer marking error:", error);
        return NextResponse.json({ error: error.message || "Failed to mark answer" }, { status: 500 });
    }
}
