"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import GradeCharts, { AssignmentForCharts } from "@/components/GradeCharts";
import MarkdownEditor from "@/components/MarkdownEditor";
import AssignmentsCardOverview from "@/components/AssignmentsCardOverview";
import { createPortal } from "react-dom";
import { BorderBeam } from "@/components/magicui/border-beam";
import { BlurFade } from "@/components/magicui/blur-fade";
import { cn } from "@/lib/utils";

const COURSE_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500"
];

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
  canvasUrl?: string | null;
  description?: string | null;
}

function getSessionFromCourse(course: Course): string {
  if (course.name && course.name.includes("- ")) {
    const parts = course.name.split("- ");
    return parts[parts.length - 1].trim();
  }
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
  content: string;
  courseId: number | null;
  createdAt: string;
}

const ASSIGNMENT_STATUSES = [
  { value: "pending", label: "To-Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

interface UniTabProps {
  openAssignmentDemo?: boolean;
  onDemoClosed?: () => void;
  assignmentsTabOverride?: string;
}

export default function UniTab({ openAssignmentDemo, onDemoClosed, assignmentsTabOverride }: UniTabProps) {
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
    followupPeople: [] as string[],
  });
  const [newNote, setNewNote] = useState({ title: "", content: "", courseId: "" });
  const [hiddenCourses, setHiddenCourses] = useState<number[]>([]);
  const [hiddenSemesters, setHiddenSemesters] = useState<string[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [hiddenForCharts, setHiddenForCharts] = useState<number[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/uni/dashboard");
      const data = await res.json();
      if (res.ok) {
        setCourses(data.courses || []);
        setAssignments(data.assignments || []);
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Refresh failed", err);
    }
  }, []);

  useEffect(() => {
    refresh();
    const stored = window.localStorage.getItem("active_hidden_semesters");
    if (stored) {
      try { setHiddenSemesters(JSON.parse(stored)); } catch {}
    }
    const storedCharts = window.localStorage.getItem("uni_hidden_charts");
    if (storedCharts) {
      try { setHiddenForCharts(JSON.parse(storedCharts)); } catch {}
    }
  }, [refresh]);

  const displayCourses = useMemo(() => {
    if (openAssignmentDemo && courses.length === 0) {
      return [{ id: 999, name: "Intro to AI - Autumn 2026", code: "AI101", term: "Autumn", year: 2026 }];
    }
    return courses;
  }, [courses, openAssignmentDemo]);

  const displayAssignments = useMemo(() => {
    if (openAssignmentDemo && assignments.length === 0) {
      return [{
        id: 999,
        title: "Assignment 1: Neural Networks",
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        course: { id: 999, code: "AI101" },
        grade: 85,
        maxGrade: 100,
        weight: 0.2,
        status: "pending",
        description: "Build a simple neural network from scratch using Python and NumPy."
      }];
    }
    return assignments;
  }, [assignments, openAssignmentDemo]);

  useEffect(() => {
    if (openAssignmentDemo && displayAssignments.length > 0 && !selectedAssignment) {
      setSelectedAssignment(displayAssignments[0]);
    } else if (!openAssignmentDemo && selectedAssignment?.id === 999) {
      setSelectedAssignment(null);
    }
  }, [openAssignmentDemo, displayAssignments, selectedAssignment]);

  const displayAssignmentsForCharts = useMemo<AssignmentForCharts[]>(() => {
    const filtered = displayAssignments.filter(a => !hiddenForCharts.includes(a.course.id));
    if (openAssignmentDemo && filtered.length === 0) {
      return [{
        id: "mock1",
        title: "Ethics in AI",
        grade: 90,
        maxGrade: 100,
        weight: 0.2,
        courseCode: "AI101",
        session: "Autumn 2026",
        dueDate: new Date(Date.now() - 86400000 * 30).toISOString()
      }, {
        id: "mock2",
        title: "Machine Learning Quiz",
        grade: 80,
        maxGrade: 100,
        weight: 0.1,
        courseCode: "AI101",
        session: "Autumn 2026",
        dueDate: new Date(Date.now() - 86400000 * 60).toISOString()
      }];
    }
    return filtered.map(a => {
      const course = displayCourses.find(c => c.id === a.course.id);
      return {
        id: String(a.id),
        title: a.title,
        grade: a.grade ?? 0,
        maxGrade: a.maxGrade,
        weight: a.weight,
        courseCode: a.course.code,
        session: course ? getSessionFromCourse(course) : "Unknown",
        dueDate: a.dueDate
      };
    });
  }, [displayAssignments, displayCourses, hiddenForCharts, openAssignmentDemo]);

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.name || !newCourse.code) return;
    try {
      const res = await fetch("/api/uni/courses", {
        method: "POST",
        body: JSON.stringify({ ...newCourse, year: parseInt(newCourse.year, 10) })
      });
      if (res.ok) {
        setNewCourse({ name: "", code: "", term: "Autumn", year: new Date().getFullYear().toString() });
        refresh();
      }
    } catch (err) { console.error("Add course failed", err); }
  };

  const deleteCourse = async (id: number) => {
    if (!confirm("Are you sure? This will delete all course data.")) return;
    try {
      const res = await fetch(`/api/uni/courses/${id}`, { method: "DELETE" });
      if (res.ok) refresh();
    } catch (err) { console.error("Delete course failed", err); }
  };

  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.courseId || !newAssignment.title) return;
    try {
      const res = await fetch("/api/uni/assignments", {
        method: "POST",
        body: JSON.stringify({
          ...newAssignment,
          courseId: parseInt(newAssignment.courseId, 10).toString(),
          maxGrade: parseFloat(newAssignment.maxGrade) || 100,
          grade: newAssignment.grade ? parseFloat(newAssignment.grade) : null,
          weight: (parseFloat(newAssignment.weightPercent) || 0) / 100,
        })
      });
      if (res.ok) {
        setNewAssignment({ courseId: "", title: "", dueDate: "", maxGrade: "", grade: "", status: "pending", weightPercent: "", followupPeople: [] });
        refresh();
      }
    } catch (err) { console.error("Add assignment failed", err); }
  };

  const deleteAssignment = async (id: number) => {
    try {
      const res = await fetch(`/api/uni/assignments/${id}`, { method: "DELETE" });
      if (res.ok) refresh();
    } catch (err) { console.error("Delete assignment failed", err); }
  };

  const updateAssignmentStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/uni/assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      if (res.ok) refresh();
    } catch (err) { console.error("Update status failed", err); }
  };

  const toggleSemesterHidden = (session: string) => {
    setHiddenSemesters(prev => {
      const next = prev.includes(session) ? prev.filter(s => s !== session) : [...prev, session];
      window.localStorage.setItem("active_hidden_semesters", JSON.stringify(next));
      return next;
    });
  };

  const toggleCourseHidden = (id: number) => {
    setHiddenCourses(prev => (prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]));
  };

  const assignmentsByCourse = useMemo(() => {
    const grouped: Record<number, { byStatus: Record<string, Assignment[]> }> = {};
    displayAssignments.forEach((a) => {
      if (!grouped[a.course.id]) {
        grouped[a.course.id] = { byStatus: { pending: [], in_progress: [], completed: [] } };
      }
      if (grouped[a.course.id].byStatus[a.status]) {
        grouped[a.course.id].byStatus[a.status].push(a);
      }
    });

    return displayCourses.map((c) => ({
      course: c,
      byStatus: grouped[c.id]?.byStatus || { pending: [], in_progress: [], completed: [] },
    }));
  }, [displayCourses, displayAssignments]);

  const notesByCourse = useMemo(() => {
    const result: Record<string, Note[]> = { "General Notes": [] };
    for (const note of notes) {
      const course = displayCourses.find((c) => c.id === note.courseId);
      const key = course ? `${course.name.split("-")[0].trim()} (${course.code})` : "General Notes";
      if (!result[key]) result[key] = [];
      result[key].push(note);
    }
    return result;
  }, [notes, displayCourses]);

  const sessionOptions = useMemo(() => {
    return Array.from(new Set(displayCourses.map(c => getSessionFromCourse(c)).filter(s => s !== "Unknown"))).sort();
  }, [displayCourses]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Courses */}
        <section className="md:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Courses</h2>
          <BlurFade delay={0.1}>
            <form onSubmit={addCourse} className="relative space-y-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white/50 dark:bg-[#0F0F12]/50 backdrop-blur-sm p-6 overflow-hidden">
              <BorderBeam size={100} duration={12} delay={2} />
              <input
                className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Course name"
                value={newCourse.name}
                onChange={(e) => setNewCourse((c) => ({ ...c, name: e.target.value }))}
              />
              <input
                className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Course code"
                value={newCourse.code}
                onChange={(e) => setNewCourse((c) => ({ ...c, code: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm outline-hidden transition-all"
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
                  className="w-full rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-sm outline-hidden transition-all"
                  placeholder="Year"
                  value={newCourse.year}
                  onChange={(e) => setNewCourse((c) => ({ ...c, year: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-indigo-500 py-1.5 text-xs font-semibold hover:bg-indigo-400 text-white transition-colors"
              >
                Add course
              </button>
            </form>
          </BlurFade>

          <BlurFade delay={0.2}>
            <ul className="space-y-1 text-sm">
              {courses.map((c) => (
                <li key={c.id} className="relative overflow-hidden flex items-center justify-between rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-3 py-2">
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${COURSE_COLORS[c.id % COURSE_COLORS.length]}`} />
                  <div className="pl-2">
                    <div className="font-medium">{c.name.split("-")[0].trim()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.code}</div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-2 py-0.5 text-[10px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => void deleteCourse(c.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {courses.length === 0 && !openAssignmentDemo && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No courses yet. Add your first course above.</p>
              )}
            </ul>
          </BlurFade>
        </section>

        {/* Right Column: Assignments */}
        <section className="md:col-span-2 space-y-4">
          <BlurFade delay={0.15}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assignments Hub</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage tasks imported from Canvas or manually.</p>
                </div>
                <button
                  id="step-sync-button"
                  type="button"
                  disabled={syncLoading}
                  onClick={async () => {
                    setSyncLoading(true);
                    try {
                      await fetch("/api/integrations/canvas/sync", { method: "POST" });
                      await refresh();
                    } finally {
                      setSyncLoading(false);
                    }
                  }}
                  className="group relative flex items-center gap-2 rounded-full border border-gray-200 dark:border-[#1F1F23] px-3 py-1 text-[11px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium disabled:opacity-50"
                >
                  {syncLoading ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                  ) : (
                    <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                  )}
                  Sync Canvas
                </button>
              </div>

              <div id="step-assignment-overview" className="relative group overflow-hidden rounded-2xl">
                <AssignmentsCardOverview 
                  assignments={displayAssignments} 
                  courses={displayCourses} 
                  activeTabOverride={assignmentsTabOverride}
                />
                <BorderBeam size={200} duration={12} colorFrom="#6366f1" colorTo="#3b82f6" />
              </div>

              <form onSubmit={addAssignment} className="relative group grid gap-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white/50 dark:bg-[#0F0F12]/50 backdrop-blur-sm p-6 md:grid-cols-5 text-xs overflow-hidden">
                <BorderBeam size={100} duration={10} delay={5} colorFrom="#a855f7" colorTo="#6366f1" />
                <select
                  className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 md:col-span-2 outline-hidden"
                  value={newAssignment.courseId}
                  onChange={(e) => setNewAssignment((a) => ({ ...a, courseId: e.target.value }))}
                >
                  <option value="">Select course</option>
                  {displayCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.split("-")[0].trim()} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 md:col-span-3 outline-hidden"
                  placeholder="Task title"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment((a) => ({ ...a, title: e.target.value }))}
                />
                <input
                  type="date"
                  className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 md:col-span-2 outline-hidden"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment((a) => ({ ...a, dueDate: e.target.value }))}
                />
                <input
                  type="number"
                  className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 outline-hidden"
                  placeholder="Weight %"
                  value={newAssignment.weightPercent}
                  onChange={(e) => setNewAssignment((a) => ({ ...a, weightPercent: e.target.value }))}
                />
                <input
                  type="number"
                  className="rounded-md bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] px-2 py-1 outline-hidden"
                  placeholder="Max pts"
                  value={newAssignment.maxGrade}
                  onChange={(e) => setNewAssignment((a) => ({ ...a, maxGrade: e.target.value }))}
                />
                <button
                  type="submit"
                  className="rounded-md bg-indigo-500 py-1.5 text-xs font-bold text-white hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20"
                >
                  Add Task
                </button>
              </form>

              <div className="relative space-y-3 rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white/50 dark:bg-[#0F0F12]/50 backdrop-blur-sm p-6 min-h-[30rem] max-h-[50rem] overflow-auto scrollbar-hide">
                <BorderBeam size={300} duration={20} colorFrom="#a855f7" colorTo="#3b82f6" initialOffset={25} />
                {displayAssignments.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No assignments yet. Import from Canvas or add manually.</p>
                )}
                
                {Object.entries(
                  displayAssignments.reduce((acc, a) => {
                    const course = displayCourses.find(c => c.id === a.course.id);
                    const session = course ? getSessionFromCourse(course) : "Unknown";
                    if (!acc[session]) acc[session] = [];
                    acc[session].push(a);
                    return acc;
                  }, {} as Record<string, Assignment[]>)
                ).sort(([sa], [sb]) => sb.localeCompare(sa)).map(([session, items]) => {
                  const isHidden = hiddenSemesters.includes(session);
                  return (
                    <div key={session} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1F1F23] pb-2">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200">{session}</h3>
                        <button onClick={() => toggleSemesterHidden(session)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                          {isHidden ? "Reveal" : "Collapse"}
                        </button>
                      </div>
                      {!isHidden && (
                        <div className="grid gap-3">
                          {items.map(a => (
                            <div key={a.id} className="group relative rounded-xl border border-gray-100 dark:border-[#1F1F23] bg-white dark:bg-[#0A0A0C] p-3 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => setSelectedAssignment(a)}>
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${a.status === 'completed' ? 'bg-green-500' : a.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{a.course.code}</div>
                                  </div>
                                  <div className="font-bold text-gray-900 dark:text-zinc-100 text-sm truncate group-hover:text-indigo-500 transition-colors">{a.title}</div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(a.dueDate).toLocaleDateString()} · {(a.weight * 100).toFixed(0)}% weight
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
                                  <select
                                    className="rounded-full border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-gray-700 dark:text-zinc-300 outline-hidden"
                                    value={a.status}
                                    onChange={(e) => updateAssignmentStatus(a.id, e.target.value)}
                                  >
                                    {ASSIGNMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                  </select>
                                  <div className="text-xs font-black text-indigo-500">{a.grade != null ? `${a.grade}/${a.maxGrade}` : 'PENDING'}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </BlurFade>
        </section>
      </div>

      <BlurFade delay={0.3}>
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Academic Performance</h2>
            <div className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Analytics</div>
          </div>
          
          <div id="step-grade-overview" className="relative rounded-2xl border border-gray-200 dark:border-[#1F1F23] bg-white/40 dark:bg-[#0F0F12]/40 backdrop-blur-md p-6 overflow-hidden">
            <BorderBeam size={400} duration={15} colorFrom="#f43f5e" colorTo="#fb923c" initialOffset={50} />
            <GradeCharts assignments={displayAssignmentsForCharts} />
          </div>
        </section>
      </BlurFade>

      {selectedAssignment && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedAssignment(null)}>
          <div 
            id="step-assignment-modal"
            className="relative w-full max-w-2xl rounded-3xl border border-white/20 dark:border-zinc-800 bg-white dark:bg-[#0A0A0C] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <BorderBeam size={500} duration={10} colorFrom="#6366f1" colorTo="#ec4899" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{selectedAssignment.course.code}</div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{selectedAssignment.title}</h3>
                </div>
                <button onClick={() => setSelectedAssignment(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'STATUS', value: selectedAssignment.status.replace('_', ' '), color: 'text-blue-500' },
                  { label: 'DUE DATE', value: new Date(selectedAssignment.dueDate).toLocaleDateString(), color: 'text-indigo-500' },
                  { label: 'WEIGHT', value: `${(selectedAssignment.weight * 100).toFixed(0)}%`, color: 'text-purple-500' },
                  { label: 'GRADE', value: selectedAssignment.grade != null ? `${selectedAssignment.grade}/${selectedAssignment.maxGrade}` : 'TBD', color: 'text-pink-500' },
                ].map(stat => (
                  <div key={stat.label} className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800">
                    <div className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider transition-colors uppercase">{stat.label}</div>
                    <div className={cn("text-xs font-bold mt-1 uppercase", stat.color)}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Description</h4>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed min-h-[100px]">
                  {selectedAssignment.description || 'No description provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
