"use client";

import React from "react";
import { User } from "lucide-react";

interface NavbarProps {
  onOpenAccount: () => void;
}

export default function Navbar({ onOpenAccount }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/70 dark:bg-[#0D0F1A]/70 backdrop-blur border-b border-gray-200 dark:border-[#1F1F23]">
      <div className="h-20 bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400">
        <div className="h-full flex items-center justify-between px-6">
          <div className="text-white text-lg font-semibold">Dashboard</div>
          <button
            type="button"
            onClick={onOpenAccount}
            className="flex items-center gap-2 rounded-md bg-white/20 text-white px-3 py-1.5 text-sm hover:bg-white/30"
          >
            <User className="h-4 w-4" />
            <span>Account</span>
          </button>
        </div>
      </div>
    </header>
  );
}

