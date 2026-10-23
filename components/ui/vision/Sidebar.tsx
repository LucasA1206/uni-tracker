"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, CalendarDays, Wallet, Notebook, Orbit, Menu, Shield } from "lucide-react";
import { useAudioRecording } from "@/contexts/AudioRecordingContext";

type Tab = "Uni" | "Calendar" | "Finance" | "Notes and Quizzes";

interface SidebarProps {
  active: Tab;
  onChange: (t: Tab) => void;
  isNative?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const items: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "Uni", label: "Uni", icon: GraduationCap },
  { key: "Calendar", label: "Calendar", icon: CalendarDays },
  { key: "Finance", label: "Finance", icon: Wallet },
  { key: "Notes and Quizzes", label: "Notes and Quizzes", icon: Notebook },
];

export default function Sidebar({
  active,
  onChange,
  isNative,
  isOpen,
  onClose,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Default state is expanded (false)
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const { isRecording } = useAudioRecording();

  // Load persisted collapse preference (default expanded)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setInternalCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("sidebar_collapsed", String(next));
        } catch {}
        return next;
      });
    }
  };

  const visibleItems = items.filter(i => isNative ? i.key !== "Finance" : true);

  if (isNative && !isOpen) return null;

  return (
    <aside
      className={
        isNative
          ? "fixed inset-0 z-50 bg-white dark:bg-[#030303] flex flex-col"
          : `${isCollapsed ? "w-20" : "w-64 xl:w-72"} shrink-0 border-r border-black/5 dark:border-white/[0.08] bg-white/40 dark:bg-[#030303]/60 backdrop-blur-3xl flex flex-col relative z-20 transition-[width] duration-300 ease-in-out`
      }
    >
      <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent dark:from-indigo-500/5 pointer-events-none"></div>

      {/* Header */}
      <div className={`h-24 flex items-center relative z-10 pt-4 ${isCollapsed ? "justify-center px-2" : "justify-between px-6"}`}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={handleToggle}
            className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-all hover:scale-105"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
                <Orbit className="h-5 w-5 text-white" />
              </div>
              <div className="text-gray-900 dark:text-white font-bold tracking-tight text-xl truncate">
                UniTracker
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isNative && (
                <button
                  type="button"
                  onClick={handleToggle}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              {isNative && (
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <span className="sr-only">Close</span>✕
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav className={`space-y-2 flex-1 relative z-10 mt-4 ${isCollapsed ? "px-2" : "p-4"}`}>
        {visibleItems.map(({ key, label, icon: Icon }) => {
          const selected = key === active;
          const isNotesTab = key === "Notes and Quizzes";

          return (
            <button
              key={key}
              id={`step-${key.toLowerCase().replace(/\s+/g, '-')}-tab`}
              type="button"
              onClick={() => onChange(key)}
              title={isCollapsed ? (isNotesTab && isRecording ? `${label} (Recording in progress)` : label) : undefined}
              className={`group relative flex w-full items-center rounded-xl py-3 text-sm transition-all duration-300 ${
                isCollapsed ? "justify-center px-0" : "gap-4 px-4"
              } ${
                selected
                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] border border-indigo-500/10"
                  : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent"
              }`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <Icon
                  className={`h-5 w-5 transition-all duration-300 ${
                    selected ? "scale-110 drop-shadow-sm text-indigo-600 dark:text-indigo-400" : "group-hover:scale-110 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
                  }`}
                />
                {/* Blinking red dot when sidebar is REDUCED/COLLAPSED on the Notebook icon */}
                {isCollapsed && isNotesTab && isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
                  </span>
                )}
              </div>

              {/* Label & Blinking red dot when sidebar is EXPANDED */}
              {!isCollapsed && (
                <>
                  <span className={`font-medium truncate ${selected ? "tracking-wide text-indigo-700 dark:text-indigo-300" : ""}`}>
                    {label}
                  </span>

                  {isNotesTab && isRecording && (
                    <span
                      className="relative flex h-2.5 w-2.5 ml-auto shrink-0"
                      title="Lecture recording in progress"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
                    </span>
                  )}
                </>
              )}

              {selected && (
                <div
                  className={`absolute left-0 top-1/2 -translate-y-1/2 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)] ${
                    isCollapsed ? "w-1 h-6" : "w-1 h-1/2"
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`mt-auto relative z-10 ${isCollapsed ? "p-3 flex justify-center" : "p-6"}`}>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mb-4"></div>
        {isCollapsed ? (
          <a
            href="/privacy-policy"
            title="Privacy Policy"
            className="p-2 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Shield className="h-4 w-4" />
          </a>
        ) : (
          <a
            href="/privacy-policy"
            className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Privacy Policy
          </a>
        )}
      </div>
    </aside>
  );
}
