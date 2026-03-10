"use client";

import React from "react";
import { GraduationCap, Briefcase, CalendarDays, Wallet, Notebook, Orbit } from "lucide-react";

type Tab = "Uni" | "Work" | "Calendar" | "Finance" | "Notes";

interface SidebarProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

const items: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "Uni", label: "Uni", icon: GraduationCap },
  { key: "Work", label: "Work", icon: Briefcase },
  { key: "Calendar", label: "Calendar", icon: CalendarDays },
  { key: "Finance", label: "Finance", icon: Wallet },
  { key: "Notes", label: "Notes", icon: Notebook },
];

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="w-64 xl:w-72 shrink-0 border-r border-black/5 dark:border-white/[0.08] bg-white/40 dark:bg-[#030303]/60 backdrop-blur-3xl flex flex-col relative z-20">
      <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent dark:from-indigo-500/5 pointer-events-none"></div>

      <div className="h-24 flex items-center px-8 relative z-10 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
            <Orbit className="h-5 w-5 text-white" />
          </div>
          <div className="text-gray-900 dark:text-white font-bold tracking-tight text-xl">
            UniTracker
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2 flex-1 relative z-10 mt-4">
        {items.map(({ key, label, icon: Icon }) => {
          const selected = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`group relative flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm transition-all duration-300 ${selected
                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] border border-indigo-500/10"
                  : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent"
                }`}
            >
              <Icon
                className={`h-5 w-5 transition-all duration-300 ${selected ? "scale-110 drop-shadow-sm" : "group-hover:scale-110 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
                  }`}
              />
              <span className={`font-medium ${selected ? "tracking-wide" : ""}`}>{label}</span>

              {selected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 mt-auto relative z-10">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mb-6"></div>
        <a
          href="/privacy-policy"
          className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          Privacy Policy
        </a>
      </div>
    </aside>
  );
}

