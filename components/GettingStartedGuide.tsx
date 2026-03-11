"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X, GraduationCap, CalendarDays, Notebook, UserCircle, Mic, Monitor, BrainCircuit, RefreshCw, ChevronDown } from "lucide-react";

interface Slide {
  section: number;
  title: string;
  content: React.ReactNode;
}

const SECTION_LABELS = ["Account", "Uni", "Calendar", "Notes"];
const SECTION_ICONS = [UserCircle, GraduationCap, CalendarDays, Notebook];

function AccountSection0() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-indigo-500/10">
          <UserCircle className="w-6 h-6 text-indigo-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Profile</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        Your account settings let you personalise the experience. Click the <span className="font-semibold text-indigo-500">account icon</span> in the sidebar to open your profile panel.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Name", desc: "How you appear in the app" },
          { label: "Email", desc: "Your university email address" },
          { label: "Username", desc: "Your unique login handle" },
          { label: "Theme", desc: "Switch between Light & Dark mode" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-3">
            <div className="text-xs font-semibold text-indigo-500 mb-0.5">{item.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-3 text-xs text-indigo-700 dark:text-indigo-300">
        💡 Changes are saved immediately when you click <strong>Save changes</strong>.
      </div>
    </div>
  );
}

function AccountSection1() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-amber-500/10">
          <UserCircle className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Canvas API Key</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        UniTracker connects to <strong>Canvas</strong> to automatically sync your courses and assignments. You'll need to generate an API key from Canvas.
      </p>
      <div className="space-y-3">
        <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">How to get your Canvas API Key</p>
          {[
            "Log in to your Canvas account",
            'Click on your profile picture → "Settings"',
            'Scroll to "Approved Integrations" → click "New Access Token"',
            "Set a purpose (e.g. UniTracker) and click Generate",
            "Copy the token and paste it into your account settings",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
              {step}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          🔑 Used for: syncing courses, assignments, and due dates from Canvas automatically.
        </div>
      </div>
    </div>
  );
}

function AccountSection2() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-blue-500/10">
          <UserCircle className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Google API Key</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        UniTracker uses the <strong>Google Gemini API</strong> to generate AI lecture notes and quizzes from your audio recordings.
      </p>
      <div className="space-y-3">
        <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">How to get your Google API Key</p>
          {[
            "Visit aistudio.google.com",
            'Click "Get API Key" in the top navigation',
            'Click "Create API Key" and select a project',
            "Copy the generated key",
            "Paste it into your account settings under Google API Key",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
              {step}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
          🤖 Used for: AI lecture note generation and quiz creation from your recordings.
        </div>
      </div>
    </div>
  );
}

function AccountSection3() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-red-500/10">
          <UserCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Changing Your Password</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        You can update your password anytime from the account panel. Your password is always hidden for security.
      </p>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">How to change your password</p>
        <div className="space-y-2">
          {[
            'Open account settings (click your name in the sidebar)',
            'Scroll to the "Password" section',
            "Enter your current password",
            "Enter your new password and confirm it",
            'Click "Save changes"',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
              {step}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1">Hidden for security</p>
        <p className="text-sm tracking-[0.3em] text-gray-400 dark:text-gray-500">••••••••</p>
      </div>
    </div>
  );
}

function UniSection0() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-green-500/10">
          <GraduationCap className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Syncing & Adding Data</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        The <strong>Uni</strong> tab is your academic hub. You can populate it automatically from Canvas or add data manually.
      </p>
      <div className="grid gap-3">
        <div className="rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">Sync from Canvas</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300">Click the <strong>"Sync from Canvas"</strong> button in the Uni tab header. This automatically imports all your courses and assignments — requires your Canvas API Key to be set.</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Adding Manually</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">Use the <strong>Add Course</strong> form to create courses manually with a name, code, term and year. Then use the <strong>Add Assignment</strong> form below to add assignments to any course.</p>
        </div>
      </div>
    </div>
  );
}

function UniSection1() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-blue-500/10">
          <GraduationCap className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Past & Upcoming Assignments</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        The assignment overview panel has three tabs to help you stay on top of your work:
      </p>
      <div className="space-y-3">
        {[
          {
            label: "Past Assignments",
            color: "text-red-500",
            bg: "bg-red-500/10",
            desc: "Shows all assignments from the current session that are completed or past their due date. Click any card to view full details.",
          },
          {
            label: "Upcoming Assignments",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            desc: "Shows all assignments due in the future for the current session. Sorted by due date so the most urgent appear first.",
          },
          {
            label: "Grade Overview",
            color: "text-green-500",
            bg: "bg-green-500/10",
            desc: "Displays your current and cumulative GPA (out of 7) and WAM (out of 100), with charts over time per session.",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-3 flex items-start gap-3">
            <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${item.bg} ${item.color}`}>{item.label}</span>
            <p className="text-xs text-gray-600 dark:text-gray-300 flex-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UniSection2() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-purple-500/10">
          <GraduationCap className="w-6 h-6 text-purple-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">GPA Overview</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        The <strong>Grade Overview</strong> tab shows your academic performance across all sessions.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Current GPA", sub: "GPA for the most recent session (out of 7)", color: "text-blue-500" },
          { label: "Cumulative GPA", sub: "Average GPA across all sessions", color: "text-green-500" },
          { label: "Current WAM", sub: "Weighted Average Mark for the most recent session", color: "text-amber-500" },
          { label: "Cumulative WAM", sub: "Average WAM across all sessions (out of 100)", color: "text-pink-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-3">
            <div className={`text-xs font-semibold ${stat.color} mb-1`}>{stat.label}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{stat.sub}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 p-3 text-xs text-purple-700 dark:text-purple-300">
        ⚙️ Click the settings icon to manually override GPA / WAM for completed sessions.
      </div>
    </div>
  );
}

function CalSection0() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-cyan-500/10">
          <CalendarDays className="w-6 h-6 text-cyan-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Notes vs Assignments</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        The calendar displays two types of events, each with a distinct colour:
      </p>
      <div className="grid gap-3">
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-4 flex items-start gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Notes</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">Shown on the date the note was created. Clicking opens the note details in a popup.</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-start gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">Assignments</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Shown on the assignment due date. Clicking opens the full assignment details popup.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalSection1() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-cyan-500/10">
          <CalendarDays className="w-6 h-6 text-cyan-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Event Popups</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        Click on any event in the calendar to open a <strong>detail popup</strong> with full information.
      </p>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#0F0F12] p-4 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Example — Assignment Popup</div>
        <div className="space-y-2">
          {[
            { label: "Course", value: "COMP1234" },
            { label: "Due", value: "Mon, Mar 16, 2026" },
            { label: "Weight", value: "25%" },
            { label: "Max Grade", value: "100" },
            { label: "Status", value: "PENDING" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F1F23] pb-1.5 last:border-0 last:pb-0 text-xs">
              <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
              <span className="font-medium text-gray-900 dark:text-white">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalSection2() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-cyan-500/10">
          <CalendarDays className="w-6 h-6 text-cyan-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Day View</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        You can get a focused view of a specific day by <strong>clicking on any date number</strong> in the calendar grid.
      </p>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">16</div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Click the day number</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Opens a detailed list of all events for that day</p>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-[#2A2A2E] pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monday, Mar 16</p>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-700 dark:text-gray-300">Assignment due: Final Project — COMP1234</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-gray-700 dark:text-gray-300">Note created: Lecture 6 Notes — MATH1001</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesSection0() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-purple-500/10">
          <Notebook className="w-6 h-6 text-purple-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Uploading Lectures</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        UniTracker can turn your lecture recordings into detailed, AI-generated notes. Here's how the pipeline works:
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: "MP4 file", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30" },
          { label: "→" },
          { label: "Convert to MP3", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" },
          { label: "→" },
          { label: "Lecture Notes ✨", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30" },
        ].map((step, i) => (
          step.label === "→" ? (
            <ChevronRight key={i} className="w-4 h-4 text-gray-400" />
          ) : (
            <span key={i} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${step.color}`}>{step.label}</span>
          )
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: "MP3 file", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" },
          { label: "→" },
          { label: "Lecture Notes ✨", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30" },
        ].map((step, i) => (
          step.label === "→" ? (
            <ChevronRight key={i} className="w-4 h-4 text-gray-400" />
          ) : (
            <span key={i} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${step.color}`}>{step.label}</span>
          )
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-3 text-xs text-gray-600 dark:text-gray-300">
        Upload your file by <strong>dragging it</strong> into the upload zone or clicking <strong>Browse Files</strong>. If you upload an MP4, it will be converted to MP3 first before generating notes.
      </div>
    </div>
  );
}

function NotesSection1() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-red-500/10">
          <Mic className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recording with Microphone</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        The <strong>Microphone</strong> mode records directly from your device's microphone — perfect for <span className="text-indigo-500 font-semibold">in-person lectures and tutorials</span>.
      </p>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center gap-3 p-1 bg-gray-100 dark:bg-[#1A1A1A] rounded-lg w-fit">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#2A2A2A] rounded-md text-indigo-500 shadow-sm text-xs font-medium">
            <Mic className="w-3.5 h-3.5" /> Microphone
          </div>
          <div className="text-xs text-gray-400 px-3 py-1.5">System Audio</div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-[#0F0F12] border border-gray-100 dark:border-gray-800 p-3 rounded-lg">
          Records audio from your default microphone. Good for in-person lectures.
        </div>
      </div>
      <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
        🎤 Click <strong>Start Recording</strong>, then <strong>Stop Recording</strong> when done. You can then use the recording to generate AI notes.
      </div>
    </div>
  );
}

function NotesSection2() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-blue-500/10">
          <Monitor className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recording System Audio</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        The <strong>System Audio</strong> mode captures audio playing from a specific browser tab or window — ideal for <span className="text-blue-500 font-semibold">online lectures and Zoom recordings</span>.
      </p>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center gap-3 p-1 bg-gray-100 dark:bg-[#1A1A1A] rounded-lg w-fit">
          <div className="text-xs text-gray-400 px-3 py-1.5">Microphone</div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#2A2A2A] rounded-md text-indigo-500 shadow-sm text-xs font-medium">
            <Monitor className="w-3.5 h-3.5" /> System Audio
          </div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-[#0F0F12] border border-gray-100 dark:border-gray-800 p-3 rounded-lg">
          Records audio from a specific tab or window. Select <strong>"Share System Audio"</strong> in the browser popup when prompted.
        </div>
      </div>
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
        🖥️ Great for online lectures — your browser will ask you to select the tab or window to capture audio from.
      </div>
    </div>
  );
}

function NotesSection3() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-green-500/10">
          <BrainCircuit className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Creating Quizzes</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        UniTracker can generate quizzes from your notes to help you study. You can create them from a single note or an entire subject.
      </p>
      <div className="grid gap-3">
        <div className="rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">From a single note</p>
          <p className="text-xs text-green-600 dark:text-green-300">Open any note and click <strong>Quiz Me!</strong> to generate a quiz from just that note's content.</p>
        </div>
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-3">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">From a complete subject</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-300">In the Notes tab, click <strong>Quiz Me!</strong> next to a course code to generate a quiz from all notes in that subject.</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] bg-gray-50 dark:bg-[#1A1A1A] p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Quiz format</p>
        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" /> Multiple choice questions</div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" /> Short answer questions with AI marking</div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" /> Score tracking & quiz history</div>
        </div>
      </div>
    </div>
  );
}

const SLIDES: Slide[] = [
  // Account (section 0)
  { section: 0, title: "Your Profile", content: <AccountSection0 /> },
  { section: 0, title: "Canvas API Key", content: <AccountSection1 /> },
  { section: 0, title: "Google API Key", content: <AccountSection2 /> },
  { section: 0, title: "Change Password", content: <AccountSection3 /> },
  // Uni (section 1)
  { section: 1, title: "Syncing & Adding Data", content: <UniSection0 /> },
  { section: 1, title: "Past & Upcoming Assignments", content: <UniSection1 /> },
  { section: 1, title: "GPA Overview", content: <UniSection2 /> },
  // Calendar (section 2)
  { section: 2, title: "Notes vs Assignments", content: <CalSection0 /> },
  { section: 2, title: "Event Popups", content: <CalSection1 /> },
  { section: 2, title: "Day View", content: <CalSection2 /> },
  // Notes (section 3)
  { section: 3, title: "Uploading Lectures", content: <NotesSection0 /> },
  { section: 3, title: "Microphone Recording", content: <NotesSection1 /> },
  { section: 3, title: "System Audio Recording", content: <NotesSection2 /> },
  { section: 3, title: "Creating Quizzes", content: <NotesSection3 /> },
];

// For each section, what slide indices belong to it
const SECTION_SLIDE_INDICES: number[][] = SECTION_LABELS.map((_, sectionIdx) =>
  SLIDES.map((s, i) => ({ ...s, i })).filter((s) => s.section === sectionIdx).map((s) => s.i)
);

interface Props {
  onClose: () => void;
}

export default function GettingStartedGuide({ onClose }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [seenSlides, setSeenSlides] = useState<Set<number>>(new Set([0]));
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  function goToSlide(idx: number) {
    setCurrentSlide(idx);
    setSeenSlides((prev) => new Set([...prev, idx]));
  }

  function next() {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  }

  function handleClose() {
    try {
      localStorage.setItem("has_seen_guide", "true");
    } catch {}
    onClose();
  }

  if (typeof document === "undefined") return null;

  const slide = SLIDES[currentSlide];
  const currentSection = slide.section;
  const sectionIcon = SECTION_ICONS[currentSection];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0F0F12] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F1F23] flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-[#1F1F23] shrink-0">
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-0.5">Getting Started</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome to UniTracker 🎓</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            title="Skip guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-1">
            {SECTION_LABELS.map((label, sIdx) => {
              const SIcon = SECTION_ICONS[sIdx];
              const isActive = sIdx === currentSection;
              return (
                <button
                  key={sIdx}
                  onClick={() => goToSlide(SECTION_SLIDE_INDICES[sIdx][0])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <SIcon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {slide.content}
        </div>

        {/* Footer: dots + buttons */}
        <div className="px-6 pb-5 pt-4 border-t border-gray-100 dark:border-[#1F1F23] shrink-0">
          {/* Section dot groups */}
          <div className="flex items-start justify-center gap-6 mb-4">
            {SECTION_LABELS.map((label, sIdx) => {
              const sectionSlides = SECTION_SLIDE_INDICES[sIdx];
              return (
                <div key={sIdx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                    {label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {sectionSlides.map((slideIdx) => {
                      const isSeen = seenSlides.has(slideIdx);
                      const isCurrent = slideIdx === currentSlide;
                      const slideTitle = SLIDES[slideIdx].title;
                      return (
                        <div key={slideIdx} className="relative">
                          <button
                            onClick={() => goToSlide(slideIdx)}
                            onMouseEnter={() => setTooltipIdx(slideIdx)}
                            onMouseLeave={() => setTooltipIdx(null)}
                            title={slideTitle}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border ${
                              isCurrent
                                ? "bg-indigo-500 border-indigo-500 scale-125"
                                : isSeen
                                ? "bg-indigo-400 dark:bg-indigo-600 border-indigo-400 dark:border-indigo-600"
                                : "bg-transparent border-gray-300 dark:border-gray-600"
                            }`}
                          />
                          {tooltipIdx === slideIdx && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md whitespace-nowrap shadow-lg pointer-events-none z-10">
                              {slideTitle}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={next}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20"
            >
              {currentSlide < SLIDES.length - 1 ? (
                <>Next <ChevronRight className="w-4 h-4" /></>
              ) : (
                "Finish ✓"
              )}
            </button>
            <button
              onClick={handleClose}
              className="rounded-xl border border-gray-200 dark:border-[#1F1F23] px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Skip All
            </button>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              {currentSlide + 1} / {SLIDES.length}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
