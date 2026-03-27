"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Loader2, Upload, FileAudio, CheckCircle2, FileText, Trash2, Mic, BrainCircuit, Monitor, Download, Square, Play, Video, X } from "lucide-react";
import { useWhisper } from "@/hooks/useWhisper";
import QuizModal from "@/components/quiz/QuizModal";

interface Course {
    id: number;
    name: string;
    code: string;
    term?: string;
    year?: number;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCourseNameParts(rawName: string): string[] {
    return rawName
        .split("-")
        .map((part) => part.trim())
        .filter(Boolean);
}

function getCourseSession(course: Course): string {
    const parts = getCourseNameParts(course.name || "");
    if (parts.length >= 2) {
        return parts[1];
    }

    if (course.term && course.year) {
        return `${course.term} ${course.year}`;
    }

    return "Other";
}

function getCourseDisplayName(course: Course): string {
    const name = course.name?.trim() || "";
    if (!name) return course.code;

    const parts = getCourseNameParts(name);
    const firstSegment = parts[0] || name;

    // Avoid duplicated code/name labels when the first segment already includes the course code.
    const firstWithoutCode = firstSegment
        .replace(new RegExp(`^${escapeRegExp(course.code)}\\s*`, "i"), "")
        .trim();

    if (firstWithoutCode) {
        return firstWithoutCode;
    }

    if (firstSegment) {
        return firstSegment;
    }

    if (course.term && course.year) {
        const term = escapeRegExp(course.term);
        return name.replace(new RegExp(`\\s*-\\s*${term}\\s+${course.year}\\s*$`, "i"), "").trim();
    }

    return name.replace(/\s*-\s*(Autumn|Spring|Summer|Winter)\s+\d{4}\s*$/i, "").trim();
}

function getCourseOptionLabel(course: Course): string {
    const displayName = getCourseDisplayName(course).trim();
    if (!displayName || displayName.toLowerCase() === course.code.toLowerCase()) {
        return course.code;
    }
    return `${course.code} - ${displayName}`;
}

function sortSessions(a: string, b: string): number {
    const parseSession = (label: string): { year: number; order: number } => {
        const match = label.match(/(Autumn|Spring|Summer|Winter)\s+(\d{4})/i);
        if (!match) return { year: 0, order: 99 };
        const term = match[1].toLowerCase();
        const year = Number(match[2]);
        const termOrder: Record<string, number> = { summer: 0, autumn: 1, winter: 2, spring: 3 };
        return { year, order: termOrder[term] ?? 99 };
    };

    const pa = parseSession(a);
    const pb = parseSession(b);

    if (pa.year !== pb.year) return pb.year - pa.year;
    if (pa.order !== pb.order) return pa.order - pb.order;
    return a.localeCompare(b);
}

interface Note {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    courseId?: number | null;
    course?: { code?: string; name?: string } | null;
}

/** Returns a short human-readable label like "COMP1234 — Data Structures" */
function getCourseLabel(note: Note): string {
    const code = note.course?.code;
    const rawName = note.course?.name || "";
    // Strip trailing session info (e.g. " - Autumn 2026") from name
    const cleanName = rawName
        .replace(/\s*-\s*(Autumn|Spring|Summer|Winter)\s+\d{4}\s*$/i, "")
        .replace(new RegExp(`^${escapeRegExp(code ?? "")}\\s*[-–]?\\s*`, "i"), "")
        .trim();
    if (!code) return "Uncategorized";
    return cleanName ? `${code} — ${cleanName}` : code;
}

const MOCK_GENERATED_CONTENT = `# C++ Course Overview

### Brief Overview
This note covers C++ Programming Course and was created from an uploaded audio. It covers course logistics, learning resources, assessment outline, academic integrity, and algorithmic examples.

### Key Points
- Structure of lectures, tutorials, and the Ed platform
- Detailed grading scheme for quizzes, assignments, and the final exam
- Coding practices and copy-paste policies using Ed and Git
- Core C++ fundamentals: syntax, types, STL containers, and common patterns
- Algorithmic techniques highlighted in the coursework

---

## Course Administration

**Lecturer**: Troy Lee
**Contact**: Email (personal) & Ed discussion forum (course queries).

**Tutorials**:
- Liberal attendance policy - attend any tutorial.
- No formal transfers needed.
- Ungraded coding challenges to reinforce lecture material.

**Ed platform**: Central hub for all course materials, discussion forum, lecture videos, and slides.

---

## Learning Resources & Tools

- **C++ environment**: No need to install a compiler for the first tutorial.
- **Google Test**: A C++ testing framework used for automatic test cases.
- **Style Guide**: Google C++ Style Guide is recommended.
- **Git workflow**: Clone assessment repositories directly from Ed. Commit frequently.

---

## Assessments Overview

| Assessment type | Quantity | Weight | Key features |
| :--- | :--- | :--- | :--- |
| Weekly graded exercises (quizzes) | 10 | 2% each (total 20%) | 5 multiple-choice questions, 1 coding challenge |
| Programming Assignment 1 | 1 | 20% | Test cases (auto-graded) + human-graded style |
| Programming Assignment 2 | 1 | 30% | Same dual marking as Assignment 1 |
| Final exam (take-home) | 1 | 30% | 20-25 multiple-choice questions, Coding portion, 48-hour window |

---

## Algorithm Design Example: Distinct Integers

**Problem**: Determine whether all integers in an array are unique.

**Proposed Solutions**:
1.  **HashMap / unordered_set**: Insert each element; if insertion fails, not distinct. O(N) average time.
2.  **Sorting + Adjacent Comparison**: Sort array, check adjacent pairs. O(N log N) time.
3.  **Double for-loop (brute force)**: Compare every pair. O(N²) time.

**Complexity Comparison**:
-   Double loop: O(N²)
-   HashMap: O(N)
-   Sorting: O(N log N)

---

## Key Concepts (Definitions)

-   **HashMap / unordered_set**: Average-case O(1) insertion/lookup.
-   **Google Test**: Unit-testing framework.
-   **Copy-paste policy**: Requires incremental code development.
-   **Implicit Conversions**: e.g., double -> int (narrowing).

---

## Basic C++ Program Structure

\`\`\`cpp
#include <iostream>

int main() {
    std::cout << "Hello, world!" << std::endl;
    return 0;
}
\`\`\`

---

## Data Type Sizes & Limits

-   **char**: 1 byte
-   **int**: 4 bytes (32 bits), range approx -2 billion to +2 billion.
-   **unsigned int**: 4 bytes, range 0 to approx 4 billion.
`;

interface NotesTabProps {
    showDemo?: boolean;
    onDemoClosed?: () => void;
}

export default function NotesTab({ showDemo, onDemoClosed }: NotesTabProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [reassignNotePopup, setReassignNotePopup] = useState<number | null>(null); // note id being reassigned

    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [convertedMp3Blob, setConvertedMp3Blob] = useState<Blob | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState("");
    const [dragActive, setDragActive] = useState(false);


    const router = useRouter();
    const [quizConfig, setQuizConfig] = useState<{ courseId?: number, noteId?: number, title: string, existingQuiz?: any } | null>(null);

    // Recorder State
    const [recordingSource, setRecordingSource] = useState<'mic' | 'system'>('mic');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const { startRecording, startSystemRecording, stopRecording, audioBlob, transcription, isTranscribing: isWhisperTranscribing } = useWhisper();

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    useEffect(() => {
        if (audioBlob) setRecordedBlob(audioBlob);
    }, [audioBlob]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartRecording = async () => {
        setRecordedBlob(null);
        setRecordingTime(0);
        if (recordingSource === 'mic') await startRecording();
        else await startSystemRecording();
        setIsRecording(true);
    };

    const handleStopRecording = async () => {
        setIsRecording(false);
        const blob = await stopRecording();
        if (blob) setRecordedBlob(blob);
    };

    const handleDownloadRecording = () => {
        if (!recordedBlob) return;
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${new Date().toISOString().slice(0, 10)}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleGenerateFromRecording = () => {
        if (!recordedBlob) return;
        const file = new File([recordedBlob], `recording-${new Date().getTime()}.webm`, { type: recordedBlob.type });
        setUploadFile(file);
    };
    // const [selectedNote, setSelectedNote] = useState<Note | null>(null); // Removed modal state

    const refresh = useCallback(async () => {
        try {
            const [coursesRes, notesRes, quizzesRes] = await Promise.all([
                fetch("/api/uni/courses"),
                fetch("/api/uni/notes"),
                fetch("/api/quiz")
            ]);

            if (coursesRes.ok) {
                const data = await coursesRes.json();
                setCourses(data.courses || []);
            }
            if (notesRes.ok) {
                const data = await notesRes.json();
                setNotes(data.notes || []);
            }
            if (quizzesRes.ok) {
                const data = await quizzesRes.json();
                setRecentQuizzes(data.quizzes || []);
            }
        } catch (err) {
            console.error("Failed to load notes tab data", err);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        if (showDemo && notes.length > 0 && !selectedNote) {
            setSelectedNote(notes[0]);
        }
    }, [showDemo, notes, selectedNote]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const isMp3 = file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3");
            const isWebm = file.type === "audio/webm" || file.type === "video/webm" || file.name.toLowerCase().endsWith(".webm");
            const isMp4 = file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
            if (isMp3 || isWebm || isMp4) {
                setUploadFile(file);
                setConvertedMp3Blob(null);
            } else {
                alert("Please upload an MP3, WEBM, or MP4 file (.mp3, .webm, .mp4)");
            }
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
            setConvertedMp3Blob(null);
        }
    };

    const handleConvertMp4 = async () => {
        if (!uploadFile) return;

        setIsProcessing(true);
        setProcessingStage("Starting MP4 upload...");

        try {
            const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks to avoid Next.js payload size limits
            const totalChunks = Math.ceil(uploadFile.size / CHUNK_SIZE);
            const fileId = `upload-${Date.now()}`;

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const percent = Math.round(((chunkIndex) / totalChunks) * 100);
                setProcessingStage(`Uploading video... ${percent}%`);

                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, uploadFile.size);
                const chunk = uploadFile.slice(start, end);

                const formData = new FormData();
                formData.append("file", chunk);
                formData.append("chunkIndex", chunkIndex.toString());
                formData.append("totalChunks", totalChunks.toString());
                formData.append("fileId", fileId);
                formData.append("originalName", uploadFile.name);

                if (chunkIndex === totalChunks - 1) {
                    setProcessingStage("Converting MP4 to MP3... (this may take a while depending on file size)");
                }

                const res = await fetch("/api/ai/convert-mp4", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `Upload failed at chunk ${chunkIndex + 1}`);
                }

                if (chunkIndex === totalChunks - 1) {
                    setProcessingStage("Finalizing conversion...");
                    const blob = await res.blob();
                    setConvertedMp3Blob(blob);
                    return;
                }
            }
        } catch (err: any) {
            console.error("Failed to convert MP4", err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProcessingStage("");
        }
    };

    const handleGenerate = async () => {
        if (!uploadFile) return;

        setIsProcessing(true);
        setProcessingStage("Starting upload...");

        try {
            const CHUNK_SIZE = 1 * 1024 * 1024; // Decreased chunk size to 1MB to avoid payload size limit
            const totalChunks = Math.ceil(uploadFile.size / CHUNK_SIZE);
            const fileId = `upload-${Date.now()}`;

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                // Update UI to show upload progress
                const percent = Math.round(((chunkIndex) / totalChunks) * 100);
                setProcessingStage(`Uploading... ${percent}%`);

                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, uploadFile.size);
                const chunk = uploadFile.slice(start, end);

                const formData = new FormData();
                formData.append("file", chunk);
                formData.append("chunkIndex", chunkIndex.toString());
                formData.append("totalChunks", totalChunks.toString());
                formData.append("fileId", fileId);
                formData.append("originalName", uploadFile.name);
                if (selectedCourseId) {
                    formData.append("courseId", selectedCourseId);
                }

                // If it's the last chunk, we update message before sending because it might take a while
                if (chunkIndex === totalChunks - 1) {
                    setProcessingStage("Processing with Gemini 2.0 Flash Lite... (this may take a minute)");
                }

                const res = await fetch("/api/ai/generate-notes", {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `Upload failed at chunk ${chunkIndex + 1}`);
                }

                const data = await res.json();

                // If this was the last chunk, we are done
                if (chunkIndex === totalChunks - 1) {
                    setProcessingStage("Finalizing notes...");
                    if (data.note?.id) {
                        router.push(`/dashboard/notes/${data.note.id}`);
                    } else {
                        await refresh();
                    }
                    setUploadFile(null);
                    setSelectedCourseId("");
                    return; // Exit function
                }
            }
        } catch (err: any) {
            console.error("Failed to generate note", err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProcessingStage("");
        }
    };

    const deleteNote = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this note?")) return;
        await fetch(`/api/uni/notes?id=${id}`, { method: "DELETE" });
        void refresh();
    };

    const updateNoteCourse = async (noteId: number, courseId: number | null) => {
        try {
            const res = await fetch("/api/uni/notes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: noteId, courseId }),
            });
            if (res.ok) {
                setReassignNotePopup(null);
                void refresh(); // full refresh to update grouping
            }
        } catch (err) {
            console.error("Failed to update note course", err);
        }
    };

    const deleteQuiz = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this quiz record?")) return;
        await fetch(`/api/quiz/${id}`, { method: "DELETE" });
        void refresh();
    };

    // Group notes by course — keyed by label so the section header already has the display text
    const notesByCourse = useMemo(() => {
        // Use a stable composite key: courseId (or "__none__") → label
        const labelByKey: Record<string, string> = {};
        const grouped: Record<string, Note[]> = {};
        notes.forEach(note => {
            const key = note.courseId ? String(note.courseId) : "__none__";
            if (!labelByKey[key]) {
                labelByKey[key] = note.courseId ? getCourseLabel(note) : "Uncategorized";
            }
            const label = labelByKey[key];
            if (!grouped[label]) grouped[label] = [];
            grouped[label].push(note);
        });
        return grouped;
    }, [notes]);

    const coursesBySession = useMemo(() => {
        const grouped: Record<string, Course[]> = {};

        courses.forEach(course => {
            const session = getCourseSession(course);
            if (!grouped[session]) grouped[session] = [];
            grouped[session].push(course);
        });

        const sortedSessions = Object.keys(grouped).sort(sortSessions);
        return sortedSessions.map((session) => ({
            session,
            courses: grouped[session].sort((a, b) => a.code.localeCompare(b.code)),
        }));
    }, [courses]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent w-fit">
                    AI Lecture Notes
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload your lecture recordings (.mp3) and let AI generate detailed, structured notes for you.
                </p>
            </div>

            {/* Split View: Upload & Recorder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left: Upload Section */}
                <motion.div
                    id="step-upload-zone"
                    layout
                    className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors duration-200 
            ${dragActive ? "border-indigo-500 bg-indigo-50/10" : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0F0F12]"}
            ${isProcessing ? "pointer-events-none opacity-80" : ""}
            `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[200px]">
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/20"></div>
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Processing your lecture</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{processingStage}</p>
                                </div>
                            </div>
                        ) : !uploadFile ? (
                            <>
                                <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-500/10 mb-2">
                                    <Upload className="w-8 h-8 text-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Drag & drop your recording here
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Supports MP3, WEBM & MP4 files (max 500MB)
                                    </p>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-gray-200 dark:border-gray-800" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-gray-50 dark:bg-[#0F0F12] px-2 text-gray-500">Or</span>
                                    </div>
                                </div>
                                <label className="cursor-pointer rounded-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-6 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    Browse Files
                                    <input type="file" className="hidden" accept=".mp3,audio/mpeg,.webm,audio/webm,video/webm,.mp4,video/mp4" onChange={handleFileChange} />
                                </label>
                            </>
                        ) : (
                            <div className="w-full max-w-md bg-gray-50 dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                                            {uploadFile.name.toLowerCase().endsWith('.mp4') ? <Video className="w-6 h-6" /> : <FileAudio className="w-6 h-6" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{uploadFile.name}</p>
                                            <p className="text-xs text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setUploadFile(null)}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <span className="sr-only">Remove</span>
                                        <Trash2 className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2 text-left">
                                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Categorize by Course <span className="text-xs normal-case font-normal ml-1">(Optional)</span></label>
                                        <select
                                            value={selectedCourseId}
                                            onChange={(e) => setSelectedCourseId(e.target.value)}
                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F12] px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        >
                                            <option value="">Select a course...</option>
                                            {coursesBySession.map((group) => (
                                                <optgroup key={group.session} label={group.session}>
                                                    {group.courses.map((course) => (
                                                        <option key={course.id} value={course.id}>
                                                            {getCourseOptionLabel(course)}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        {!uploadFile.name.toLowerCase().endsWith(".mp4") ? (
                                            <button
                                                onClick={handleGenerate}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                <Mic className="w-4 h-4" />
                                                Generate Detailed Notes
                                            </button>
                                        ) : !convertedMp3Blob ? (
                                            <button
                                                onClick={handleConvertMp4}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                <Video className="w-4 h-4" />
                                                Convert MP4 to MP3
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    <div className="text-sm text-left">
                                                        <p className="font-medium text-green-700 dark:text-green-400">Conversion Complete</p>
                                                        <p className="text-green-600 dark:text-green-500/80">{(convertedMp3Blob.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const url = URL.createObjectURL(convertedMp3Blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `${uploadFile.name.replace(/\.[^/.]+$/, "")}.mp3`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        }}
                                                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-gray-50 dark:bg-[#0F0F12]"
                                                    >
                                                        <Download className="w-4 h-4" /> Save MP3
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const file = new File([convertedMp3Blob], `${uploadFile.name.replace(/\.[^/.]+$/, "")}.mp3`, { type: convertedMp3Blob.type });
                                                            setUploadFile(file);
                                                            setConvertedMp3Blob(null);
                                                        }}
                                                        className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                                                    >
                                                        <Mic className="w-4 h-4" /> Use for AI Notes
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>


                {/* Right: Audio Recorder */}
                <div id="step-recorder-zone" className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0F0F12] p-6 flex flex-col justify-between min-h-[300px]">

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                                Audio Recorder
                            </h3>
                            {isRecording && <span className="text-sm font-mono text-red-500 font-medium">{formatTime(recordingTime)}</span>}
                        </div>

                        {/* Source Selection */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-[#1A1A1A] rounded-lg">
                            <button
                                onClick={() => setRecordingSource('mic')}
                                disabled={isRecording}
                                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${recordingSource === 'mic'
                                    ? 'bg-white dark:bg-[#2A2A2A] text-indigo-500 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    } disabled:opacity-50`}
                            >
                                <Mic className="w-4 h-4" /> Microphone
                            </button>
                            <button
                                onClick={() => setRecordingSource('system')}
                                disabled={isRecording}
                                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${recordingSource === 'system'
                                    ? 'bg-white dark:bg-[#2A2A2A] text-indigo-500 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    } disabled:opacity-50`}
                            >
                                <Monitor className="w-4 h-4" /> System Audio
                            </button>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1A1A1A] p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            {recordingSource === 'mic'
                                ? "Records audio from your default microphone. Good for in-person lectures."
                                : "Records audio from a specific tab or window. Select 'Share System Audio' in the browser popup."}
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Recording Controls */}
                        {!isRecording ? (
                            !recordedBlob ? (
                                <button
                                    onClick={handleStartRecording}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all"
                                >
                                    <div className="w-3 h-3 rounded-full bg-white"></div>
                                    Start Recording
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        <div className="text-sm">
                                            <p className="font-medium text-green-700 dark:text-green-400">Recording Finished</p>
                                            <p className="text-green-600 dark:text-green-500/80">{formatTime(recordingTime)} • {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleDownloadRecording}
                                            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <Download className="w-4 h-4" /> Save MP3
                                        </button>
                                        <button
                                            onClick={handleStartRecording}
                                            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" /> Discard
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleGenerateFromRecording}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        <Mic className="w-4 h-4" />
                                        Use for AI Notes
                                    </button>
                                </div>
                            )
                        ) : (
                            <button
                                onClick={handleStopRecording}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 hover:shadow-red-500/40 transition-all animate-pulse"
                            >
                                <Square className="w-3 h-3 fill-current" />
                                Stop Recording
                            </button>
                        )}
                    </div>
                </div>

            </div>

            {/* Recent Quizzes List */}
            {recentQuizzes.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-indigo-500" />
                        Recent Quizzes
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {recentQuizzes.map((quiz) => (
                            <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setQuizConfig({
                                    courseId: quiz.courseId || undefined,
                                    noteId: quiz.noteId || undefined,
                                    title: quiz.title,
                                    existingQuiz: quiz
                                })}
                                className="group relative flex flex-col justify-between rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <div className="space-y-2 pointer-events-none">
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1" title={quiz.title}>
                                            {quiz.title}
                                        </h3>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className={`px-2 py-1 rounded-md font-medium ${quiz.isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                            {quiz.isCompleted ? `Score: ${quiz.score}/${quiz.totalQuestions}` : `In Progress: ${quiz.currentIndex}/${quiz.totalQuestions}`}
                                        </span>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                            {new Date(quiz.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between pointer-events-none">
                                    <button className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 pointer-events-auto" onClick={(e) => {
                                        e.stopPropagation();
                                        setQuizConfig({
                                            courseId: quiz.courseId || undefined,
                                            noteId: quiz.noteId || undefined,
                                            title: quiz.title,
                                            existingQuiz: quiz
                                        });
                                    }}>
                                        {quiz.isCompleted ? "View Results" : "Continue Quiz"}
                                    </button>
                                    <button
                                        onClick={(e) => deleteQuiz(e, quiz.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors pointer-events-auto"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notes List */}
            <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Your Notes
                </h2>

                <div id="step-notes-list" className="space-y-6">
                {Object.entries(notesByCourse).length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                            <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No notes generated yet.</p>
                    </div>
                ) : (
                    Object.entries(notesByCourse).map(([courseName, courseNotes]) => (
                        <div key={courseName} className="space-y-3">
                            <div className="flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                        {courseName}
                                    </span>
                                    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800 min-w-[20px]"></span>
                                </div>
                                <button
                                    onClick={() => setQuizConfig({
                                        courseId: courseNotes[0]?.courseId || 0,
                                        title: courseName
                                    })}
                                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                    <BrainCircuit className="w-3.5 h-3.5" />
                                    Quiz Me!
                                </button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {courseNotes.map((note) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                                        className="group relative flex flex-col justify-between rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12] p-5 shadow-sm hover:shadow-md transition-shadow h-64 overflow-hidden cursor-pointer"
                                    >
                                        <div className="space-y-2 pointer-events-none">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1" title={note.title}>
                                                    {note.title}
                                                </h3>
                                                {note.course?.code && (
                                                    <span className="shrink-0 inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                                                        {note.course.code}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                                {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <div className="prose prose-xs dark:prose-invert line-clamp-4 text-xs text-gray-600 dark:text-gray-300">
                                                <ReactMarkdown>{note.content}</ReactMarkdown>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                            <button
                                                className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/notes/${note.id}`); }}
                                            >
                                                View Full Note
                                            </button>
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                {/* Change Course button */}
                                                <div className="relative">
                                                    <button
                                                        title="Move to another course"
                                                        className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
                                                        onClick={(e) => { e.stopPropagation(); setReassignNotePopup(prev => prev === note.id ? null : note.id); }}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                        Move
                                                    </button>
                                                    {reassignNotePopup === note.id && (
                                                        <div
                                                            className="absolute bottom-full right-0 mb-2 w-52 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <div className="px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-zinc-800">Move to course</div>
                                                            <button
                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-gray-400 italic"
                                                                onClick={() => void updateNoteCourse(note.id, null)}
                                                            >
                                                                No Course
                                                            </button>
                                                            {courses.map(c => (
                                                                <button
                                                                    key={c.id}
                                                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${note.courseId === c.id ? 'text-indigo-500 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}
                                                                    onClick={() => void updateNoteCourse(note.id, c.id)}
                                                                >
                                                                    {c.code} – {c.name.split('-')[0].trim()}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => deleteNote(e, note.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>

                                ))}
                            </div>
                        </div>
                    ))
                )}
                </div>
            </div>

            {/* Quiz Modal */}
            <QuizModal
                isOpen={!!quizConfig}
                onClose={() => { setQuizConfig(null); refresh(); }}
                courseId={quizConfig?.courseId}
                noteId={quizConfig?.noteId}
                title={quizConfig?.title || ""}
                existingQuiz={quizConfig?.existingQuiz}
            />

            {/* Note Preview Modal for Walkthrough */}
            {selectedNote && typeof document !== "undefined" && createPortal(
                <div 
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => {
                        setSelectedNote(null);
                        onDemoClosed?.();
                    }}
                >
                    <motion.div 
                        id="step-note-modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full max-w-2xl max-h-[80vh] bg-gray-50 dark:bg-[#0F0F12] rounded-3xl border border-gray-200 dark:border-[#1F1F23] shadow-2xl flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                                    <FileText className="w-5 h-5 text-indigo-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                                    {selectedNote.title}
                                </h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedNote(null);
                                    onDemoClosed?.();
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 prose prose-xs dark:prose-invert">
                            <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-[#1A1A1E] border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                Sample AI Note
                            </span>
                            <button 
                                onClick={() => router.push(`/dashboard/notes/${selectedNote.id}`)}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                            >
                                Open Editor
                            </button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}
