"use client";

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
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const total = chart.data.datasets[0].data.reduce((sum: number, v: number) => sum + v, 0);
    const labels = chart.data.labels as string[];
    const values = chart.data.datasets[0].data as number[];
    ctx.save();
    ctx.font = "16px system-ui";
    ctx.fillStyle = "#e5e7eb"; // slate-200
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
  courseCode: string;
  weight: number;
  maxGrade: number;
  grade: number | null;
  dueDate: string; // ISO
}

function computeCourseWeightedGrades(assignments: AssignmentForCharts[]) {
  const byCourse: Record<string, AssignmentForCharts[]> = {};
  for (const a of assignments) {
    if (!byCourse[a.courseCode]) byCourse[a.courseCode] = [];
    byCourse[a.courseCode].push(a);
  }

  const labels: string[] = [];
  const values: number[] = [];

  for (const [code, list] of Object.entries(byCourse)) {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const a of list) {
      if (a.grade == null) continue;
      totalWeight += a.weight;
      const proportion = a.grade / a.maxGrade;
      weightedSum += proportion * a.weight;
    }
    if (totalWeight === 0) continue;
    const pct = (weightedSum / totalWeight) * 100;
    labels.push(code);
    values.push(Math.round(pct * 10) / 10);
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

export default function GradeCharts({ assignments }: { assignments: AssignmentForCharts[] }) {
  const { labels, values } = computeCourseWeightedGrades(assignments);

  // Attach values to chart instance so the plugin can show per-course grade values
  (ChartJS as any)._lastCourseChartValues = { labels, values };
  const timeline = computeTimeline(assignments);
  const { labels: bucketLabels, counts } = computeGradeBuckets(assignments);

  const hasCourseData = labels.length > 0;

  if (!hasCourseData) {
    return (
      <div className="rounded-lg bg-slate-900/60 p-3 text-xs text-slate-400">
        No graded assignments yet. Charts will appear once you start entering grades.
      </div>
    );
  }

  const colors = [
    "#6366f1",
    "#22c55e",
    "#f97316",
    "#ec4899",
    "#06b6d4",
    "#eab308",
    "#a770dbff",
    "#d4a655ff",
  ];

  const backgroundColors = labels.map((_, idx) => colors[idx % colors.length]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Pie chart: each slice sized by weighted percentage, labels outside */}
      <div className="rounded-lg bg-slate-900/60 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-100">Weighted grade per course (pie)</h3>
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
            <div key={label} className="flex items-center gap-2 text-slate-300">
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
      <div className="rounded-lg bg-slate-900/60 p-3">
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Weighted grade per course (bar)</h3>
        <div className="h-100">
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: "Grade %",
                  data: values,
                  backgroundColor: "rgba(129, 140, 248, 0.7)",
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
      <div className="rounded-lg bg-slate-900/60 p-3 md:col-span-2">
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Grades over time</h3>
        <div className="h-64">
          <Line
            data={{
              datasets: [
                {
                  label: "Assignment grade (%)",
                  data: timeline,
                  borderColor: "rgba(52, 211, 153, 0.9)",
                  backgroundColor: "rgba(52, 211, 153, 0.4)",
                  tension: 0.25,
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
      <div className="rounded-lg bg-slate-900/60 p-3 md:col-span-2">
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Grade distribution</h3>
        <div className="h-64">
          <Bar
            data={{
              labels: bucketLabels,
              datasets: [
                {
                  label: "Assignments",
                  data: counts,
                  backgroundColor: "rgba(248, 113, 113, 0.7)",
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
  );
}
