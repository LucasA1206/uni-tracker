"use client";

import { useMemo, useState } from "react";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";

// Plugin to draw percentage labels just outside each pie slice
const outsideLabelPlugin = {
  id: "outsideLabelPlugin",
  afterDraw(chart: any) {
    if (chart.config.type !== "pie") return;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0].data as number[];
    ctx.save();
    ctx.font = "16px system-ui";
    
    // Support light mode text visibility
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? "#e5e7eb" : "#374151";

    meta.data.forEach((arc: any, index: number) => {
      const value = values[index] as number;
      if (!isFinite(value)) return;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      // push labels further away from the pie so they don't overlap slices
      const radius = (arc.outerRadius as number) + 40;
      const x = arc.x + Math.cos(angle) * radius;
      const y = arc.y + Math.sin(angle) * radius;
      // Show the course's weighted grade (value) rather than slice fraction
      const label = `${value.toFixed(1)}%`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    });
    ctx.restore();
  },
};

ChartJS.register(
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  TimeScale,
  outsideLabelPlugin as any,
);

export interface AssignmentForCharts {
  id?: string;
  title?: string;
  courseCode: string;
  session?: string;
  weight: number;
  maxGrade: number;
  grade: number | null;
  dueDate: string; // ISO
}

/** Per-course override: null means "auto" (compute from assignments). */
export interface CourseGradeOverride {
  courseCode: string;
  session: string;
  wam: number | null;   // null = auto
  gpa: number | null;   // null = auto
}

/* ──────── helpers ──────── */

/** Convert a WAM percentage to a 7-point GPA. */
function wamToGpa(wam: number): number {
  if (wam >= 85) return 7;
  if (wam >= 75) return 6;
  if (wam >= 65) return 5;
  if (wam >= 50) return 4;
  if (wam >= 45) return 3;  // Conceded pass in some unis
  if (wam >= 40) return 2;  // Additional threshold
  return 1;
}

function computeAutoWam(assignments: AssignmentForCharts[]): number | null {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const a of assignments) {
    if (a.grade == null) continue;
    totalWeight += a.weight;
    const proportion = a.grade / a.maxGrade;
    weightedSum += proportion * a.weight;
  }
  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 1000) / 10;
}

function computeCourseWeightedGrades(
  assignments: AssignmentForCharts[],
  overrides: CourseGradeOverride[],
) {
  // Group assignments by course code
  const byCourse: Record<string, AssignmentForCharts[]> = {};
  for (const a of assignments) {
    if (!byCourse[a.courseCode]) byCourse[a.courseCode] = [];
    byCourse[a.courseCode].push(a);
  }

  const labels: string[] = [];
  const values: number[] = [];

  for (const [code, list] of Object.entries(byCourse)) {
    // Check for override
    const override = overrides.find(o => o.courseCode === code);
    if (override?.wam != null) {
      labels.push(code);
      values.push(Math.round(override.wam * 10) / 10);
      continue;
    }
    const auto = computeAutoWam(list);
    if (auto == null) continue;
    labels.push(code);
    values.push(auto);
  }

  return { labels, values };
}

function computeTimeline(assignments: AssignmentForCharts[]) {
  const points = assignments
    .filter((a) => {
      if (a.grade == null) return false;
      const d = new Date(a.dueDate);
      if (!isFinite(d.getTime())) return false;
      if (d.getFullYear() === 1970) return false; // exclude items with no due date
      return true;
    })
    .map((a) => ({ x: a.dueDate, y: (a.grade! / a.maxGrade) * 100 }));

  points.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
  return points;
}

function computeGradeBuckets(assignments: AssignmentForCharts[]) {
  const buckets = [
    { label: "0-50", min: 0, max: 50 },
    { label: "50-65", min: 50, max: 65 },
    { label: "65-75", min: 65, max: 75 },
    { label: "75-85", min: 75, max: 85 },
    { label: "85-100", min: 85, max: 100.0001 },
  ];

  const counts = new Array(buckets.length).fill(0);
  for (const a of assignments) {
    if (a.grade == null) continue;
    const pct = (a.grade / a.maxGrade) * 100;
    const idx = buckets.findIndex((b) => pct >= b.min && pct < b.max);
    if (idx >= 0) counts[idx] += 1;
  }

  return { labels: buckets.map((b) => b.label), counts };
}

/* ──────── component ──────── */

interface GradeChartsProps {
  assignments: AssignmentForCharts[];
  overrides: CourseGradeOverride[];
  onOverridesChange: (overrides: CourseGradeOverride[]) => void;
}

export default function GradeCharts({ assignments, overrides, onOverridesChange }: GradeChartsProps) {
  const { labels, values } = computeCourseWeightedGrades(assignments, overrides);

  const timeline = computeTimeline(assignments);
  const { labels: bucketLabels, counts } = computeGradeBuckets(assignments);

  const hasCourseData = labels.length > 0;

  /* ── Session-grouped course data for the table ── */
  const sessionGroups = useMemo(() => {
    const byCourse: Record<string, AssignmentForCharts[]> = {};
    for (const a of assignments) {
      if (!byCourse[a.courseCode]) byCourse[a.courseCode] = [];
      byCourse[a.courseCode].push(a);
    }

    // Build per-course rows
    const rows: { courseCode: string; session: string; autoWam: number | null; autoGpa: number | null }[] = [];
    for (const [code, list] of Object.entries(byCourse)) {
      const session = list[0]?.session || "Unknown";
      const autoWam = computeAutoWam(list);
      const autoGpa = autoWam != null ? wamToGpa(autoWam) : null;
      rows.push({ courseCode: code, session, autoWam, autoGpa });
    }

    // Group by session
    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.session]) grouped[row.session] = [];
      grouped[row.session].push(row);
    }

    // Sort sessions newest first
    const sortedSessions = Object.keys(grouped).sort((a, b) => {
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
      return pa.order - pb.order;
    });

    return sortedSessions.map(session => ({
      session,
      courses: grouped[session].sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    }));
  }, [assignments]);

  /* ── helpers for editing overrides ── */
  const getOverride = (courseCode: string) => overrides.find(o => o.courseCode === courseCode);

  const setOverrideField = (courseCode: string, session: string, field: "wam" | "gpa", raw: string) => {
    const existing = overrides.find(o => o.courseCode === courseCode);
    const numVal = raw.trim() === "" || raw.trim().toLowerCase() === "auto" ? null : parseFloat(raw);
    const value = numVal != null && isNaN(numVal) ? null : numVal;

    if (existing) {
      onOverridesChange(overrides.map(o =>
        o.courseCode === courseCode ? { ...o, [field]: value } : o
      ));
    } else {
      onOverridesChange([...overrides, { courseCode, session, wam: field === "wam" ? value : null, gpa: field === "gpa" ? value : null }]);
    }
  };

  /* ── session-level WAM/GPA aggregates ── */
  const sessionAggregates = useMemo(() => {
    const result: Record<string, { wam: number | null; gpa: number | null }> = {};
    for (const group of sessionGroups) {
      const wams: number[] = [];
      const gpas: number[] = [];
      for (const course of group.courses) {
        const override = getOverride(course.courseCode);
        const wam = override?.wam ?? course.autoWam;
        const gpa = override?.gpa ?? (wam != null ? wamToGpa(wam) : course.autoGpa);
        if (wam != null) wams.push(wam);
        if (gpa != null) gpas.push(gpa);
      }
      result[group.session] = {
        wam: wams.length > 0 ? Math.round((wams.reduce((s, v) => s + v, 0) / wams.length) * 10) / 10 : null,
        gpa: gpas.length > 0 ? Math.round((gpas.reduce((s, v) => s + v, 0) / gpas.length) * 10) / 10 : null,
      };
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionGroups, overrides]);

  /* ── no data state ── */
  if (sessionGroups.length === 0 && !hasCourseData) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 p-3 text-xs text-gray-500 dark:text-slate-400">
        No graded assignments yet. Charts will appear once you start entering grades.
      </div>
    );
  }

  const colors = [
    "rgba(99, 102, 241, 0.8)",  // Indigo
    "rgba(168, 85, 247, 0.8)",  // Purple
    "rgba(244, 63, 94, 0.8)",   // Rose
    "rgba(6, 182, 212, 0.8)",   // Cyan
    "rgba(34, 197, 94, 0.8)",   // Green
    "rgba(249, 115, 22, 0.8)",  // Orange
    "rgba(236, 72, 153, 0.8)",  // Pink
    "rgba(234, 179, 8, 0.8)",   // Yellow
  ];

  const backgroundColors = labels.map((_, idx) => colors[idx % colors.length]);

  const inputClass = "w-20 text-center rounded-lg bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-700 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all";

  return (
    <div className="space-y-6">
      {/* Charts grid */}
      {hasCourseData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pie chart: each slice sized by weighted percentage, labels outside */}
          <div className="rounded-lg bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">Weighted grade per course (pie)</h3>
            <div className="h-80 pt-4 pb-6">
              <Pie
                data={{
                  labels,
                  datasets: [
                    {
                      data: values,
                      backgroundColor: backgroundColors,
                      borderColor: "#020617",
                      borderWidth: 3,
                    },
                  ],
                }}
                options={{
                  layout: {
                    padding: { top: 40, bottom: 40 },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const label = ctx.label || "";
                          const value = ctx.parsed as number;
                          return `${label}: ${value.toFixed(1)}%`;
                        },
                      },
                    },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
            {/* Custom legend below the pie so it never overlaps labels */}
            <div className="mt-4 space-y-1 text-[11px]">
              {labels.map((label, idx) => (
                <div key={label} className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: backgroundColors[idx] }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart: same data, easier to compare courses */}
          <div className="rounded-lg bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 p-3">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Weighted grade per course (bar)</h3>
            <div className="h-100">
              <Bar
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Grade %",
                      data: values,
                      backgroundColor: "rgba(99, 102, 241, 0.5)",
                      borderColor: "#6366f1",
                      borderWidth: 2,
                      borderRadius: 8,
                    },
                  ],
                }}
                options={{
                  scales: {
                    y: { beginAtZero: true, max: 100 },
                  },
                  plugins: {
                    legend: { display: false },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>

          {/* Line chart: grades over time */}
          <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 p-3 md:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Grades over time</h3>
            <div className="h-64">
              <Line
                data={{
                  datasets: [
                    {
                      label: "Assignment grade (%)",
                      data: timeline,
                      borderColor: "#10b981",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: "#10b981",
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    },
                  ],
                }}
                options={{
                  scales: {
                    x: {
                      type: "time",
                      time: { unit: "week" },
                      ticks: { color: "#9ca3af", maxRotation: 0 },
                    },
                    y: { beginAtZero: true, max: 100 },
                  },
                  plugins: {
                    legend: { display: false },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>

          {/* Histogram: how many assignments fall into each grade band */}
          <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 p-3 md:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Grade distribution</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: bucketLabels,
                  datasets: [
                    {
                      label: "Assignments",
                      data: counts,
                      backgroundColor: "rgba(244, 63, 94, 0.5)",
                      borderColor: "#f43f5e",
                      borderWidth: 2,
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                  },
                  plugins: {
                    legend: { display: false },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Session Grade Table ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Course Grades by Session</h3>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wider">Editable</span>
        </div>

        {sessionGroups.map(({ session, courses }) => {
          const agg = sessionAggregates[session];
          return (
            <div key={session} className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 overflow-hidden">
              {/* Session header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100/80 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                <span className="text-xs font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">{session}</span>
                <div className="flex items-center gap-4 text-[10px] font-bold">
                  <span className="text-indigo-500">WAM: {agg?.wam != null ? agg.wam.toFixed(1) : "—"}</span>
                  <span className="text-purple-500">GPA: {agg?.gpa != null ? agg.gpa.toFixed(1) : "—"}</span>
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
                  {courses.map((course) => {
                    const override = getOverride(course.courseCode);
                    const displayWam = override?.wam ?? course.autoWam;
                    const displayGpa = override?.gpa ?? (displayWam != null ? wamToGpa(displayWam) : course.autoGpa);
                    const isWamOverridden = override?.wam != null;
                    const isGpaOverridden = override?.gpa != null;

                    return (
                      <tr key={course.courseCode} className="border-t border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-gray-800 dark:text-zinc-200">{course.courseCode}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            className={inputClass}
                            value={isWamOverridden ? String(override!.wam) : (course.autoWam != null ? `${course.autoWam}` : "")}
                            placeholder="auto"
                            onChange={(e) => setOverrideField(course.courseCode, course.session, "wam", e.target.value)}
                            title={course.autoWam != null ? `Auto: ${course.autoWam}%` : "No graded assignments"}
                          />
                          {!isWamOverridden && course.autoWam != null && (
                            <span className="ml-1 text-[9px] text-gray-400 dark:text-zinc-600 italic">auto</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            className={inputClass}
                            value={isGpaOverridden ? String(override!.gpa) : (displayGpa != null ? `${displayGpa}` : "")}
                            placeholder="auto"
                            onChange={(e) => setOverrideField(course.courseCode, course.session, "gpa", e.target.value)}
                            title={displayGpa != null ? `Auto: ${displayGpa}` : "No graded assignments"}
                          />
                          {!isGpaOverridden && displayGpa != null && (
                            <span className="ml-1 text-[9px] text-gray-400 dark:text-zinc-600 italic">auto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
