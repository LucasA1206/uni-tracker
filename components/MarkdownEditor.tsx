"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

export default function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 text-xs">
      <textarea
        className="min-h-[120px] w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1 font-mono text-[11px] text-slate-100"
        placeholder="Write notes in Markdown (supports headings, lists, **bold**, _italic_, etc.)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="min-h-[120px] w-full rounded-md bg-slate-900 border border-slate-800 px-2 py-1 overflow-auto prose prose-invert max-w-none text-xs">
        {value ? <ReactMarkdown>{value}</ReactMarkdown> : <span className="text-slate-500">Preview</span>}
      </div>
    </div>
  );
}
