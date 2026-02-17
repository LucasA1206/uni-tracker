"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Loader2, Upload, FileAudio, CheckCircle2, FileText, Trash2, Mic } from "lucide-react";

interface Course {
    id: number;
    name: string;
    code: string;
}

interface Note {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    course?: { code?: string };
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

export default function NotesTab() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);

    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState("");
    const [dragActive, setDragActive] = useState(false);


    const router = useRouter();
    // const [selectedNote, setSelectedNote] = useState<Note | null>(null); // Removed modal state

    const refresh = useCallback(async () => {
        try {
            const [coursesRes, notesRes] = await Promise.all([
                fetch("/api/uni/courses"),
                fetch("/api/uni/notes"),
            ]);

            if (coursesRes.ok) {
                const data = await coursesRes.json();
                setCourses(data.courses || []);
            }
            if (notesRes.ok) {
                const data = await notesRes.json();
                setNotes(data.notes || []);
            }
        } catch (err) {
            console.error("Failed to load notes tab data", err);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

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
            if (file.type.includes("audio") || file.type.includes("video") || file.name.endsWith(".mp3") || file.name.endsWith(".mp4")) {
                setUploadFile(file);
            } else {
                alert("Please upload an audio or video file (.mp3, .mp4)");
            }
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
        }
    };

    const handleGenerate = async () => {
        if (!uploadFile) return;

        setIsProcessing(true);

        // Simulate AI processing stages
        const stages = [
            "Uploading file...",
            "Transcribing audio...",
            "Analyzing content structure...",
            "Generating summary...",
            "Formatting notes...",
        ];

        for (const stage of stages) {
            setProcessingStage(stage);
            await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
        }

        // "Save" the note
        try {
            const formData = new FormData();
            formData.append("file", uploadFile);
            if (selectedCourseId) {
                formData.append("courseId", selectedCourseId);
            }

            const res = await fetch("/api/ai/generate-notes", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate notes");
            }

            if (data.note?.id) {
                router.push(`/dashboard/notes/${data.note.id}`);
            } else {
                await refresh();
            }

            setUploadFile(null);
            setSelectedCourseId("");
        } catch (err) {
            console.error("Failed to save generated note", err);
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

    // Group notes by course
    const notesByCourse = useMemo(() => {
        const grouped: Record<string, Note[]> = {};
        notes.forEach(note => {
            const courseCode = note.course?.code || "Uncategorized";
            if (!grouped[courseCode]) grouped[courseCode] = [];
            grouped[courseCode].push(note);
        });
        return grouped;
    }, [notes]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent w-fit">
                    AI Lecture Notes
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload your lecture recordings (.mp4 or .mp3) and let AI generate detailed, structured notes for you.
                </p>
            </div>

            {/* Upload Section */}
            <motion.div
                layout
                className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors duration-200 
          ${dragActive ? "border-indigo-500 bg-indigo-50/10" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F0F12]"}
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
                                <div className="relative bg-white dark:bg-[#1A1A1A] p-4 rounded-full shadow-xl">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                </div>
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
                                    Supports MP4, MP3 audio files (max 500MB)
                                </p>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-200 dark:border-gray-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-[#0F0F12] px-2 text-gray-500">Or</span>
                                </div>
                            </div>
                            <label className="cursor-pointer rounded-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-6 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                Browse Files
                                <input type="file" className="hidden" accept=".mp3,audio/*,video/mp4" onChange={handleFileChange} />
                            </label>
                        </>
                    ) : (
                        <div className="w-full max-w-md bg-gray-50 dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                                        <FileAudio className="w-6 h-6" />
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
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.code} - {course.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleGenerate}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        <Mic className="w-4 h-4" />
                                        Generate Detailed Notes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Notes List */}
            <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Your Notes
                </h2>

                {Object.entries(notesByCourse).length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                            <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No notes generated yet.</p>
                    </div>
                ) : (
                    Object.entries(notesByCourse).map(([courseCode, courseNotes]) => (
                        <div key={courseCode} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                    {courseCode}
                                </span>
                                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></span>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {courseNotes.map((note) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                                        className="group relative flex flex-col justify-between rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-5 shadow-sm hover:shadow-md transition-shadow h-64 overflow-hidden cursor-pointer"
                                    >
                                        <div className="space-y-2 pointer-events-none">
                                            <div className="flex items-start justify-between">
                                                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1" title={note.title}>
                                                    {note.title}
                                                </h3>
                                            </div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                                {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <div className="prose prose-xs dark:prose-invert line-clamp-4 text-xs text-gray-600 dark:text-gray-300">
                                                <ReactMarkdown>{note.content}</ReactMarkdown>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between pointer-events-none">
                                            <button className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 pointer-events-auto" onClick={() => router.push(`/dashboard/notes/${note.id}`)}>
                                                View Full Note
                                            </button>
                                            <button
                                                onClick={(e) => deleteNote(e, note.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors pointer-events-auto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>


        </div>
    );
}
