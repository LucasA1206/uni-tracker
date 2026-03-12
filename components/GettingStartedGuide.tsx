"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X, GraduationCap, CalendarDays, Notebook, UserCircle, Mic, Monitor, BrainCircuit, RefreshCw, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "Uni" | "Calendar" | "Finance" | "Notes and Quizzes";

interface Slide {
  section: number;
  title: string;
  content: React.ReactNode;
  selector?: string;
  requiredTab?: Tab;
}

const SECTION_LABELS = ["Account", "Uni", "Calendar", "Notes"];
const SECTION_ICONS = [UserCircle, GraduationCap, CalendarDays, Notebook];

function AccountSection0() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <UserCircle className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Profile</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Personalise your experience. Click the <span className="font-semibold text-indigo-500">account icon</span> to open your profile.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {["Name", "Email", "Username", "Theme"].map((label) => (
          <div key={label} className="rounded-lg border border-gray-100 dark:border-[#2A2A2E] bg-gray-50/50 dark:bg-[#1A1A1A] p-2 text-[10px]">
            <div className="font-semibold text-indigo-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountSection1() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <UserCircle className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Canvas API Key</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        UniTracker connects to <strong>Canvas</strong> to automatically sync your courses and assignments. Generate an API key from Settings.
      </p>
    </div>
  );
}

function UniSection0() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Syncing Data</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Click <strong>"Sync from Canvas"</strong> to automatically import your courses and assignments.
      </p>
    </div>
  );
}

function UniSection1() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assignments</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Stay on top of your work with Past, Upcoming, and Grade Overviews.
      </p>
    </div>
  );
}

function UniSection2() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">GPA Overview</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        View your academic performance across all sessions with dynamic charts.
      </p>
    </div>
  );
}

function CalSection0() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays className="w-5 h-5 text-cyan-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Calendar Hub</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        The calendar shows two types of events:
      </p>
      <div className="grid gap-2">
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">Notes:</span> Created date.
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="font-semibold text-amber-700 dark:text-amber-300">Assignments:</span> Due date.
        </div>
      </div>
      <div className="rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 p-2 text-[10px] text-indigo-700 dark:text-indigo-300">
        💡 Note: While in the guide, look at the example data in the calendar!
      </div>
    </div>
  );
}

function NotesSection0() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Notebook className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Notes</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Drag and drop your lecture recordings here to generate structured AI notes.
      </p>
    </div>
  );
}

function NotesSection1() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Mic className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recording</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Record directly from your Mic or System Audio for online lectures.
      </p>
    </div>
  );
}

const SLIDES: Slide[] = [
  { section: 0, title: "Your Profile", content: <AccountSection0 />, selector: "#step-account-modal" },
  { section: 0, title: "Canvas API Key", content: <AccountSection1 />, selector: "#step-account-modal" },
  { section: 1, title: "Syncing Data", content: <UniSection0 />, selector: "#step-sync-button", requiredTab: "Uni" },
  { section: 1, title: "Assignments Hub", content: <UniSection1 />, selector: "#step-assignment-modal", requiredTab: "Uni" },
  { section: 1, title: "GPA Overview", content: <UniSection2 />, selector: "#step-grade-overview", requiredTab: "Uni" },
  { section: 2, title: "Calendar Hub", content: <CalSection0 />, selector: ".fc", requiredTab: "Calendar" },
  { section: 3, title: "Uploading Lectures", content: <NotesSection0 />, selector: "#step-upload-zone", requiredTab: "Notes and Quizzes" },
  { section: 3, title: "Microphone Recording", content: <NotesSection1 />, selector: "#step-recorder-zone", requiredTab: "Notes and Quizzes" },
  { section: 3, title: "Interactive Notes", content: 
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <BrainCircuit className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reviewing Your Notes</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        AI-generated notes are structured with <strong>Markdown</strong>, key sections, and interactive components.
      </p>
    </div>, 
    selector: "#step-note-modal", 
    requiredTab: "Notes and Quizzes" 
  },
];

const SECTION_SLIDE_INDICES: number[][] = SECTION_LABELS.map((_, sectionIdx) =>
  SLIDES.map((s, i) => ({ ...s, i })).filter((s) => s.section === sectionIdx).map((s) => s.i)
);

interface Props {
  onClose: () => void;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenAccount?: (open: boolean) => void;
  onOpenAssignment?: (open: boolean) => void;
  onShowNoteDemo?: (show: boolean) => void;
}

export default function GettingStartedGuide({
  onClose,
  tab,
  onTabChange,
  onOpenAccount,
  onOpenAssignment,
  onShowNoteDemo,
}: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slide = SLIDES[currentSlide];

  // Update spotlight whenever slide or tab changes
  const updateSpotlight = () => {
    if (slide.selector) {
      const el = document.querySelector(slide.selector);
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
      } else {
        setSpotlightRect(null);
      }
    } else {
      setSpotlightRect(null);
    }
  };

  useEffect(() => {
    // Small delay to allow tab switching to render content
    const timeout = setTimeout(updateSpotlight, 300);
    window.addEventListener('resize', updateSpotlight);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateSpotlight);
    };
  }, [currentSlide, tab]);

  // Tab switching and Modal triggers
  useEffect(() => {
    if (slide.requiredTab && tab !== slide.requiredTab) {
      onTabChange(slide.requiredTab);
    }

    // Auto-open Account Modal
    if (currentSlide === 0 || currentSlide === 1) {
      onOpenAccount?.(true);
    } else {
      onOpenAccount?.(false);
    }

    // Auto-open Assignment Modal
    if (currentSlide === 3) {
      onOpenAssignment?.(true);
    } else {
      onOpenAssignment?.(false);
    }

    // Auto-show Note Demo (if applicable)
    if (currentSlide === 8) {
      onShowNoteDemo?.(true);
    } else {
      onShowNoteDemo?.(false);
    }
  }, [currentSlide]);

  function next() {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  }

  function prev() {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }

  function handleClose() {
    onClose();
  }

  const tooltipPosition = useMemo(() => {
    if (!spotlightRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const padding = 20;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Default to below the spotlight
    let top = spotlightRect.bottom + padding;
    let left = spotlightRect.left + (spotlightRect.width / 2) - 160;

    // If too close to bottom, show above
    if (top + 250 > windowHeight) {
      top = spotlightRect.top - 250 - padding;
    }

    // Keep within horizontal bounds
    left = Math.max(padding, Math.min(left, windowWidth - 320 - padding));

    return { top: `${top}px`, left: `${left}px` };
  }, [spotlightRect]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Blackout Overlay with Holes */}
      {/* Blur/Dim Overlay with Hole */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.x - 8}
                y={spotlightRect.y - 8}
                width={spotlightRect.width + 16}
                height={spotlightRect.height + 16}
                rx="12"
                fill="black"
                className="transition-all duration-300 ease-in-out"
              />
            )}
          </mask>
        </defs>
        <foreignObject x="0" y="0" width="100%" height="100%" mask="url(#spotlight-mask)" className="pointer-events-auto">
          <div className="w-full h-full backdrop-blur-[6px] bg-black/60 transition-opacity duration-500" />
        </foreignObject>
      </svg>

      {/* Pulse effect around spotlight */}
      {spotlightRect && (
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           key={`pulse-${currentSlide}`}
           style={{
             position: 'absolute',
             top: spotlightRect.y - 12,
             left: spotlightRect.x - 12,
             width: spotlightRect.width + 24,
             height: spotlightRect.height + 24,
             pointerEvents: 'none',
             border: '2px solid rgba(99, 102, 241, 0.5)',
             borderRadius: '16px',
           }}
           className="animate-pulse"
        />
      )}

      {/* Tooltip Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            ...tooltipPosition,
            width: '320px',
            position: 'absolute',
          }}
          className="bg-white dark:bg-[#0F0F12] rounded-2xl shadow-2xl border border-indigo-500/30 dark:border-indigo-500/50 pointer-events-auto flex flex-col p-5 z-[101]"
        >
          <div className="flex items-center justify-between mb-3">
             <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
               Step {currentSlide + 1} of {SLIDES.length}
             </span>
             <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
               <X className="w-4 h-4 text-gray-400" />
             </button>
          </div>

          <div className="mb-4">
             {slide.content}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
             <div className="flex gap-1.5">
               {currentSlide > 0 && (
                 <button
                   onClick={prev}
                   className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-500 transition-colors"
                 >
                   Back
                 </button>
               )}
               <button
                  onClick={handleClose}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
               >
                 Skip
               </button>
             </div>

             <button
               onClick={next}
               className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
             >
               {currentSlide === SLIDES.length - 1 ? "Start Using UniTracker ✓" : "Got it, next"}
               {currentSlide < SLIDES.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
             </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
