"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";

type Tab = "Uni" | "Calendar" | "Finance" | "Notes and Quizzes";

interface ShellProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onOpenAccount: () => void;
  children: React.ReactNode;
}

export default function Shell({ tab, onTabChange, onOpenAccount, children }: ShellProps) {
  return (
    <div className="relative min-h-screen text-gray-900 dark:text-zinc-100 selection:bg-indigo-500/30">
      {/* Background layer: Animated Grid + Radial gradient */}
      <div className="fixed inset-0 z-[-1] bg-white dark:bg-[#030303] overflow-hidden">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.1}
          duration={3}
          repeatDelay={1}
          className={cn(
            "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
            "inset-y-[-30%] h-[200%] skew-y-12",
          )}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"></div>
      </div>

      <div className="flex min-h-screen">
        <Sidebar active={tab} onChange={onTabChange} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar onOpenAccount={onOpenAccount} />
          <main className="flex-1 p-4 md:p-8 xl:p-10 overflow-y-auto">
            <div className="grid gap-6 mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

