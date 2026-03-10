"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={`relative group rounded-3xl border border-black/5 dark:border-white/[0.08] bg-white/60 dark:bg-black/20 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)] ${className ?? ""}`}>
      {/* Subtle top edge glow */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent dark:via-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* Optional: Radial glow that follows hover (using CSS hover state for simplicity instead of cursor tracking coords) */}
      <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-b from-black/5 to-transparent dark:from-white/5"></div>

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
