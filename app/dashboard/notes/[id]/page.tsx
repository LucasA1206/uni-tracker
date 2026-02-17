"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Loader2, ArrowLeft, Calendar, BookOpen, Clock, FileText, Share2, Printer, MoreVertical, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";

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
    course?: { code?: string; name?: string };
}

export default function NoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch the note data
    useEffect(() => {
        async function loadNote() {
            try {
                setLoading(true);
                // Note: You need an API route like /api/uni/notes/[id] to fetch a single note
                // For now, we simulate fetching from the list API and filtering locally if needed, 
                // OR assume the /api/uni/notes endpoint supports ?id=... query param which it does based on previous code.
                const res = await fetch(`/api/uni/notes?id=${params.id}`);
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Note not found");
                    throw new Error("Failed to load note");
                }
                const data = await res.json();
                // The API returns { notes: [...] } usually, but let's see if we can get a single one. 
                // If the API returns a list, find the one.
                // Based on previous code: `GET /api/uni/notes` returns all notes. 
                // We might need to filter.
                const foundNote = data.notes.find((n: Note) => n.id === Number(params.id));

                if (foundNote) {
                    setNote(foundNote);
                } else {
                    setError("Note not found.");
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (params.id) {
            loadNote();
        }
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this note? This cannot be undone.")) return;
        setIsDeleting(true);
        try {
            await fetch(`/api/uni/notes?id=${note?.id}`, { method: "DELETE" });
            router.push("/dashboard?tab=Notes");
        } catch (err) {
            alert("Failed to delete note");
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0E1020]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !note) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-[#0E1020] text-center">
                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
                    <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Note not found</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    The note you are looking for does not exist or has been deleted.
                </p>
                <Link
                    href="/dashboard?tab=Notes"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#0E1020]">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-[#1F1F23] bg-white/80 dark:bg-[#0E1020]/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard?tab=Notes"
                            className="group flex items-center gap-2 rounded-full py-1 pr-3 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            <div className="rounded-full p-1 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-[#1F1F23]">
                                <ArrowLeft className="h-4 w-4" />
                            </div>
                            Back to Notes
                        </Link>
                        <div className="h-4 w-px bg-gray-200 dark:bg-[#1F1F23]" />
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(note.createdAt).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#1F1F23] dark:hover:text-white">
                            <Share2 className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#1F1F23] dark:hover:text-white">
                            <Printer className="h-4 w-4" />
                        </button>
                        <div className="h-4 w-px bg-gray-200 dark:bg-[#1F1F23]" />
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 dark:hover:text-red-400"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Note Header */}
                <div className="mb-8 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            {note.course?.code && (
                                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-500/20">
                                    {note.course.code}
                                </span>
                            )}
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                                {note.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 border-b border-gray-100 dark:border-[#1F1F23] pb-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Generated from Audio</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>Read time: {Math.ceil(note.content.length / 1000)} min</span>
                        </div>
                    </div>
                </div>

                {/* Note Body (Markdown) */}
                <article className="prose prose-lg dark:prose-invert max-w-none 
            prose-headings:font-bold prose-headings:tracking-tight 
            prose-h1:text-gray-900 dark:prose-h1:text-white
            prose-h2:text-gray-800 dark:prose-h2:text-gray-100
            prose-p:text-gray-600 dark:prose-p:text-gray-300
            prose-a:text-indigo-600 dark:prose-a:text-indigo-400
            prose-blockquote:border-l-indigo-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-[#121214] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
            prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-gray-100 dark:prose-code:bg-[#1F1F23] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-gray-900 dark:prose-pre:bg-[#121214] prose-pre:border prose-pre:border-gray-800 dark:prose-pre:border-[#1F1F23]
            prose-img:rounded-xl prose-img:shadow-lg
        ">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                </article>
            </main>
        </div>
    );
}
