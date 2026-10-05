
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export function useWhisper() {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [progress, setProgress] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const worker = useRef<Worker | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
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
                    if (data && data.status === 'progress') {
                        setProgress(data.progress || 0);
                    }
                } else if (status === 'complete') {
                    if (output && output.text) {
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
                        transcriptionResolve.current("");
                        transcriptionResolve.current = null;
                    }
                }
            };
        }

        return () => worker.current?.terminate();
    }, []);

    const initMediaRecorder = (stream: MediaStream) => {
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
        setTranscription('');
        setAudioBlob(null);
    };

    const startRecording = useCallback(async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            initMediaRecorder(stream);
            return true;
        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert(
                    "Microphone access was denied by your browser.\n\n" +
                    "In Opera / Chrome: Click the icon to the left of the URL address bar, ensure Microphone is set to 'Allow', then refresh the page.\n\n" +
                    "Also check Windows Settings → Privacy & Security → Microphone to make sure desktop apps can access your microphone."
                );
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                alert("No microphone found. Please connect a microphone and try again.");
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                alert("Your microphone is already in use by another application. Please close other apps using it and try again.");
            } else {
                alert(`Could not access microphone.\n\nError: ${err.name} — ${err.message}\n\nIf this persists, check that the page is running over HTTPS and that microphone permissions are allowed in your browser's site settings.`);
            }
            return false;
        }
    }, []);

    const startSystemRecording = useCallback(async (): Promise<boolean> => {
        try {
            // Request system audio via screen sharing
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Check if we got an audio track
            if (stream.getAudioTracks().length === 0) {
                alert("No system audio detected. Please make sure to check 'Share System Audio' in the browser dialog.");
                stream.getTracks().forEach(track => track.stop());
                return false;
            }

            // We only need the audio
            const audioStream = new MediaStream(stream.getAudioTracks());
            initMediaRecorder(audioStream);

            // Listen for the user clicking "Stop Sharing" on the browser UI
            stream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };
            return true;
        } catch (err) {
            console.error("Error accessing system audio:", err);
            return false;
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

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        const recorder = mediaRecorder.current;
        if (!recorder) return null;

        return new Promise<Blob | null>((resolve) => {
            recorder.onstop = async () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                setAudioBlob(audioBlob);

                try {
                    const audioData = await processAudio(audioBlob);
                    worker.current?.postMessage({ audio: audioData });

                    // Stop all tracks
                    recorder.stream.getTracks().forEach(track => track.stop());
                } catch (err) {
                    console.error("Error processing recording:", err);
                }
                resolve(audioBlob);
            };

            if (recorder.state !== 'inactive') {
                recorder.stop();
            } else {
                resolve(null);
            }
        });
    }, []);

    return {
        isTranscribing,
        transcription,
        startRecording,
        startSystemRecording,
        stopRecording,
        transcribeFile,
        progress,
        audioBlob
    };
}
