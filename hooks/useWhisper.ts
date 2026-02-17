
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export function useWhisper() {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [interimResult, setInterimResult] = useState('');
    const [progress, setProgress] = useState(0);
    const worker = useRef<Worker | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const transcriptionResolve = useRef<((text: string) => void) | null>(null);

    useEffect(() => {
        if (!worker.current) {
            worker.current = new Worker(new URL('../lib/workers/whisper.worker.ts', import.meta.url), {
                type: 'module',
            });

            worker.current.onmessage = (event) => {
                const { status, output, data, error } = event.data;
                if (status === 'progress') {
                    // Handle model loading progress
                    if (data && data.status === 'progress') {
                        setProgress(data.progress || 0);
                    }
                } else if (status === 'complete') {
                    // output is usually { text: "..." }
                    let finalHeader = "";
                    if (output && output.text) {
                        finalHeader = output.text;
                        setTranscription(prev => prev + (prev ? " " : "") + output.text);
                    }
                    setIsTranscribing(false);
                    if (transcriptionResolve.current) {
                        transcriptionResolve.current(output?.text || "");
                        transcriptionResolve.current = null;
                    }
                } else if (status === 'error') {
                    console.error(error);
                    setIsTranscribing(false);
                    if (transcriptionResolve.current) {
                        transcriptionResolve.current(""); // Resolve with empty string on error
                        transcriptionResolve.current = null;
                    }
                }
            };
        }

        return () => worker.current?.terminate();
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks.current = [];

            const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
            mediaRecorder.current = new MediaRecorder(stream, { mimeType });

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.start();
            setIsTranscribing(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    }, []);

    const processAudio = async (audioBlob: Blob) => {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        let audioData = audioBuffer.getChannelData(0);
        return audioData;
    };

    const transcribeFile = useCallback(async (file: File): Promise<string> => {
        if (!worker.current) return "";
        setIsTranscribing(true);
        setTranscription('');

        return new Promise<string>((resolve) => {
            transcriptionResolve.current = resolve;
            processAudio(file).then(audioData => {
                worker.current?.postMessage({ audio: audioData });
            }).catch(err => {
                console.error("Error processing file:", err);
                setIsTranscribing(false);
                resolve("");
            });
        });
    }, []);

    const stopRecording = useCallback(async () => {
        if (!mediaRecorder.current) return;

        return new Promise<void>((resolve) => {
            mediaRecorder.current!.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

                try {
                    const audioData = await processAudio(audioBlob);
                    worker.current?.postMessage({ audio: audioData });

                    // Stop tracks
                    mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
                } catch (err) {
                    console.error("Error processing recording:", err);
                }
                resolve();
            };

            mediaRecorder.current!.stop();
        });
    }, []);

    return {
        isTranscribing,
        transcription,
        startRecording,
        stopRecording,
        transcribeFile,
        progress
    };
}
