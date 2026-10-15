"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MenuBar } from "@/components/ui/glow-menu";
import AnimatedDropdown from "@/components/ui/animated-dropdown";
import { History, CalendarClock, LineChart, Settings, X, ExternalLink, Edit2, Save, Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Line } from "react-chartjs-2";
import type { CourseGradeOverride } from "@/components/GradeCharts";
import PDFViewer from "@/components/PDFViewer";
import { format } from "date-fns";

import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Course {
  id: number;
  name: string;
  code: string;
  term: string;
  year: number;
  color?: string | null;
}

interface AssignmentAttachment {
  id: number;
  assignmentId?: number;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt?: string;
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
  attachments?: AssignmentAttachment[];
}

interface Props {
  assignments: Assignment[];
  courses: Course[];
  activeTabOverride?: string;
  onUpdateStatus?: (id: number, status: string) => Promise<void> | void;
  onUpdateAssignment?: (updatedAssignment: Assignment) => Promise<void> | void;
  courseGradeOverrides?: CourseGradeOverride[];
  onOverridesChange?: (overrides: CourseGradeOverride[]) => void;
}

const ASSIGNMENT_STATUSES = [
  { value: "pending", label: "To-Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

function getSessionFromCourse(course: Course): string {
  if (course.name && course.name.includes("- ")) {
    const parts = course.name.split("- ");
    return parts[parts.length - 1].trim();
  }
  if (course.term && course.year) {
    return `${course.term} ${course.year}`;
  }
  const text = `${course.name} ${course.code}`;
  const match = text.match(/(Autumn|Spring|Summer|Winter)\s+\d{4}/i);
  if (!match) return "Unknown";
  const raw = match[0];
  const [termRaw, year] = raw.split(/\s+/);
  const term = termRaw[0].toUpperCase() + termRaw.slice(1).toLowerCase();
  return `${term} ${year}`;
}

/** Extracts just the 5-digit numeric course code from the full code string. */
function getCourseCode(course: { code: string }): string {
  const match = course.code.match(/\d{5}/);
  return match ? match[0] : course.code.slice(0, 5);
}

/** Returns just the human-readable course title, stripping the leading numeric
 *  code prefix (e.g. "12345 ") and trailing session info (e.g. " - Autumn 2024"). */
function getCourseDisplayName(course: Course): string {
  const name = course.name?.trim() || "";
  if (!name) return getCourseCode(course);
  // Strip trailing session (" - Autumn 2024", " - Spring 2025", …)
  let clean = name.replace(/\s*-\s*(Autumn|Spring|Summer|Winter)\s+\d{4}\s*$/i, "").trim();
  // Strip leading 5-digit numeric code if present (e.g. "12345 ")
  clean = clean.replace(/^\d{5}\s*/, "").trim();
  return clean || getCourseCode(course);
}

function getCourseOptionLabel(course: Course): string {
  const displayName = getCourseDisplayName(course).trim();
  const code = getCourseCode(course);
  if (!displayName || displayName.toLowerCase() === code.toLowerCase()) return code;
  return `${displayName} (${code})`;
}

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

function getPercentageGrade(grade: number | null, maxGrade: number): number | null {
  if (grade == null) return null;
  if (maxGrade === 0) return 0;
  return (grade / maxGrade) * 100;
}

function getGrade7FromPercentage(pct: number | null): number | null {
  if (pct === null) return null;
  if (pct >= 85) return 7;
  if (pct >= 75) return 6;
  if (pct >= 65) return 5;
  if (pct >= 50) return 4;
  return 0;
}


export default function AssignmentsCardOverview({ assignments, courses, activeTabOverride, onUpdateStatus, onUpdateAssignment, courseGradeOverrides = [], onOverridesChange }: Props) {
  const [activeTab, setActiveTab] = useState<string>("Upcoming Assignments");

  useEffect(() => {
    if (activeTabOverride) {
      setActiveTab(activeTabOverride);
    }
  }, [activeTabOverride]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Edit Assignment State
  const [editingAssignment, setEditingAssignment] = useState<{
    title: string;
    dueDate: string;
    dueTime: string;
    weight: string;
    grade: string;
    maxGrade: string;
    status: string;
    courseId: string;
    description: string;
  } | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Attachment State
  const [assignmentAttachments, setAssignmentAttachments] = useState<AssignmentAttachment[]>([]);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedAssignment) {
      setAssignmentAttachments([]);
      setEditingAssignment(null);
      return;
    }
    // Fetch latest attachments for this assignment
    fetch(`/api/uni/assignments/${selectedAssignment.id}/attachments`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.attachments) {
          setAssignmentAttachments(data.attachments);
        } else if (selectedAssignment.attachments) {
          setAssignmentAttachments(selectedAssignment.attachments);
        }
      })
      .catch(() => {
        if (selectedAssignment.attachments) {
          setAssignmentAttachments(selectedAssignment.attachments);
        }
      });
  }, [selectedAssignment?.id]);

  useEffect(() => {
    if (!selectedAssignment) return;
    const latest = assignments.find((a) => a.id === selectedAssignment.id);
    if (latest && latest.status !== selectedAssignment.status) {
      setSelectedAssignment(latest);
    }
  }, [assignments, selectedAssignment]);

  useEffect(() => {
    if (settingsOpen || selectedAssignment) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [settingsOpen, selectedAssignment]);

  // Helper to get/set per-course overrides
  const getOverride = (code: string) => courseGradeOverrides.find(o => o.courseCode === code);
  const setOverrideField = (courseCode: string, session: string, field: "wam" | "gpa", raw: string) => {
    const numVal = raw.trim() === "" || raw.trim().toLowerCase() === "auto" ? null : parseFloat(raw);
    const value = numVal != null && isNaN(numVal) ? null : numVal;
    const existing = courseGradeOverrides.find(o => o.courseCode === courseCode);
    let next: CourseGradeOverride[];
    if (existing) {
      next = courseGradeOverrides.map(o => o.courseCode === courseCode ? { ...o, [field]: value } : o);
    } else {
      next = [...courseGradeOverrides, { courseCode, session, wam: field === "wam" ? value : null, gpa: field === "gpa" ? value : null }];
    }
    onOverridesChange?.(next);
  };

  const handleModalStatusChange = async (status: string) => {
    if (!selectedAssignment) return;

    const assignmentId = selectedAssignment.id;
    setSelectedAssignment((prev) => (prev ? { ...prev, status } : prev));
    if (editingAssignment) {
      setEditingAssignment(prev => prev ? { ...prev, status } : prev);
    }

    try {
      if (onUpdateStatus) {
        await onUpdateStatus(assignmentId, status);
        return;
      }
      await fetch("/api/uni/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentId, status })
      });
    } catch (err) {
      console.error("Update status failed", err);
    }
  };

  const startEditingAssignment = (a: Assignment) => {
    const d = new Date(a.dueDate);
    const isValidDate = !isNaN(d.getTime()) && d.getFullYear() > 1970;
    setEditingAssignment({
      title: a.title,
      dueDate: isValidDate ? format(d, "yyyy-MM-dd") : "",
      dueTime: isValidDate ? format(d, "HH:mm") : "23:59",
      weight: String(Math.round(a.weight * 100)),
      grade: a.grade != null ? String(a.grade) : "",
      maxGrade: String(a.maxGrade),
      status: a.status,
      courseId: String(a.course.id),
      description: a.description || "",
    });
  };

  const saveEditingAssignment = async () => {
    if (!selectedAssignment || !editingAssignment) return;
    setSavingAssignment(true);
    try {
      const body: Record<string, unknown> = {
        id: selectedAssignment.id,
        title: editingAssignment.title,
        weight: Number(editingAssignment.weight) / 100,
        maxGrade: Number(editingAssignment.maxGrade),
        status: editingAssignment.status,
        description: editingAssignment.description,
      };
      if (editingAssignment.dueDate) {
        const timePart = editingAssignment.dueTime || "23:59";
        const combined = new Date(`${editingAssignment.dueDate}T${timePart}:00`);
        body.dueDate = !isNaN(combined.getTime()) ? combined.toISOString() : new Date(editingAssignment.dueDate).toISOString();
      }
      if (editingAssignment.grade !== "") body.grade = Number(editingAssignment.grade);
      else body.grade = null;
      if (editingAssignment.courseId) body.courseId = Number(editingAssignment.courseId);

      const res = await fetch("/api/uni/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedCourse = courses.find(c => c.id === Number(editingAssignment.courseId)) || selectedAssignment.course;
        const updatedAssignment: Assignment = {
          ...selectedAssignment,
          ...data.assignment,
          course: { id: updatedCourse.id, code: updatedCourse.code },
          attachments: assignmentAttachments,
        };
        setSelectedAssignment(updatedAssignment);
        onUpdateAssignment?.(updatedAssignment);
        setEditingAssignment(null);
      } else {
        alert("Failed to save changes to assignment");
      }
    } catch (err) {
      console.error("Save assignment failed", err);
      alert("Error saving assignment");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedAssignment) return;
    setIsUploadingPdf(true);
    const files = Array.from(e.target.files);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/uni/assignments/${selectedAssignment.id}/attachments`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed for ${file.name}`);
        }
      }
      
      const res = await fetch(`/api/uni/assignments/${selectedAssignment.id}/attachments`);
      if (res.ok) {
        const data = await res.json();
        const updatedAttachments = data.attachments || [];
        setAssignmentAttachments(updatedAttachments);
        const updated = { ...selectedAssignment, attachments: updatedAttachments };
        setSelectedAssignment(updated);
        onUpdateAssignment?.(updated);
      }
    } catch (err: any) {
      console.error("Failed to upload assignment PDF", err);
      alert(err.message || "Failed to upload PDF");
    } finally {
      setIsUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleDeletePdf = async (attachmentId: number) => {
    if (!selectedAssignment) return;
    if (!confirm("Are you sure you want to remove this PDF?")) return;

    try {
      const res = await fetch(`/api/uni/assignments/${selectedAssignment.id}/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");
      const updatedAttachments = assignmentAttachments.filter(a => a.id !== attachmentId);
      setAssignmentAttachments(updatedAttachments);

      const updated = { ...selectedAssignment, attachments: updatedAttachments };
      setSelectedAssignment(updated);
      onUpdateAssignment?.(updated);
    } catch (err) {
      console.error("Failed to delete PDF attachment", err);
      alert("Failed to delete PDF attachment");
    }
  };

  const menuItems = [
    {
      icon: History,
      label: "Past Assignments",
      gradient: "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
      iconColor: "text-red-500"
    },
    {
      icon: CalendarClock,
      label: "Upcoming Assignments",
      gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
      iconColor: "text-blue-500"
    },
    {
      icon: LineChart,
      label: "Grade Overview",
      gradient: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
      iconColor: "text-green-500"
    }
  ];

  const now = new Date();

  const validAssignments = assignments.filter((a) => {
    const d = new Date(a.dueDate);
    return !isNaN(d.getTime()) && d.getFullYear() !== 1970;
  });

  const pastAssignments = assignments
    .filter((a) => {
      const d = new Date(a.dueDate);
      const hasDate = !isNaN(d.getTime()) && d.getFullYear() !== 1970;
      return a.status === "completed" || (hasDate && d < now);
    })
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const upcomingAssignments = assignments
    .filter((a) => {
      const d = new Date(a.dueDate);
      const hasDate = !isNaN(d.getTime()) && d.getFullYear() !== 1970;
      return a.status !== "completed" && hasDate && d >= now;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const noDueDateAssignments = assignments
    .filter((a) => {
      const d = new Date(a.dueDate);
      const hasDate = !isNaN(d.getTime()) && d.getFullYear() !== 1970;
      return a.status !== "completed" && !hasDate;
    });

  // Sessions sorted chronologically
  const sessions = useMemo(() => {
    const uniqueSessions = new Set<string>();
    courses.forEach((c) => {
      const s = getSessionFromCourse(c);
      if (s !== "Unknown") uniqueSessions.add(s);
    });
    const arr = Array.from(uniqueSessions);
    arr.sort((a, b) => {
      const [termA, yearA] = a.split(" ");
      const [termB, yearB] = b.split(" ");
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
      const terms: Record<string, number> = { "Summer": 0, "Autumn": 1, "Winter": 2, "Spring": 3 };
      return (terms[termA] || 0) - (terms[termB] || 0);
    });
    return arr;
  }, [courses]);

  // GPA per session – uses per-course overrides as source of truth
  const computedGpas = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of sessions) {
      const sessionCourses = courses.filter((c) => getSessionFromCourse(c) === session);
      if (sessionCourses.length === 0) continue;
      let totalGpa = 0, courseCount = 0;
      for (const course of sessionCourses) {
        const code = getCourseCode(course);
        const override = getOverride(code);
        if (override?.gpa != null) {
          totalGpa += override.gpa; courseCount++; continue;
        }
        // If WAM is overridden, derive GPA from that
        if (override?.wam != null) {
          const gpa = getGrade7FromPercentage(override.wam);
          if (gpa !== null) { totalGpa += gpa; courseCount++; }
          continue;
        }
        // Auto-calculate from assignments
        const ca = validAssignments.filter((a) => a.course.id === course.id && a.grade !== null);
        if (ca.length === 0) continue;
        let totalWeight = 0, weightedSum = 0;
        for (const a of ca) {
          totalWeight += a.weight;
          const pct = getPercentageGrade(a.grade, a.maxGrade) || 0;
          weightedSum += pct * a.weight;
        }
        if (totalWeight > 0) {
          const gpa = getGrade7FromPercentage(weightedSum / totalWeight);
          if (gpa !== null) { totalGpa += gpa; courseCount++; }
        }
      }
      if (courseCount > 0) result[session] = totalGpa / courseCount;
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, courses, validAssignments, courseGradeOverrides]);

  // WAM per session – uses per-course overrides as source of truth
  const computedWams = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of sessions) {
      const sessionCourses = courses.filter((c) => getSessionFromCourse(c) === session);
      if (sessionCourses.length === 0) continue;
      const wams: number[] = [];
      for (const course of sessionCourses) {
        const code = getCourseCode(course);
        const override = getOverride(code);
        if (override?.wam != null) {
          wams.push(override.wam); continue;
        }
        // Auto-calculate from assignments
        let totalWeight = 0, weightedSum = 0;
        const ca = validAssignments.filter((a) => a.course.id === course.id && a.grade !== null);
        for (const a of ca) {
          const pct = getPercentageGrade(a.grade, a.maxGrade);
          if (pct !== null) {
            totalWeight += a.weight;
            weightedSum += pct * a.weight;
          }
        }
        if (totalWeight > 0) wams.push(weightedSum / totalWeight);
      }
      if (wams.length > 0) result[session] = wams.reduce((s, v) => s + v, 0) / wams.length;
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, courses, validAssignments, courseGradeOverrides]);

  const gpaLabels = sessions.filter((s) => computedGpas[s] !== undefined);
  const wamLabels = sessions.filter((s) => computedWams[s] !== undefined);

  // Use union of labels for chart
  const allSessionsWithData = Array.from(new Set([...gpaLabels, ...wamLabels]));
  const chartLabels = sessions.filter((s) => allSessionsWithData.includes(s));

  const gpaData = chartLabels.map((s) => computedGpas[s] ?? null);
  const gpaCumulative = chartLabels.map((s, idx) => {
    const vals = chartLabels.slice(0, idx + 1).map((l) => computedGpas[l]).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  const wamData = chartLabels.map((s) => computedWams[s] ?? null);
  const wamCumulative = chartLabels.map((s, idx) => {
    const vals = chartLabels.slice(0, idx + 1).map((l) => computedWams[l]).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  const currentGPA = gpaData.filter((v): v is number => v != null).at(-1) ?? 0;
  const cumulativeGPA = gpaCumulative.filter((v): v is number => v != null).at(-1) ?? 0;
  const currentWAM = wamData.filter((v): v is number => v != null).at(-1) ?? 0;
  const cumulativeWAM = wamCumulative.filter((v): v is number => v != null).at(-1) ?? 0;

  const renderAssignmentCard = (a: Assignment) => {
    const course = courses.find((c) => c.id === a.course.id);
    const courseName = course ? getCourseDisplayName(course) : "Unknown Course";
    const colorClass = course?.color ? "" : COURSE_COLORS[(course?.id || 0) % COURSE_COLORS.length];

    return (
      <button
        key={a.id}
        type="button"
        className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0A0A0B] p-4 shadow-sm flex items-stretch text-left w-full hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group"
        onClick={() => setSelectedAssignment(a)}
      >
        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${colorClass}`} style={course?.color ? { backgroundColor: course.color } : {}} />
        <div className="pl-3 flex flex-col w-full">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">{courseName}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{a.title}</span>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>Due: {(() => {
              const d = new Date(a.dueDate);
              const hasDue = !isNaN(d.getTime()) && d.getFullYear() > 1970;
              if (!hasDue) return "No due date";
              if (d.getHours() === 23 && d.getMinutes() === 59) {
                return `${format(d, "MMM d, yyyy")} (All Day)`;
              }
              return format(d, "MMM d, yyyy 'at' h:mm a");
            })()}</span>
            <span>Weight: {(a.weight * 100).toFixed(0)}% • Out of {a.maxGrade}</span>
          </div>
          {a.grade != null && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Grade: {a.grade} / {a.maxGrade} ({((a.grade / a.maxGrade) * 100).toFixed(1)}%)
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 mb-8">
      <MenuBar items={menuItems} activeItem={activeTab} onItemClick={setActiveTab} />

      <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#030303]/50 backdrop-blur-xl p-4 min-h-[300px]">
        {activeTab === "Past Assignments" && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Past Assignments</h3>
            {pastAssignments.length === 0 ? (
              <p className="text-sm text-gray-500">No past assignments.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastAssignments.map(renderAssignmentCard)}
              </div>
            )}
          </div>
        )}

        {activeTab === "Upcoming Assignments" && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upcoming Assignments</h3>
            {upcomingAssignments.length === 0 && noDueDateAssignments.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming assignments.</p>
            ) : (
              <>
                {upcomingAssignments.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingAssignments.map(renderAssignmentCard)}
                  </div>
                )}
                {noDueDateAssignments.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">Unscheduled Assignments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {noDueDateAssignments.map(renderAssignmentCard)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "Grade Overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-6 flex-wrap">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Current GPA</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{currentGPA.toFixed(2)}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/7</span></div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cumulative GPA</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{cumulativeGPA.toFixed(2)}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/7</span></div>
                </div>
                <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Current WAM</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{currentWAM.toFixed(1)}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/100</span></div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cumulative WAM</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{cumulativeWAM.toFixed(1)}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/100</span></div>
                </div>
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors shrink-0"
                title="Edit Session GPAs & WAMs"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {chartLabels.length > 0 ? (
              <div className="space-y-4">
                {/* GPA Chart */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">GPA (out of 7)</div>
                  <div className="h-48 bg-white dark:bg-[#0A0A0B] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <Line
                      data={{
                        labels: chartLabels,
                        datasets: [
                          {
                            label: "Semester GPA",
                            data: gpaData,
                            borderColor: "#3b82f6",
                            backgroundColor: "#3b82f6",
                            tension: 0,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            spanGaps: true,
                          },
                          {
                            label: "Cumulative GPA",
                            data: gpaCumulative,
                            borderColor: "#22c55e",
                            backgroundColor: "#22c55e",
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 3,
                            spanGaps: true,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { min: 0, max: 7, ticks: { stepSize: 1, color: "#9ca3af" }, grid: { color: "rgba(156,163,175,0.1)" } },
                          x: { ticks: { color: "#9ca3af" }, grid: { display: false } }
                        },
                        plugins: { legend: { labels: { color: "#9ca3af" } } }
                      }}
                    />
                  </div>
                </div>
                {/* WAM Chart */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">WAM (out of 100)</div>
                  <div className="h-48 bg-white dark:bg-[#0A0A0B] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <Line
                      data={{
                        labels: chartLabels,
                        datasets: [
                          {
                            label: "Semester WAM",
                            data: wamData,
                            borderColor: "#f59e0b",
                            backgroundColor: "#f59e0b",
                            tension: 0,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            spanGaps: true,
                          },
                          {
                            label: "Cumulative WAM",
                            data: wamCumulative,
                            borderColor: "#ec4899",
                            backgroundColor: "#ec4899",
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 3,
                            spanGaps: true,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { min: 0, max: 100, ticks: { stepSize: 10, color: "#9ca3af" }, grid: { color: "rgba(156,163,175,0.1)" } },
                          x: { ticks: { color: "#9ca3af" }, grid: { display: false } }
                        },
                        plugins: { legend: { labels: { color: "#9ca3af" } } }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                No grade data available yet.
              </div>
            )}

            {/* ── Course Grades by Session ── */}
            {sessions.length > 0 && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Course Grades by Session</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wider">Editable</span>
                </div>

                {sessions.map((session) => {
                  const sessionCourses = courses.filter((c) => getSessionFromCourse(c) === session);
                  if (sessionCourses.length === 0) return null;

                  // Compute session-level aggregates
                  const wams: number[] = [];
                  const gpas: number[] = [];
                  const courseRows = sessionCourses.map((course) => {
                    const code = getCourseCode(course);
                    const override = getOverride(code);

                    // Auto WAM from assignments
                    let autoWam: number | null = null;
                    const ca = assignments.filter((a) => a.course.id === course.id && a.grade !== null);
                    let totalWeight = 0, weightedSum = 0;
                    for (const a of ca) {
                      const pct = getPercentageGrade(a.grade, a.maxGrade);
                      if (pct !== null) {
                        totalWeight += a.weight;
                        weightedSum += pct * a.weight;
                      }
                    }
                    if (totalWeight > 0) autoWam = Math.round((weightedSum / totalWeight) * 10) / 10;

                    const displayWam = override?.wam ?? autoWam;
                    const autoGpa = displayWam != null ? getGrade7FromPercentage(displayWam) : null;
                    const displayGpa = override?.gpa ?? autoGpa;

                    if (displayWam != null) wams.push(displayWam);
                    if (displayGpa != null) gpas.push(displayGpa);

                    return {
                      course,
                      code,
                      autoWam,
                      displayWam,
                      displayGpa,
                      isWamOverridden: override?.wam != null,
                      isGpaOverridden: override?.gpa != null,
                      overrideWam: override?.wam,
                      overrideGpa: override?.gpa,
                    };
                  });

                  const sessionWam = wams.length > 0 ? Math.round((wams.reduce((s, v) => s + v, 0) / wams.length) * 10) / 10 : null;
                  const sessionGpa = gpas.length > 0 ? Math.round((gpas.reduce((s, v) => s + v, 0) / gpas.length) * 10) / 10 : null;

                  const inputClass = "w-20 text-center rounded-lg bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-700 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all";

                  return (
                    <div key={session} className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 overflow-hidden">
                      {/* Session header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100/80 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                        <span className="text-xs font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">{session}</span>
                        <div className="flex items-center gap-4 text-[10px] font-bold">
                          <span className="text-indigo-500">WAM: {sessionWam != null ? sessionWam.toFixed(1) : "—"}</span>
                          <span className="text-purple-500">GPA: {sessionGpa != null ? sessionGpa.toFixed(1) : "—"}</span>
                        </div>
                      </div>

                      {/* Table */}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            <th className="text-left px-4 py-2">Course</th>
                            <th className="text-center px-3 py-2">WAM</th>
                            <th className="text-center px-3 py-2">GPA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseRows.map((row) => (
                            <tr key={row.code} className="border-t border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-2.5">
                                <span className="font-semibold text-gray-800 dark:text-zinc-200">{getCourseDisplayName(row.course)}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  className={inputClass}
                                  value={row.isWamOverridden ? String(row.overrideWam) : (row.autoWam != null ? `${row.autoWam}` : "")}
                                  placeholder="auto"
                                  onChange={(e) => setOverrideField(row.code, session, "wam", e.target.value)}
                                  title={row.autoWam != null ? `Auto: ${row.autoWam}%` : "No graded assignments"}
                                />
                                {!row.isWamOverridden && row.autoWam != null && (
                                  <span className="ml-1 text-[9px] text-gray-400 dark:text-zinc-600 italic">auto</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  className={inputClass}
                                  value={row.isGpaOverridden ? String(row.overrideGpa) : (row.displayGpa != null ? `${row.displayGpa}` : "")}
                                  placeholder="auto"
                                  onChange={(e) => setOverrideField(row.code, session, "gpa", e.target.value)}
                                  title={row.displayGpa != null ? `Auto: ${row.displayGpa}` : "No graded assignments"}
                                />
                                {!row.isGpaOverridden && row.displayGpa != null && (
                                  <span className="ml-1 text-[9px] text-gray-400 dark:text-zinc-600 italic">auto</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assignment detail popup */}
      {selectedAssignment && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedAssignment(null)}>
          <div 
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-white/20 dark:border-zinc-800 bg-gray-50 dark:bg-[#0A0A0C] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-[25%] -left-[25%] w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_120deg,#6366f1_180deg,transparent_240deg,transparent_360deg)] animate-[spin_8s_linear_infinite] opacity-30" />
            </div>

            {/* Header */}
            <div className="p-8 pb-4 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1 flex-1 min-w-0 pr-4">
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                    {(() => {
                      const c = courses.find(c => c.id === (editingAssignment ? Number(editingAssignment.courseId) : selectedAssignment.course.id));
                      return c ? getCourseDisplayName(c) : getCourseCode(selectedAssignment.course);
                    })()}
                  </div>
                  {editingAssignment ? (
                    <input
                      className="text-2xl font-black text-gray-900 dark:text-white leading-tight bg-transparent border-b-2 border-indigo-500 outline-none w-full pb-1"
                      value={editingAssignment.title}
                      onChange={e => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                      placeholder="Assignment title"
                    />
                  ) : (
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{selectedAssignment.title}</h3>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!editingAssignment && (
                    <button
                      onClick={() => startEditingAssignment(selectedAssignment)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-xs"
                      title="Edit Assignment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={() => { setSelectedAssignment(null); setEditingAssignment(null); }} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {editingAssignment ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Due Date</label>
                    <input
                      type="date"
                      className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                      value={editingAssignment.dueDate}
                      onChange={e => setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Due Time</label>
                      <button
                        type="button"
                        onClick={() => setEditingAssignment({ ...editingAssignment, dueTime: "23:59" })}
                        className="text-[9px] text-indigo-500 hover:text-indigo-600 font-semibold uppercase tracking-wider"
                      >
                        All Day
                      </button>
                    </div>
                    <input
                      type="time"
                      className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                      value={editingAssignment.dueTime}
                      onChange={e => setEditingAssignment({ ...editingAssignment, dueTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Weight %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                      value={editingAssignment.weight}
                      onChange={e => setEditingAssignment({ ...editingAssignment, weight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Grade</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="--"
                        className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                        value={editingAssignment.grade}
                        onChange={e => setEditingAssignment({ ...editingAssignment, grade: e.target.value })}
                      />
                      <span className="text-gray-400 dark:text-zinc-500 text-sm">/</span>
                      <input
                        type="number"
                        min="1"
                        className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                        value={editingAssignment.maxGrade}
                        onChange={e => setEditingAssignment({ ...editingAssignment, maxGrade: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Status</label>
                    <select
                      className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                      value={editingAssignment.status}
                      onChange={e => setEditingAssignment({ ...editingAssignment, status: e.target.value })}
                    >
                      {ASSIGNMENT_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Course</label>
                    <select
                      className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                      value={editingAssignment.courseId}
                      onChange={e => setEditingAssignment({ ...editingAssignment, courseId: e.target.value })}
                    >
                      {courses.map(c => <option key={c.id} value={c.id}>{getCourseOptionLabel(c)}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { 
                      label: 'DUE DATE', 
                      value: (() => {
                        const d = new Date(selectedAssignment.dueDate);
                        const isOld = isNaN(d.getTime()) || d.getFullYear() < (new Date().getFullYear() - 5);
                        if (isOld) return "No due date";
                        if (d.getHours() === 23 && d.getMinutes() === 59) {
                          return `${format(d, "MMM d, yyyy")} (All Day)`;
                        }
                        return format(d, "MMM d, yyyy 'at' h:mm a");
                      })(),
                      color: 'text-indigo-500' 
                    },
                    { label: 'WEIGHT', value: `${(selectedAssignment.weight * 100).toFixed(0)}%`, color: 'text-purple-500' },
                    { label: 'GRADE', value: selectedAssignment.grade != null ? `${selectedAssignment.grade}/${selectedAssignment.maxGrade}` : 'PENDING', color: 'text-pink-500' },
                  ].map(stat => (
                    <div key={stat.label} className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                      <div className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider transition-colors uppercase">{stat.label}</div>
                      <div className={cn("text-[11px] font-bold mt-1 uppercase", stat.color)}>{stat.value}</div>
                    </div>
                  ))}
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                    <div className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider transition-colors uppercase">STATUS</div>
                    <AnimatedDropdown
                      items={ASSIGNMENT_STATUSES}
                      value={selectedAssignment.status}
                      onChange={(newStatus) => void handleModalStatusChange(newStatus)}
                      className="mt-1 w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 relative z-10 scrollbar-theme">
              {/* PDF Document Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    Assignment Document {assignmentAttachments.length > 0 && `(${assignmentAttachments.length})`}
                  </h4>
                  <div>
                    <input
                      type="file"
                      ref={pdfInputRef}
                      className="hidden"
                      accept=".pdf"
                      multiple
                      onChange={handlePdfUpload}
                    />
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={isUploadingPdf}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      {isUploadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Upload PDF
                    </button>
                  </div>
                </div>

                {assignmentAttachments.length > 0 ? (
                  <PDFViewer
                    docs={assignmentAttachments.map(a => ({
                      id: a.id,
                      uri: a.url,
                      fileName: a.name,
                      size: a.size,
                      fileType: a.type
                    }))}
                    onDelete={(doc) => doc.id && handleDeletePdf(Number(doc.id))}
                    height={460}
                  />
                ) : (
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-gray-50/50 dark:bg-zinc-900/20 group"
                  >
                    <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 group-hover:scale-105 transition-transform">
                      {isUploadingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                      Upload assignment PDF (rubric, specification, task brief)
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-zinc-500">
                      Displays formatted directly in the pop-up with zoom in/out controls
                    </div>
                  </div>
                )}
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Description</h4>
                {editingAssignment ? (
                  <textarea
                    className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed min-h-[120px] outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                    value={editingAssignment.description}
                    onChange={e => setEditingAssignment({ ...editingAssignment, description: e.target.value })}
                    placeholder="Add assignment description or details..."
                  />
                ) : (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed min-h-[80px]">
                    {selectedAssignment.description ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedAssignment.description }} />
                    ) : (
                      'No description provided.'
                    )}
                  </div>
                )}
              </div>

              {selectedAssignment.canvasUrl && (
                <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                  <a
                    href={selectedAssignment.canvasUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-wider"
                  >
                    View on Canvas
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/20 flex justify-end gap-3 relative z-10">
              {editingAssignment ? (
                <>
                  <button
                    onClick={() => setEditingAssignment(null)}
                    disabled={savingAssignment}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditingAssignment}
                    disabled={savingAssignment}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                  >
                    {savingAssignment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setSelectedAssignment(null)}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Grade settings popup – per-course overrides */}
      {settingsOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] p-6 shadow-xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSettingsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Grade Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Override WAM or GPA per course. Leave blank for auto-calculated values from assignments.
            </p>

            {sessions.map((session) => {
              const sessionCourses = courses.filter((c) => getSessionFromCourse(c) === session);
              if (sessionCourses.length === 0) return null;
              return (
                <div key={session} className="mb-5">
                  <div className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">{session}</div>
                  <div className="space-y-2">
                    {sessionCourses.map((course) => {
                      const code = getCourseCode(course);
                      const override = getOverride(code);
                      return (
                        <div key={course.id} className="flex items-center gap-3 bg-gray-50 dark:bg-[#0A0A0B] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">
                          <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">{getCourseDisplayName(course)} ({code})</span>
                          <div className="flex items-center gap-2">
                            <div className="text-center">
                              <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-0.5">WAM</div>
                              <input
                                type="number" step="0.1" min="0" max="100"
                                className="w-16 rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-xs text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="auto"
                                value={override?.wam != null ? String(override.wam) : ""}
                                onChange={(e) => setOverrideField(code, session, "wam", e.target.value)}
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-0.5">GPA</div>
                              <input
                                type="number" step="0.01" min="0" max="7"
                                className="w-16 rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-xs text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="auto"
                                value={override?.gpa != null ? String(override.gpa) : ""}
                                onChange={(e) => setOverrideField(code, session, "gpa", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No sessions found.</p>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
