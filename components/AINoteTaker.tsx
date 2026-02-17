
"use client";

import React, { useState } from 'react';
import { useWhisper } from '@/hooks/useWhisper';
import { useGemma } from '@/hooks/useGemma';
import MarkdownEditor from '@/components/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mic, StopCircle, Sparkles, FileText } from 'lucide-react';

export default function AINoteTaker() {
    const { isTranscribing, transcription, startRecording, stopRecording, progress: whisperProgress } = useWhisper();
    const { initGemma, generateNotes, isLoading: isGemmaLoading, progress: gemmaProgress, isReady: isGemmaReady } = useGemma();

    const [notes, setNotes] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleStopRecording = async () => {
        await stopRecording();
    };

    const handleGenerateNotes = async () => {
        if (!transcription) return;
        setIsGenerating(true);
        try {
            if (!isGemmaReady) {
                await initGemma(); // Lazy load if not ready
            }
            const result = await generateNotes(transcription);
            setNotes(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        AI Note Assistant
                    </CardTitle>
                    <CardDescription>
                        Record lectures and generate structured notes locally using Whisper & Gemma.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Recording Controls */}
                    <div className="flex flex-col gap-4 p-4 border rounded-lg border-slate-700 bg-slate-800/30">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                <Mic className="h-4 w-4" />
                                Audio Recording
                            </h3>
                            {isTranscribing ? (
                                <Badge variant="destructive" className="animate-pulse">Recording ({Math.round(whisperProgress)}%)</Badge>
                            ) : (
                                <Badge variant="outline" className="text-slate-400">Ready</Badge>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {!isTranscribing ? (
                                <Button onClick={startRecording} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                                    <Mic className="mr-2 h-4 w-4" /> Start Recording
                                </Button>
                            ) : (
                                <Button onClick={handleStopRecording} variant="destructive" className="w-full">
                                    <StopCircle className="mr-2 h-4 w-4" /> Stop & Transcribe
                                </Button>
                            )}
                        </div>

                        {/* Transcription Output */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-medium">Draft Transcription</label>
                            <textarea
                                className="w-full h-32 p-3 text-sm bg-slate-950 border border-slate-800 rounded-md text-slate-300 focus:ring-1 focus:ring-purple-500 font-mono resize-none"
                                value={transcription}
                                readOnly
                                placeholder="Transcription will appear here..."
                            />
                        </div>
                    </div>

                    {/* AI Generation Controls */}
                    <div className="flex flex-col gap-4 p-4 border rounded-lg border-slate-700 bg-slate-800/30">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Smart Notes
                            </h3>
                            {!isGemmaReady && (
                                <span className="text-xs text-slate-500">Model not loaded (approx 1.5GB)</span>
                            )}
                        </div>

                        {isGemmaLoading && (
                            <div className="text-xs text-slate-400 animate-pulse flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" /> {gemmaProgress}
                            </div>
                        )}

                        <Button
                            onClick={handleGenerateNotes}
                            disabled={!transcription || isGenerating || isGemmaLoading}
                            variant="secondary"
                            className="w-full"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" /> Generate Notes with Gemma
                                </>
                            )}
                        </Button>

                        {/* Final Markdown Editor */}
                        <MarkdownEditor value={notes} onChange={setNotes} />
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
