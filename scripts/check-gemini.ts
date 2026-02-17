
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env file");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // There isn't a direct listModels on GoogleGenerativeAI instance in older SDK versions, 
        // but we can try to use the model manager if exposed or just try a standard model first.
        // Actually, newer SDKs don't expose listModels easily via the high-level client. 
        // We might need to use the lower level API or just fetch it via REST.

        // Let's try to just fetch via fetch for simplicity and to be sure it works
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((model: any) => {
                console.log(`- ${model.name} (${model.supportedGenerationMethods.join(", ")})`);
            });
        } else {
            console.log("No models found or error format:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
