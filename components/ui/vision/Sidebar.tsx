"use client";

import React from "react";
import { GraduationCap, Briefcase, CalendarDays } from "lucide-react";

type Tab = "Uni" | "Work" | "Calendar";

interface SidebarProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

const items: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "Uni", label: "Uni", icon: GraduationCap },
  { key: "Work", label: "Work", icon: Briefcase },
  { key: "Calendar", label: "Calendar", icon: CalendarDays },
];

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="w-60 shrink-0 bg-white/80 dark:bg-[#0D0F1A]/80 backdrop-blur border-r border-gray-200 dark:border-[#1F1F23]">
      <div className="h-24 bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 flex items-center justify-center">
        <div className="text-white font-bold tracking-wide">UNI TRACKER</div>
      </div>
      <nav className="p-3 space-y-1">
        {items.map(({ key, label, icon: Icon }) => {
          const selected = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                selected
                  ? "bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30"
                  : "hover:bg-gray-100 dark:hover:bg-[#141826]"
              }`}
            >
              <Icon className={`h-5 w-5 ${selected ? "text-indigo-600 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`} />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

