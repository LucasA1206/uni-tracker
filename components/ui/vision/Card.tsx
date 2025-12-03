"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-[#2A2A2E] bg-white/90 dark:bg-[#1A1A1A]/90 shadow-sm ${className ?? ""}`}>{children}</div>
  );
}
