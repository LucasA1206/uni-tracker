
"use client";

import { useState, useCallback, useRef } from 'react';
import * as webllm from "@mlc-ai/web-llm";

export function useGemma() {
    const [engine, setEngine] = useState<webllm.MLCEngineInterface | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [isReady, setIsReady] = useState(false);

    const initGemma = useCallback(async () => {
        setIsLoading(true);
        setProgress("Initializing engine...");

        const initProgressCallback = (report: webllm.InitProgressReport) => {
            setProgress(report.text);
        };

        // Using Gemma-2B-it (Instruct Tuned) - Optimized for web
        // Ensure you have enough storage/cache
        const selectedModel = "gemma-2b-it-q4f32_1-MLC";

        try {
            const engine = await webllm.CreateMLCEngine(
                selectedModel,
                { initProgressCallback }
            );

            setEngine(engine);
            setIsReady(true);
            setIsLoading(false);
        } catch (err) {
            console.error("Failed to load Gemma:", err);
            setIsLoading(false);
            setProgress("Failed to load model.");
        }
    }, []);

    const generateNotes = async (text: string) => {
        if (!engine) return "";

        const messages = [
            { role: "system" as const, content: "You are a helpful assistant that summarizes university notes into clear, structured Markdown format." },
            { role: "user" as const, content: `Please summarize the following text:\n\n${text}` }
        ];

        const reply = await engine.chat.completions.create({
            messages,
            temperature: 0.7,
            max_tokens: 1024,
        });

        return reply.choices[0].message.content || "";
    };

    return { initGemma, generateNotes, isLoading, progress, isReady };
}
