"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { MenuBar } from "@/components/ui/glow-menu";
import { History, CalendarClock, LineChart, Settings, X } from "lucide-react";
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
}

interface Props {
  assignments: Assignment[];
  courses: Course[];
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
  return 0; // Fail
}

const CURRENT_SESSION = "Autumn 2026"; // Fallback current session

export default function AssignmentsCardOverview({ assignments, courses }: Props) {
  const [activeTab, setActiveTab] = useState<string>("Upcoming Assignments");
  const [gpaSettingsOpen, setGpaSettingsOpen] = useState(false);
  const [manualGpas, setManualGpas] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("manual_session_gpas");
      if (stored) {
        setManualGpas(JSON.parse(stored));
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    if (gpaSettingsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; }
  }, [gpaSettingsOpen]);

  const saveManualGpas = (newGpas: Record<string, number>) => {
    setManualGpas(newGpas);
    window.localStorage.setItem("manual_session_gpas", JSON.stringify(newGpas));
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
      label: "GPA Overview",
      gradient: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
      iconColor: "text-green-500"
    }
  ];

  const now = new Date();

  // Filter out assignments without valid dates
  const validAssignments = assignments.filter((a) => {
    const d = new Date(a.dueDate);
    return !isNaN(d.getTime()) && d.getFullYear() !== 1970;
  });

  const currentSessionAssignments = validAssignments.filter((a) => {
    const course = courses.find((c) => c.id === a.course.id);
    if (!course) return false;
    const session = getSessionFromCourse(course);
    // Determine the current session, the prompt states "i.e. Autumn 2026"
    return session === CURRENT_SESSION;
  });

  const pastAssignments = currentSessionAssignments
    .filter((a) => new Date(a.dueDate) < now)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()); // Latest past first

  const upcomingAssignments = validAssignments
    .filter((a) => new Date(a.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Next due first

  // GPA Calculations
  const sessions = useMemo(() => {
    const uniqueSessions = new Set<string>();
    courses.forEach((c) => {
        const s = getSessionFromCourse(c);
        if (s !== "Unknown") uniqueSessions.add(s);
    });
    const arr = Array.from(uniqueSessions);
    // Sort logic for sessions (e.g. Autumn 2025, Spring 2025, Autumn 2026)
    arr.sort((a, b) => {
        const [termA, yearA] = a.split(" ");
        const [termB, yearB] = b.split(" ");
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        const terms: Record<string, number> = { "Summer": 0, "Autumn": 1, "Winter": 2, "Spring": 3 };
        return (terms[termA] || 0) - (terms[termB] || 0);
    });
    return arr;
  }, [courses]);

  const computedGpas = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of sessions) {
      if (manualGpas[session] !== undefined) {
        result[session] = manualGpas[session];
        continue;
      }

      // Calculate from courses
      const sessionCourses = courses.filter((c) => getSessionFromCourse(c) === session);
      if (sessionCourses.length === 0) continue;

      let totalGpa = 0;
      let courseCount = 0;

      for (const course of sessionCourses) {
        const courseAssignments = validAssignments.filter((a) => a.course.id === course.id && a.grade !== null);
        if (courseAssignments.length === 0) continue;

        let totalWeight = 0;
        let weightedSum = 0;
        for (const a of courseAssignments) {
          totalWeight += a.weight;
          const pct = getPercentageGrade(a.grade, a.maxGrade) || 0;
          weightedSum += pct * a.weight;
        }

        if (totalWeight > 0) {
          const finalPct = weightedSum / totalWeight;
          const gpa = getGrade7FromPercentage(finalPct);
          if (gpa !== null) {
            totalGpa += gpa;
            courseCount += 1;
          }
        }
      }

      if (courseCount > 0) {
        result[session] = totalGpa / courseCount;
      }
    }
    return result;
  }, [sessions, courses, validAssignments, manualGpas]);

  const chartLabels = sessions.filter((s) => computedGpas[s] !== undefined);
  const chartDataSemester = chartLabels.map((s) => computedGpas[s]);
  const chartDataCumulative = chartLabels.map((s, idx) => {
    let sum = 0;
    for (let i = 0; i <= idx; i++) {
        sum += computedGpas[chartLabels[i]];
    }
    return sum / (idx + 1);
  });

  const currentSemesterGPA = computedGpas[chartLabels[chartLabels.length - 1]] || 0;
  const cumulativeGPA = chartDataCumulative[chartDataCumulative.length - 1] || 0;

  const renderAssignmentCard = (a: Assignment) => {
    const course = courses.find((c) => c.id === a.course.id);
    const courseName = course ? course.name.split("-")[0].trim() : "Unknown Course";
    const colorClass = COURSE_COLORS[(course?.id || 0) % COURSE_COLORS.length];

    return (
      <div key={a.id} className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0B] p-4 shadow-sm flex items-stretch">
        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${colorClass}`} />
        <div className="pl-3 flex flex-col w-full">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">{courseName}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-1">{a.title}</span>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
            <span>Weight: {(a.weight * 100).toFixed(0)}% • Out of {a.maxGrade}</span>
          </div>
        </div>
      </div>
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
            {upcomingAssignments.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming assignments.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingAssignments.map(renderAssignmentCard)}
              </div>
            )}
          </div>
        )}

        {activeTab === "GPA Overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Current Semester GPA</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{currentSemesterGPA.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cumulative GPA</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{cumulativeGPA.toFixed(2)}</div>
                </div>
              </div>
              <button 
                onClick={() => setGpaSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                title="Edit Session GPAs"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="h-64 mt-4 bg-white dark:bg-[#0A0A0B] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              {chartLabels.length > 0 ? (
                <Line
                  data={{
                    labels: chartLabels,
                    datasets: [
                      {
                        label: 'Semester GPA',
                        data: chartDataSemester,
                        borderColor: '#3b82f6', // blue-500
                        backgroundColor: '#3b82f6',
                        tension: 0,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                      },
                      {
                        label: 'Cumulative GPA',
                        data: chartDataCumulative,
                        borderColor: '#22c55e', // green-500
                        backgroundColor: '#22c55e',
                        borderDash: [5, 5],
                        tension: 0.3,
                        pointRadius: 3,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        min: 0,
                        max: 7,
                        ticks: { stepSize: 1, color: '#9ca3af' },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                      },
                      x: {
                        ticks: { color: '#9ca3af' },
                        grid: { display: false }
                      }
                    },
                    plugins: {
                      legend: {
                        labels: { color: '#9ca3af' }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  No GPA data available yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {gpaSettingsOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] p-6 shadow-xl relative">
            <button 
              onClick={() => setGpaSettingsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Manual GPA Entry</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Enter your final GPA (out of 7) for completed sessions. This will override the calculated GPA for that session.
            </p>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {sessions.map((session) => (
                <div key={session} className="flex justify-between items-center bg-gray-50 dark:bg-[#0A0A0B] p-2 rounded-lg border border-gray-200 dark:border-gray-800">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{session}</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    max="7"
                    className="w-20 rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Auto"
                    value={manualGpas[session] !== undefined ? manualGpas[session] : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = { ...manualGpas };
                      if (val === "") {
                        delete next[session];
                      } else {
                        next[session] = parseFloat(val);
                      }
                      saveManualGpas(next);
                    }}
                  />
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No sessions found.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
