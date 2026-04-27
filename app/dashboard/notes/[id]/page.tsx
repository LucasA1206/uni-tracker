"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Loader2, ArrowLeft, Calendar, BookOpen, Clock, FileText, Share2, Printer, MoreVertical, Edit2, Trash2, BrainCircuit, Save, X, Plus, Paperclip, File as FileIcon } from "lucide-react";
import Link from "next/link";
import QuizModal from "@/components/quiz/QuizModal";
import CustomDocViewer from "@/components/DocViewer";

interface Course {
    id: number;
    name: string;
    code: string;
    term?: string;
    year?: number;
}

function getCourseNameParts(rawName: string): string[] {
    return rawName.split("-").map(p => p.trim()).filter(Boolean);
}

function getCourseSession(course: Course): string {
    const parts = getCourseNameParts(course.name || "");
    if (parts.length >= 2) return parts[1];
    if (course.term && course.year) return `${course.term} ${course.year}`;
    return "Other";
}

/** Extracts just the 5-digit numeric course code from the full code string. */
function getCourseCode(course: { code: string }): string {
    const match = course.code.match(/\d{5}/);
    return match ? match[0] : course.code.slice(0, 5);
}

function getCourseDisplayName(course: Course): string {
    const name = course.name?.trim() || "";
    if (!name) return getCourseCode(course);
    const parts = getCourseNameParts(name);
    const firstSegment = parts[0] || name;
    const codeEscaped = course.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const firstWithoutCode = firstSegment.replace(new RegExp(`^${codeEscaped}\\s*`, 'i'), '').trim();
    if (firstWithoutCode) return firstWithoutCode;
    if (firstSegment) return firstSegment;
    return name.replace(/\s*-\s*(Autumn|Spring|Summer|Winter)\s+\d{4}\s*$/i, '').trim();
}

function getCourseOptionLabel(course: Course): string {
    const displayName = getCourseDisplayName(course).trim();
    const code = getCourseCode(course);
    if (!displayName || displayName.toLowerCase() === code.toLowerCase()) return code;
    return `${displayName} (${code})`;
}

function sortSessions(a: string, b: string): number {
    const parseSession = (label: string) => {
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

interface NoteAttachment {
    id: number;
    name: string;
    url: string;
    type: string;
    size: number;
}

interface Note {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    courseId?: number | null;
    course?: { code?: string; name?: string } | null;
    attachments?: NoteAttachment[];
}

export default function NoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isQuizOpen, setIsQuizOpen] = useState(false);

    // Courses (for reassigning)
    const [courses, setCourses] = useState<Course[]>([]);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editCourseId, setEditCourseId] = useState<string>("");
    const [editCreatedAt, setEditCreatedAt] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Attachments State
    const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to refresh note data
    const fetchNote = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/uni/notes?id=${params.id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Note not found");
                throw new Error("Failed to load note");
            }
            const data = await res.json();
            const foundNote = data.notes.find((n: Note) => n.id === Number(params.id));

            if (foundNote) {
                setNote(foundNote);
                setEditTitle(foundNote.title);
                setEditContent(foundNote.content);
                setEditCreatedAt(foundNote.createdAt);
                setEditCourseId(foundNote.courseId ? String(foundNote.courseId) : "");
                fetchAttachments();
            } else {
                setError("Note not found.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    const fetchAttachments = useCallback(async () => {
        try {
            const res = await fetch(`/api/uni/notes/${params.id}/attachments`);
            if (res.ok) {
                const data = await res.json();
                setAttachments(data.attachments || []);
            }
        } catch (error) {
            console.error("Failed to load attachments", error);
        }
    }, [params.id]);

    useEffect(() => {
        if (params.id) {
            fetchNote();
        }
    }, [fetchNote, params.id]);

    useEffect(() => {
        fetch("/api/uni/courses")
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.courses) setCourses(data.courses); })
            .catch(() => {});
    }, []);

    const coursesBySession = useMemo(() => {
        const grouped: Record<string, Course[]> = {};
        courses.forEach(c => {
            const session = getCourseSession(c);
            if (!grouped[session]) grouped[session] = [];
            grouped[session].push(c);
        });
        const sortedSessions = Object.keys(grouped).sort(sortSessions);
        return sortedSessions.map(session => ({
            session,
            courses: grouped[session].sort((a, b) => a.code.localeCompare(b.code)),
        }));
    }, [courses]);

    const handleSave = async () => {
        if (!note) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/uni/notes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: note.id,
                    title: editTitle,
                    content: editContent,
                    courseId: editCourseId ? Number(editCourseId) : null,
                    createdAt: editCreatedAt,
                }),
            });

            if (!res.ok) throw new Error("Failed to save");

            const data = await res.json();
            setNote(data.note);
            setIsEditing(false);
            fetchNote(); // Refresh to be sure
        } catch (err) {
            alert("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !note) return;

        setIsUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`/api/uni/notes/${note.id}/attachments`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const newAttachment = await res.json();
            setAttachments([...attachments, newAttachment.attachment]);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        if (!note) return;
        if (!confirm("Are you sure you want to delete this attachment?")) return;

        try {
            const res = await fetch(`/api/uni/notes/${note.id}/attachments/${attachmentId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Delete failed");

            setAttachments(attachments.filter(a => a.id !== attachmentId));
        } catch (error) {
            console.error("Error deleting attachment:", error);
            alert("Failed to delete attachment");
        }
    };

    // Prepare docs for viewer
    const docsForViewer = attachments.map(att => ({
        uri: att.url, // This should be a public URL
        fileName: att.name,
        fileType: att.type,
    }));

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
        <div className="min-h-screen bg-gray-50 dark:bg-[#0E1020]">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-[#1F1F23] bg-gray-50/80 dark:bg-[#0E1020]/80 backdrop-blur-md">
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
                            {isEditing ? (
                                <input
                                    type="datetime-local"
                                    className="bg-transparent border-b border-gray-300 dark:border-gray-700 outline-none text-gray-900 dark:text-gray-100"
                                    value={editCreatedAt ? new Date(new Date(editCreatedAt).getTime() - new Date(editCreatedAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                                    onChange={(e) => setEditCreatedAt(new Date(e.target.value).toISOString())}
                                />
                            ) : (
                                new Date(note.createdAt).toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-500"
                                >
                                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditTitle(note.title);
                                        setEditContent(note.content);
                                        setEditCreatedAt(note.createdAt);
                                        setEditCourseId(note.courseId ? String(note.courseId) : "");
                                    }}
                                    className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Note
                            </button>
                        )}

                        <div className="h-4 w-px bg-gray-200 dark:bg-[#1F1F23] mx-1" />

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
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* File Attachment & Viewer Section - At Top as requested */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-indigo-500" />
                            Attachments ({attachments.length})
                        </h2>
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1F1F23] transition-colors"
                            >
                                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Upload Document
                            </button>
                        </div>
                    </div>

                    {attachments.length > 0 && (
                        <div className="space-y-4">
                            {/* Document Viewer */}
                            <CustomDocViewer docs={docsForViewer} />

                            {/* File List */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {attachments.map(att => (
                                    <div
                                        key={att.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121214] hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors group"
                                    >
                                        <a
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 flex-1 min-w-0" // min-w-0 for truncation
                                        >
                                            <div className="p-2 rounded bg-gray-50 dark:bg-gray-800 text-indigo-500 shadow-sm group-hover:scale-105 transition-transform">
                                                <FileIcon className="w-4 h-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate" title={att.name}>{att.name}</p>
                                                <p className="text-[10px] text-gray-500 uppercase">{att.type.split('/').pop() || 'File'}</p>
                                            </div>
                                        </a>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleDeleteAttachment(att.id);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Attachment"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-gray-100 dark:border-[#1F1F23]" />

                {/* Note Header & Content */}
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1 w-full">
                            {note.course?.code && (() => {
                                const courseCode = getCourseCode(note.course as { code: string });
                                const rawName = note.course?.name || "";
                                const cleanName = rawName
                                    .replace(/\s*-\s*(Autumn|Spring|Summer|Winter)\s+\d{4}\s*$/i, "")
                                    .replace(new RegExp(`^${note.course.code}\\s*[-–]?\\s*`, "i"), "")
                                    .trim();
                                const label = cleanName ? `${courseCode} — ${cleanName}` : courseCode;
                                return (
                                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-500/20 mb-2">
                                        {label}
                                    </span>
                                );
                            })()}

                            {isEditing ? (
                                <div className="space-y-3 w-full">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full text-3xl font-bold tracking-tight text-gray-900 dark:text-white bg-transparent border-b-2 border-indigo-500 focus:outline-none pb-2"
                                        placeholder="Note Title"
                                    />
                                    <div className="flex items-center gap-2 pt-1">
                                        <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <select
                                            value={editCourseId}
                                            onChange={(e) => setEditCourseId(e.target.value)}
                                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F12] px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                        >
                                            <option value="">No course (unassigned)</option>
                                            {coursesBySession.map((group) => (
                                                <optgroup key={group.session} label={group.session}>
                                                    {group.courses.map((c) => (
                                                        <option key={c.id} value={c.id}>{getCourseOptionLabel(c)}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                                    {note.title}
                                </h1>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 border-b border-gray-100 dark:border-[#1F1F23] pb-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Generated from Audio</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>Read time: {Math.ceil((note.content?.length || 0) / 1000)} min</span>
                        </div>
                        <button
                            onClick={() => setIsQuizOpen(true)}
                            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <BrainCircuit className="h-4 w-4" />
                            Quiz Me!
                        </button>
                    </div>
                </div>

                {/* Note Body (Markdown or Textarea) */}
                {isEditing ? (
                    <div className="relative">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full min-h-[500px] p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0F0F12] text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
                            placeholder="Type your markdown notes here..."
                        />
                        <div className="absolute right-2 bottom-2 text-xs text-gray-400 pointer-events-none">
                            Markdown Supported
                        </div>
                    </div>
                ) : (
                    <article className="prose prose-lg dark:prose-invert max-w-none 
                        prose-headings:font-bold prose-headings:tracking-tight 
                        prose-h1:text-4xl prose-h1:text-gray-900 dark:prose-h1:text-white prose-h1:mb-8 prose-h1:border-b prose-h1:pb-4 prose-h1:border-gray-200 dark:prose-h1:border-gray-800
                        prose-h2:text-2xl prose-h2:text-indigo-600 dark:prose-h2:text-indigo-400 prose-h2:mt-12 prose-h2:mb-6
                        prose-h3:text-xl prose-h3:text-gray-800 dark:prose-h3:text-gray-200 prose-h3:mt-8
                        prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                        prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                        prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-[#121214] prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:italic
                        prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-[#1F1F23] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-[#1E1E1E] dark:prose-pre:bg-[#121214] prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:shadow-lg prose-pre:border prose-pre:border-gray-800 dark:prose-pre:border-[#1F1F23] prose-pre:p-4
                        prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                        prose-ul:marker:text-indigo-500
                        prose-ol:marker:text-indigo-500
                        prose-th:bg-gray-100 dark:prose-th:bg-[#1F1F23] prose-th:p-4 prose-th:text-left
                        prose-td:p-4 prose-td:border-b prose-td:border-gray-200 dark:prose-td:border-gray-800
                    ">
                        <ReactMarkdown
                            components={{
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-8 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                                        <table className="w-full text-sm text-left" {...props} />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => (
                                    <thead className="bg-gray-50 dark:bg-[#1F1F23] uppercase text-xs font-semibold text-gray-700 dark:text-gray-300" {...props} />
                                ),
                                tbody: ({ node, ...props }) => (
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800" {...props} />
                                ),
                                tr: ({ node, ...props }) => (
                                    <tr className="bg-gray-50 dark:bg-[#0E1020] hover:bg-gray-100 dark:hover:bg-[#1F1F23]/50 transition-colors" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                    <th className="px-6 py-3 whitespace-nowrap" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                    <td className="px-6 py-4" {...props} />
                                ),
                            }}
                        >
                            {note.content}
                        </ReactMarkdown>
                    </article>
                )}
            </main>

            <QuizModal
                isOpen={isQuizOpen}
                onClose={() => setIsQuizOpen(false)}
                noteId={note.id}
                title={note.title}
            />
        </div>
    );
}
