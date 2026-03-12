"use client";

import React from "react";
import { User, Menu } from "lucide-react";

interface NavbarProps {
  onOpenAccount: () => void;
  isNative?: boolean;
  onToggleMenu?: () => void;
}

export default function Navbar({ onOpenAccount, isNative, onToggleMenu }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 pt-4 px-4 md:px-8 xl:px-10 pb-2">
      <div className="flex items-center justify-between h-16 px-6 rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white/60 dark:bg-[#09090b]/60 backdrop-blur-2xl shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          {isNative && (
            <button
              onClick={onToggleMenu}
              className="p-2 -ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="text-gray-900 dark:text-white text-lg font-semibold tracking-tight">
            Dashboard
          </div>
        </div>
        <button
          id="step-account-button"
          type="button"
          onClick={onOpenAccount}
          className="group relative flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent dark:border-white/[0.05] hover:border-black/10 dark:hover:border-white/[0.1] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/10 group-hover:to-cyan-500/10 dark:group-hover:from-indigo-400/10 dark:group-hover:to-cyan-400/10 transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
          <User className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 relative z-10" />
          <span className="relative z-10">Account</span>
        </button>
      </div>
    </header>
  );
}

