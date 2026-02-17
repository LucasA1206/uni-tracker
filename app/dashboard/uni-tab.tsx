"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import GradeCharts, { AssignmentForCharts } from "@/components/GradeCharts";
import MarkdownEditor from "@/components/MarkdownEditor";

interface Course {
  id: number;
  name: string;
  code: string;
  term: string;
  year: number;
}

interface Assignment {
  id: number;
  title: string;
  dueDate: string;
  course: { id: number; code: string };
  grade: number | null;
  weight: number;
  maxGrade: number;
  status: string;
}

function getSessionFromCourse(course: Course): string {
  if (course.term && course.year) {
    return `${course.term} ${course.year}`;
  }
  // Fallback for old data without term/year
  const text = `${course.name} ${course.code}`;
  const match = text.match(/(Autumn|Spring)\s+\d{4}/i);
  if (!match) return "Unknown";
  const raw = match[0];
  const [termRaw, year] = raw.split(/\s+/);
  const term = termRaw[0].toUpperCase() + termRaw.slice(1).toLowerCase();
  return `${term} ${year}`;
}

interface Note {
  id: number;
  title: string;
  createdAt: string;
  content: string;
  course?: { code?: string };
}

const ASSIGNMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
] as const;

export default function UniTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newCourse, setNewCourse] = useState({ name: "", code: "", term: "Autumn", year: new Date().getFullYear().toString() });
  const [newAssignment, setNewAssignment] = useState({
    courseId: "",
    title: "",
    dueDate: "",
    maxGrade: "",
    grade: "",
    status: "pending",
    weightPercent: "",
    followupPeople: [] as string[], // or whatever type you use
  });
  const [newNote, setNewNote] = useState({ title: "", content: "", courseId: "" });
  const [hiddenCourses, setHiddenCourses] = useState<number[]>([]);
  const [hiddenSemesters, setHiddenSemesters] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("active_hidden_semesters");
    if (stored) {
      try {
        setHiddenSemesters(JSON.parse(stored));
      } catch { }
    }
  }, []);

  const toggleSemesterHidden = (session: string) => {
    setHiddenSemesters(prev => {
      const next = prev.includes(session)
        ? prev.filter(s => s !== session)
        : [...prev, session];
      window.localStorage.setItem("active_hidden_semesters", JSON.stringify(next));
      return next;
    });
  };
  const [hiddenForCharts, setHiddenForCharts] = useState<number[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>("all");

  const refresh = useCallback(async () => {
    try {
      const [coursesRes, assignmentsRes, notesRes] = await Promise.all([
        fetch("/api/uni/courses"),
        fetch("/api/uni/assignments"),
        fetch("/api/uni/notes"),
      ]);

      const coursesData = coursesRes.ok
        ? await coursesRes.json().catch(() => ({ courses: [] }))
        : { courses: [] };
      const assignmentsData = assignmentsRes.ok
        ? await assignmentsRes.json().catch(() => ({ assignments: [] }))
        : { assignments: [] };
      const notesData = notesRes.ok
        ? await notesRes.json().catch(() => ({ notes: [] }))
        : { notes: [] };

      setCourses(coursesData.courses ?? []);
      setAssignments(assignmentsData.assignments ?? []);
      setNotes(notesData.notes ?? []);
    } catch (err) {
      console.error("Failed to refresh Uni data", err);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newCourse.name || !newCourse.code) return;
    await fetch("/api/uni/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newCourse,
        year: parseInt(newCourse.year) || 2026
      }),
    });
    setNewCourse({ name: "", code: "", term: "Autumn", year: new Date().getFullYear().toString() });
    void refresh();
  }

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!newAssignment.courseId || !newAssignment.title || !newAssignment.dueDate) return;

    const weight = newAssignment.weightPercent
      ? Number(newAssignment.weightPercent) / 100
      : 0;

    await fetch("/api/uni/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: Number(newAssignment.courseId),
        title: newAssignment.title,
        dueDate: newAssignment.dueDate,
        weight,
        maxGrade: newAssignment.maxGrade ? Number(newAssignment.maxGrade) : 100,
        grade: newAssignment.grade ? Number(newAssignment.grade) : undefined,
        status: newAssignment.status,
      }),
    });

    setNewAssignment({
      courseId: "",
      title: "",
      dueDate: "",
      weightPercent: "",
      maxGrade: "",
      grade: "",
      status: "pending",
      followupPeople: [],
    });

    void refresh();
  }

  async function deleteCourse(id: number) {
    await fetch(`/api/uni/courses?id=${id}`, { method: "DELETE" });
    void refresh();
  }

  async function deleteAssignment(id: number) {
    await fetch(`/api/uni/assignments?id=${id}`, { method: "DELETE" });
    void refresh();
  }

  async function updateAssignmentStatus(id: number, status: string) {
    await fetch("/api/uni/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void refresh();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.title || !newNote.content) return;

    await fetch("/api/uni/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newNote.title,
        content: newNote.content,
        courseId: newNote.courseId ? Number(newNote.courseId) : undefined,
      }),
    });

    setNewNote({ title: "", content: "", courseId: "" });
    void refresh();
  }

  async function deleteNote(id: number) {
    await fetch(`/api/uni/notes?id=${id}`, { method: "DELETE" });
    void refresh();
  }

  function toggleCourseHidden(id: number) {
    setHiddenCourses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function getSessionValue(course: Course): number {
    const text = `${course.name} ${course.code}`;
    const match = text.match(/(Autumn|Spring)\s+(\d{4})/i);
    if (!match) return -1; // Unknown sessions at the bottom

    const term = match[1].toLowerCase();
    const year = parseInt(match[2], 10);

    // Spring = 2, Autumn = 1
    const termVal = term === "spring" ? 2 : 1;
    return year * 10 + termVal;
  }

  const assignmentsByCourse = useMemo(() => {
    const sortedCourses = [...courses].sort((a, b) => {
      const valA = getSessionValue(a);
      const valB = getSessionValue(b);
      return valB - valA; // Descending
    });

    return sortedCourses.map((course) => {
      const courseAssignments = assignments.filter((a) => a.course.id === course.id);
      return {
        course,
        byStatus: {
          pending: courseAssignments.filter((a) => a.status === "pending"),
          in_progress: courseAssignments.filter((a) => a.status === "in_progress"),
          completed: courseAssignments.filter((a) => a.status === "completed"),
        },
      };
    });
  }, [courses, assignments]);

  const notesByCourse = useMemo<Record<string, Note[]>>(() => {
    const result: Record<string, Note[]> = {};
    for (const note of notes as any[]) {
      const key = note.course?.code ?? "Unassigned";
      if (!result[key]) result[key] = [];
      result[key].push(note);
    }
    return result;
  }, [notes]);

  const sessionOptions = useMemo(() => {
    return Array.from(
      new Set(
        courses
          .map((c) => getSessionFromCourse(c))
          .filter((s) => s !== "Unknown"),
      ),
    ).sort();
  }, [courses]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <section className="md:col-span-1 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Courses</h2>
        <form onSubmit={addCourse} className="space-y-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6">
          <input
            className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm"
            placeholder="Course name"
            value={newCourse.name}
            onChange={(e) => setNewCourse((c) => ({ ...c, name: e.target.value }))}
          />
          <input
            className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm"
            placeholder="Course code"
            value={newCourse.code}
            onChange={(e) => setNewCourse((c) => ({ ...c, code: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm"
              value={newCourse.term}
              onChange={(e) => setNewCourse((c) => ({ ...c, term: e.target.value }))}
            >
              <option value="Autumn">Autumn</option>
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
              <option value="Winter">Winter</option>
            </select>
            <input
              type="number"
              className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm"
              placeholder="Year"
              value={newCourse.year}
              onChange={(e) => setNewCourse((c) => ({ ...c, year: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-indigo-500 py-1.5 text-xs font-semibold hover:bg-indigo-400 text-white"
          >
            Add course
          </button>
        </form>
        <ul className="space-y-1 text-sm">
          {courses.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-3 py-2">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{c.code}</div>
              </div>
              <button
                type="button"
                className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-2 py-0.5 text-[10px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => void deleteCourse(c.id)}
              >
                Delete
              </button>
            </li>
          ))}
          {courses.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">No courses yet. Add your first course above.</p>
          )}
        </ul>

        {courses.length > 0 && (
          <div className="mt-3 space-y-1 text-xs">
            <div className="font-medium text-gray-900 dark:text-white">Hide courses from charts</div>
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => {
                const hidden = hiddenForCharts.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`rounded-full border px-2 py-0.5 ${hidden
                      ? "border-gray-200 dark:border-[#1F1F23] text-gray-500 dark:text-gray-400 bg-white dark:bg-[#0F0F12]"
                      : "border-indigo-400 text-indigo-100 bg-indigo-500/20"
                      }`}
                    onClick={() =>
                      setHiddenForCharts((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((id) => id !== c.id)
                          : [...prev, c.id],
                      )
                    }
                  >
                    {hidden ? `Show ${c.code}` : `Hide ${c.code}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="md:col-span-2 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assignments</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This list is fetched from your local database and Canvas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetch("/api/integrations/canvas/sync", { method: "POST" }).then(() => refresh())}
              className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-3 py-1 text-[11px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Sync from Canvas
            </button>
          </div>

          <form onSubmit={addAssignment} className="grid gap-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 md:grid-cols-5 text-xs">
            <select
              className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 md:col-span-2"
              value={newAssignment.courseId}
              onChange={(e) =>
                setNewAssignment((a) => ({
                  ...a,
                  courseId: e.target.value,
                }))
              }
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 md:col-span-3"
              placeholder="Assignment title"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment((a) => ({ ...a, title: e.target.value }))}
            />
            <input
              type="date"
              className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1"
              value={newAssignment.dueDate}
              onChange={(e) => setNewAssignment((a) => ({ ...a, dueDate: e.target.value }))}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1"
              placeholder="Weight %"
              value={newAssignment.weightPercent}
              onChange={(e) => setNewAssignment((a) => ({ ...a, weightPercent: e.target.value }))}
            />
            <input
              type="number"
              min="0"
              step="1"
              className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1"
              placeholder="Max grade"
              value={newAssignment.maxGrade}
              onChange={(e) => setNewAssignment((a) => ({ ...a, maxGrade: e.target.value }))}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1"
              placeholder="Current grade (optional)"
              value={newAssignment.grade}
              onChange={(e) => setNewAssignment((a) => ({ ...a, grade: e.target.value }))}
            />
            <select
              className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1"
              value={newAssignment.status}
              onChange={(e) => setNewAssignment((a) => ({ ...a, status: e.target.value }))}
            >
              {ASSIGNMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="md:col-span-5 rounded-md bg-indigo-500 py-1.5 text-xs font-semibold hover:bg-indigo-400 text-white"
            >
              Add assignment
            </button>
          </form>

          <div className="space-y-3 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 max-h-[50rem] overflow-auto">
            {assignments.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">No assignments yet.</p>
            )}
            <div className="space-y-4 text-xs">
              <div className="space-y-6 text-xs">
                {Object.entries(
                  assignmentsByCourse.reduce((acc, { course, byStatus }) => {
                    const session = getSessionFromCourse(course);
                    if (!acc[session]) acc[session] = [];
                    acc[session].push({ course, byStatus });
                    return acc;
                  }, {} as Record<string, typeof assignmentsByCourse>)
                )
                  .sort(([sessionA], [sessionB]) => {
                    // Parse session string "Term Year" to sort desc
                    const [termA, yearA] = sessionA.split(' ');
                    const [termB, yearB] = sessionB.split(' ');
                    if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
                    const termOrder: Record<string, number> = { Autumn: 1, Spring: 2, Summer: 3, Winter: 0 };
                    return (termOrder[termB] || 0) - (termOrder[termA] || 0);
                  })
                  .map(([session, items]) => {
                    const isHidden = hiddenSemesters.includes(session);
                    return (
                      <div key={session} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1F1F23] pb-2">
                          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{session}</h3>
                          <button
                            onClick={() => toggleSemesterHidden(session)}
                            className="text-[10px] text-gray-500 hover:text-indigo-500"
                          >
                            {isHidden ? "Show" : "Hide"}
                          </button>
                        </div>

                        {!isHidden && items.map(({ course, byStatus }) => {
                          const total =
                            byStatus.pending.length + byStatus.in_progress.length + byStatus.completed.length;
                          if (total === 0) return null;
                          const hidden = hiddenCourses.includes(course.id);
                          return (
                            <div key={course.id} className="space-y-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold text-gray-900 dark:text-white">{course.name}</div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{course.code}</div>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-2 py-0.5 text-[10px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                                  onClick={() => toggleCourseHidden(course.id)}
                                >
                                  {hidden ? "Show assignments" : "Hide assignments"}
                                </button>
                              </div>
                              {!hidden && (
                                <div className="mt-2 grid gap-3 md:grid-cols-3">
                                  {(["pending", "in_progress", "completed"] as const).map((statusKey) => {
                                    const list = byStatus[statusKey];
                                    const bgClass =
                                      statusKey === "pending"
                                        ? "bg-yellow-500/10"
                                        : statusKey === "in_progress"
                                          ? "bg-blue-500/10"
                                          : "bg-green-500/10";
                                    return (
                                      <div
                                        key={statusKey}
                                        className={`space-y-2 rounded-xl p-2 ${bgClass}`}
                                      >
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
                                          {statusKey === "pending"
                                            ? "To-Do"
                                            : statusKey === "in_progress"
                                              ? "In Progress"
                                              : "Done"}
                                        </div>
                                        {list.length === 0 && (
                                          <p className="text-[11px] text-gray-500 dark:text-gray-400">No items.</p>
                                        )}
                                        {list.map((a) => (
                                          <div
                                            key={a.id}
                                            className="flex items-start justify-between gap-2 border-b border-gray-200 dark:border-[#1F1F23] pb-2 last:border-0 last:pb-0"
                                          >
                                            <div>
                                              <div className="font-medium">{a.title}</div>
                                              <div className="text-gray-500 dark:text-gray-400">
                                                {(() => {
                                                  const d = new Date(a.dueDate);
                                                  const hasDue =
                                                    !Number.isNaN(d.getTime()) && d.getFullYear() !== 1970;
                                                  const dueLabel = hasDue ? d.toLocaleDateString() : "No due date";
                                                  return (
                                                    <>Due {dueLabel} · weight {(a.weight * 100).toFixed(0)}%</>
                                                  );
                                                })()}
                                              </div>
                                              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                                Grade: {a.grade != null ? `${a.grade}` : "—"} / {a.maxGrade}
                                              </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                              <select
                                                className="rounded-full border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-2 py-0.5 text-[10px] text-gray-900 dark:text-white"
                                                value={a.status}
                                                onChange={(e) => void updateAssignmentStatus(a.id, e.target.value)}
                                              >
                                                {ASSIGNMENT_STATUSES.map((s) => (
                                                  <option key={s.value} value={s.value}>
                                                    {s.label}
                                                  </option>
                                                ))}
                                              </select>
                                              <button
                                                type="button"
                                                className="rounded-full border border-red-700 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-900/60"
                                                onClick={() => void deleteAssignment(a.id)}
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notes</h2>
            <form onSubmit={addNote} className="space-y-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 text-xs">
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 md:col-span-2"
                  placeholder="Note title"
                  value={newNote.title}
                  onChange={(e) => setNewNote((n) => ({ ...n, title: e.target.value }))}
                />
                <select
                  className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1"
                  value={newNote.courseId}
                  onChange={(e) => setNewNote((n) => ({ ...n, courseId: e.target.value }))}
                >
                  <option value="">No course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} – {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <MarkdownEditor
                value={newNote.content}
                onChange={(value) => setNewNote((n) => ({ ...n, content: value }))}
              />
              <button
                type="submit"
                className="rounded-md bg-indigo-500 px-3 py-1.5 text-[11px] font-semibold hover:bg-indigo-400 text-white"
              >
                Add note
              </button>
            </form>
            <div className="space-y-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 max-h-64 overflow-auto text-xs">
              {notes.length === 0 && <p className="text-gray-500 dark:text-gray-400">No notes yet.</p>}
              {Object.entries(notesByCourse).map(([code, courseNotes]) => (
                <div key={code} className="space-y-1 border-b border-gray-200 dark:border-[#1F1F23] pb-2 last:border-0 last:pb-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
                    {code === "Unassigned" ? "No course" : code}
                  </div>
                  {courseNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setSelectedNote(n)}
                    >
                      <span className="font-medium text-left truncate pr-2">{n.title}</span>
                      <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteNote(n.id);
                          }}
                          className="cursor-pointer rounded-full border border-red-700 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-900/60"
                        >
                          Delete
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {selectedNote && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="w-full max-w-xl rounded-xl bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] p-4 text-xs shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{selectedNote.title}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {selectedNote.course?.code && <span className="mr-2">{selectedNote.course.code}</span>}
                        {new Date(selectedNote.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-2 py-0.5 text-[10px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setSelectedNote(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-80 overflow-auto whitespace-pre-wrap text-gray-900 dark:text-white">
                    {selectedNote.content}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Grade visualisations</h2>
              {sessionOptions.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500 dark:text-gray-400">Session:</span>
                  <select
                    className="rounded-md border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-2 py-1"
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    {sessionOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <GradeCharts
              assignments={useMemo(() =>
                assignments
                  .filter((a) => !hiddenForCharts.includes(a.course.id))
                  .filter((a) => {
                    if (sessionFilter === "all") return true;
                    const course = courses.find((c) => c.id === a.course.id);
                    const session = course ? getSessionFromCourse(course) : "Unknown";
                    return session === sessionFilter;
                  })
                  .map<AssignmentForCharts>((a) => ({
                    courseCode: a.course.code,
                    weight: a.weight,
                    maxGrade: a.maxGrade,
                    grade: a.grade,
                    dueDate: a.dueDate,
                  })),
                [assignments, hiddenForCharts, sessionFilter, courses]
              )}
            />
          </div>
      </section>
    </div>
  );
}
