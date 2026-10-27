"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { saveStoredRecording, getStoredRecording, deleteStoredRecording } from "@/lib/recording-storage";

export interface AudioRecordingContextType {
    isRecording: boolean;
    isPaused: boolean;
    recordingSource: 'mic' | 'system';
    setRecordingSource: (source: 'mic' | 'system') => void;
    recordingTime: number;
    recordedBlob: Blob | null;
    startRecording: (source?: 'mic' | 'system') => Promise<boolean>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    stopRecording: () => Promise<Blob | null>;
    clearRecording: () => void;
    downloadRecording: () => void;
    setRecordedBlob: (blob: Blob | null) => void;
    formatTime: (seconds: number) => string;
}

const AudioRecordingContext = createContext<AudioRecordingContextType | null>(null);

export function useAudioRecording() {
    const context = useContext(AudioRecordingContext);
    if (!context) {
        throw new Error("useAudioRecording must be used within an AudioRecordingProvider");
    }
    return context;
}

export function AudioRecordingProvider({ children }: { children: React.ReactNode }) {
    const [recordingSource, setRecordingSource] = useState<'mic' | 'system'>('mic');
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number | null>(null);
    const pausedTimeAccumulatorRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);

    // Keep-alive Web Audio refs to prevent Chromium/Opera background tab throttling
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    // Restore any existing finished recording from IndexedDB on page mount / wake up
    useEffect(() => {
        let isMounted = true;
        getStoredRecording().then((stored) => {
            if (isMounted && stored && stored.blob && stored.blob.size > 0) {
                setRecordedBlob(stored.blob);
                setRecordingTime(stored.duration || 0);
                if (stored.source) setRecordingSource(stored.source);
            }
        }).catch((err) => {
            console.warn("Could not retrieve stored recording from IndexedDB:", err);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    // Format seconds to mm:ss
    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Helper to calculate exact elapsed seconds considering active time and paused periods
    const getElapsedSeconds = useCallback(() => {
        let elapsedMs = pausedTimeAccumulatorRef.current;
        if (recordingStartTimeRef.current !== null) {
            elapsedMs += Date.now() - recordingStartTimeRef.current;
        }
        return Math.floor(elapsedMs / 1000);
    }, []);

    // Timer management with background tab sync
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording && !isPaused) {
            const updateTime = () => {
                setRecordingTime(getElapsedSeconds());
            };
            updateTime();
            interval = setInterval(updateTime, 500);

            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    updateTime();
                }
            };
            const handleFocus = () => {
                updateTime();
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('focus', handleFocus);

            return () => {
                clearInterval(interval);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('focus', handleFocus);
            };
        }
    }, [isRecording, isPaused, getElapsedSeconds]);

    // Clean up keep-alive audio context and media stream tracks
    const cleanupAudioNodes = useCallback(() => {
        if (audioSourceRef.current) {
            try { audioSourceRef.current.disconnect(); } catch {}
            audioSourceRef.current = null;
        }
        if (gainNodeRef.current) {
            try { gainNodeRef.current.disconnect(); } catch {}
            gainNodeRef.current = null;
        }
        if (audioContextRef.current) {
            try { audioContextRef.current.close().catch(() => {}); } catch {}
            audioContextRef.current = null;
        }
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'none'; } catch {}
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                try { track.stop(); } catch {}
            });
            streamRef.current = null;
        }
    }, []);

    const initMediaRecorder = useCallback((stream: MediaStream) => {
        streamRef.current = stream;
        audioChunksRef.current = [];
        pausedTimeAccumulatorRef.current = 0;
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/mp4";

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        // Emit chunks every second to keep stream active and minimize memory loss
        recorder.start(1000);

        // Keep-alive: Route through silent GainNode
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                const source = ctx.createMediaStreamSource(stream);
                const gain = ctx.createGain();
                gain.gain.value = 0; // Silent, no echo
                source.connect(gain);
                gain.connect(ctx.destination);

                audioContextRef.current = ctx;
                audioSourceRef.current = source;
                gainNodeRef.current = gain;
            }
        } catch (e) {
            console.warn("Could not start audio keep-alive context:", e);
        }

        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'playing'; } catch {}
        }

        recordingStartTimeRef.current = Date.now();
        setRecordingTime(0);
        setIsRecording(true);
        setIsPaused(false);
        setRecordedBlob(null);
    }, []);

    const startRecording = useCallback(async (source?: 'mic' | 'system'): Promise<boolean> => {
        const targetSource = source || recordingSource;
        if (source) setRecordingSource(source);

        try {
            if (targetSource === 'mic') {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                initMediaRecorder(stream);
                return true;
            } else {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true,
                });

                if (stream.getAudioTracks().length === 0) {
                    alert("No system audio detected. Please make sure to check 'Share System Audio' in the browser dialog.");
                    stream.getTracks().forEach(track => track.stop());
                    return false;
                }

                const audioStream = new MediaStream(stream.getAudioTracks());
                initMediaRecorder(audioStream);

                // Listen for browser native "Stop sharing" button
                stream.getVideoTracks()[0].onended = () => {
                    stopRecording();
                };
                return true;
            }
        } catch (err: any) {
            console.error("Error starting recording:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert(
                    "Audio access was denied by your browser.\n\n" +
                    "Please click the lock/settings icon next to the URL address bar and ensure Microphone/Screen sharing is allowed."
                );
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                alert("No microphone found. Please connect a microphone and try again.");
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                alert("Your microphone is currently in use by another application. Please close other apps and try again.");
            } else {
                alert(`Could not start recording: ${err.message || err.name}`);
            }
            return false;
        }
    }, [recordingSource, initMediaRecorder]);

    const pauseRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === 'recording') {
            try {
                recorder.pause();
            } catch (e) {
                console.warn("Could not pause media recorder:", e);
            }
            if (recordingStartTimeRef.current !== null) {
                pausedTimeAccumulatorRef.current += Date.now() - recordingStartTimeRef.current;
                recordingStartTimeRef.current = null;
            }
            setIsPaused(true);
            setRecordingTime(Math.floor(pausedTimeAccumulatorRef.current / 1000));
            if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                try { navigator.mediaSession.playbackState = 'paused'; } catch {}
            }
        }
    }, []);

    const resumeRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === 'paused') {
            try {
                recorder.resume();
            } catch (e) {
                console.warn("Could not resume media recorder:", e);
            }
            recordingStartTimeRef.current = Date.now();
            setIsPaused(false);
            if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                try { navigator.mediaSession.playbackState = 'playing'; } catch {}
            }
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return null;

        return new Promise<Blob | null>((resolve) => {
            recorder.onstop = async () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const blob = new Blob(audioChunksRef.current, { type: mimeType });

                let finalDuration = Math.floor(pausedTimeAccumulatorRef.current / 1000);
                if (recordingStartTimeRef.current !== null) {
                    finalDuration += Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
                }
                finalDuration = Math.max(1, finalDuration);

                setRecordedBlob(blob);
                setRecordingTime(finalDuration);
                setIsRecording(false);
                setIsPaused(false);
                cleanupAudioNodes();

                // Persist to IndexedDB so it safely survives laptop sleep, lid closing, and page reloads
                try {
                    await saveStoredRecording({
                        blob,
                        duration: finalDuration,
                        source: recordingSource,
                        timestamp: Date.now(),
                        mimeType,
                    });
                } catch (e) {
                    console.warn("Failed to persist recording to IndexedDB:", e);
                }

                resolve(blob);
            };

            if (recorder.state !== 'inactive') {
                recorder.stop();
            } else {
                setIsRecording(false);
                setIsPaused(false);
                cleanupAudioNodes();
                resolve(null);
            }
        });
    }, [cleanupAudioNodes, recordingSource]);

    const clearRecording = useCallback(() => {
        setRecordedBlob(null);
        setRecordingTime(0);
        audioChunksRef.current = [];
        pausedTimeAccumulatorRef.current = 0;
        recordingStartTimeRef.current = null;
        setIsPaused(false);
        cleanupAudioNodes();
        deleteStoredRecording().catch(() => {});
    }, [cleanupAudioNodes]);

    const downloadRecording = useCallback(() => {
        if (!recordedBlob) return;
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lecture-recording-${new Date().toISOString().slice(0, 10)}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [recordedBlob]);

    return (
        <AudioRecordingContext.Provider
            value={{
                isRecording,
                isPaused,
                recordingSource,
                setRecordingSource,
                recordingTime,
                recordedBlob,
                startRecording,
                pauseRecording,
                resumeRecording,
                stopRecording,
                clearRecording,
                downloadRecording,
                setRecordedBlob,
                formatTime,
            }}
        >
            {children}

            {/* Persistent Global Floating Recorder Pill when recording is active */}
            {isRecording && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gray-900/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-red-500/40 text-white shadow-2xl shadow-red-950/30 animate-in slide-in-from-bottom-5 duration-300">
                    <span className="relative flex h-3 w-3">
                        {!isPaused && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'}`} />
                    </span>
                    <span className="text-xs font-semibold text-gray-200">
                        {isPaused ? "Lecture Paused" : "Recording Lecture"}
                    </span>
                    <span className={`font-mono text-sm font-bold min-w-[44px] ${isPaused ? 'text-amber-400' : 'text-red-400'}`}>
                        {formatTime(recordingTime)}
                    </span>
                    <div className="h-4 w-px bg-white/20" />
                    {isPaused ? (
                        <button
                            type="button"
                            onClick={resumeRecording}
                            className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                            title="Resume recording"
                        >
                            Resume
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={pauseRecording}
                            className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                            title="Pause recording"
                        >
                            Pause
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => stopRecording()}
                        className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm"
                        title="Stop recording"
                    >
                        Stop
                    </button>
                </div>
            )}
        </AudioRecordingContext.Provider>
    );
}
