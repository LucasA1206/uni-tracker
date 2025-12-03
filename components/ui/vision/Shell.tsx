"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

type Tab = "Uni" | "Work" | "Calendar";

interface ShellProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onOpenAccount: () => void;
  children: React.ReactNode;
}

export default function Shell({ tab, onTabChange, onOpenAccount, children }: ShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-[#0E1020] dark:to-[#121527] text-gray-900 dark:text-white">
      <div className="flex min-h-screen">
        <Sidebar active={tab} onChange={onTabChange} />
        <div className="flex-1 flex flex-col">
          <Navbar onOpenAccount={onOpenAccount} />
          <main className="p-6">
            <div className="grid gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

