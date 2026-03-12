"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { MenuBar } from "@/components/ui/glow-menu";
import { History, CalendarClock, LineChart, Settings, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Line } from "react-chartjs-2";

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

interface Props {
  assignments: Assignment[];
  courses: Course[];
  activeTabOverride?: string;
}

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

const CURRENT_SESSION = "Autumn 2026";

export default function AssignmentsCardOverview({ assignments, courses, activeTabOverride }: Props) {
  const [activeTab, setActiveTab] = useState<string>("Upcoming Assignments");

  useEffect(() => {
    if (activeTabOverride) {
      setActiveTab(activeTabOverride);
    }
  }, [activeTabOverride]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualGpas, setManualGpas] = useState<Record<string, number>>({});
  const [manualWams, setManualWams] = useState<Record<string, number>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    try {
      const storedGpa = window.localStorage.getItem("manual_session_gpas");
      if (storedGpa) setManualGpas(JSON.parse(storedGpa));
      const storedWam = window.localStorage.getItem("manual_session_wams");
      if (storedWam) setManualWams(JSON.parse(storedWam));
    } catch {}
  }, []);

  useEffect(() => {
    if (settingsOpen || selectedAssignment) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [settingsOpen, selectedAssignment]);

  const saveManualGpas = (newGpas: Record<string, number>) => {
    setManualGpas(newGpas);
    window.localStorage.setItem("manual_session_gpas", JSON.stringify(newGpas));
  };

  const saveManualWams = (newWams: Record<string, number>) => {
    setManualWams(newWams);
    window.localStorage.setItem("manual_session_wams", JSON.stringify(newWams));
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

  const currentSessionAssignments = assignments.filter((a) => {
    const course = courses.find((c) => c.id === a.course.id);
    if (!course) return false;
    return getSessionFromCourse(course) === CURRENT_SESSION;
  });

  const pastAssignments = currentSessionAssignments
    .filter((a) => {
      const d = new Date(a.dueDate);
      const hasDate = !isNaN(d.getTime()) && d.getFullYear() !== 1970;
      return a.status === "completed" || (hasDate && d < now);
    })
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const upcomingAssignments = currentSessionAssignments
    .filter((a) => {
      const d = new Date(a.dueDate);
      const hasDate = !isNaN(d.getTime()) && d.getFullYear() !== 1970;
      return a.status !== "completed" && hasDate && d >= now;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const noDueDateAssignments = currentSessionAssignments
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

  // GPA per session (manual overrides or calculated)
  const computedGpas = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of sessions) {
      if (manualGpas[session] !== undefined) {
        result[session] = manualGpas[session];
        continue;
      }
      const sessionCourses = courses.filter((c) => getSessionFromCourse(c) === session);
      if (sessionCourses.length === 0) continue;
      let totalGpa = 0, courseCount = 0;
      for (const course of sessionCourses) {
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
  }, [sessions, courses, validAssignments, manualGpas]);

  // WAM per session (manual overrides or calculated as weighted avg percentage across all assignments in session)
  const computedWams = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of sessions) {
      if (manualWams[session] !== undefined) {
        result[session] = manualWams[session];
        continue;
      }
      const sessionCourses = courses.filter((c) => getSessionFromCourse(c) === session);
      if (sessionCourses.length === 0) continue;
      // WAM = weighted avg of (grade/maxGrade)*100 across all session assignments with grades
      let totalWeight = 0, weightedSum = 0;
      for (const course of sessionCourses) {
        const ca = validAssignments.filter((a) => a.course.id === course.id && a.grade !== null);
        for (const a of ca) {
          const pct = getPercentageGrade(a.grade, a.maxGrade);
          if (pct !== null) {
            totalWeight += a.weight;
            weightedSum += pct * a.weight;
          }
        }
      }
      if (totalWeight > 0) result[session] = weightedSum / totalWeight;
    }
    return result;
  }, [sessions, courses, validAssignments, manualWams]);

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
    const courseName = course ? course.name.split("-")[0].trim() : "Unknown Course";
    const colorClass = COURSE_COLORS[(course?.id || 0) % COURSE_COLORS.length];

    return (
      <button
        key={a.id}
        type="button"
        className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0B] p-4 shadow-sm flex items-stretch text-left w-full hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group"
        onClick={() => setSelectedAssignment(a)}
      >
        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${colorClass}`} />
        <div className="pl-3 flex flex-col w-full">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">{courseName}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{a.title}</span>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>Due: {(() => {
              const d = new Date(a.dueDate);
              const hasDue = !isNaN(d.getTime()) && d.getFullYear() !== 1970;
              return hasDue ? d.toLocaleDateString() : "No due date";
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

      <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#030303]/50 backdrop-blur-xl p-4 min-h-[300px]">
        {activeTab === "Past Assignments" && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Past Assignments ({CURRENT_SESSION})</h3>
            {pastAssignments.length === 0 ? (
              <p className="text-sm text-gray-500">No past assignments for this session.</p>
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
          </div>
        )}
      </div>

      {/* Assignment detail popup */}
      {selectedAssignment && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedAssignment(null)}>
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/20 dark:border-zinc-800 bg-white dark:bg-[#0A0A0C] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-[25%] -left-[25%] w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_120deg,#6366f1_180deg,transparent_240deg,transparent_360deg)] animate-[spin_8s_linear_infinite] opacity-30" />
            </div>

            {/* Header */}
            <div className="p-8 pb-4 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{selectedAssignment.course.code}</div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{selectedAssignment.title}</h3>
                </div>
                <button onClick={() => setSelectedAssignment(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { 
                    label: 'STATUS', 
                    value: selectedAssignment.status.replace('_', ' '), 
                    color: selectedAssignment.status === 'completed' ? 'text-green-500' : selectedAssignment.status === 'in_progress' ? 'text-blue-500' : 'text-yellow-500' 
                  },
                  { 
                    label: 'DUE DATE', 
                    value: (() => {
                      const d = new Date(selectedAssignment.dueDate);
                      const isOld = isNaN(d.getTime()) || d.getFullYear() < (new Date().getFullYear() - 5);
                      return isOld ? "No due date" : d.toLocaleDateString();
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
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 relative z-10 scrollbar-hide">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Description</h4>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed min-h-[100px]">
                  {selectedAssignment.description ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedAssignment.description }} />
                  ) : (
                    'No description provided.'
                  )}
                </div>
              </div>

              {selectedAssignment.canvasUrl && (
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
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
              <button 
                onClick={() => setSelectedAssignment(null)}
                className="px-6 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Grade settings popup */}
      {settingsOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] p-6 shadow-xl relative max-h-[90vh] overflow-y-auto"
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
              Enter final GPA (out of 7) or WAM (out of 100) for completed sessions. These override calculated values.
            </p>

            {/* GPA Section */}
            <div className="mb-5">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                GPA (out of 7)
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sessions.map((session) => (
                  <div key={session} className="flex justify-between items-center bg-gray-50 dark:bg-[#0A0A0B] p-2 rounded-lg border border-gray-200 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{session}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="7"
                      className="w-20 rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Auto"
                      value={manualGpas[session] !== undefined ? manualGpas[session] : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = { ...manualGpas };
                        if (val === "") { delete next[session]; } else { next[session] = parseFloat(val); }
                        saveManualGpas(next);
                      }}
                    />
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No sessions found.</p>}
              </div>
            </div>

            {/* WAM Section */}
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                WAM (out of 100)
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sessions.map((session) => (
                  <div key={session} className="flex justify-between items-center bg-gray-50 dark:bg-[#0A0A0B] p-2 rounded-lg border border-gray-200 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{session}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-20 rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Auto"
                      value={manualWams[session] !== undefined ? manualWams[session] : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = { ...manualWams };
                        if (val === "") { delete next[session]; } else { next[session] = parseFloat(val); }
                        saveManualWams(next);
                      }}
                    />
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No sessions found.</p>}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
