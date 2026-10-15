"use client";

import React, { useState } from "react";
import { 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    ExternalLink, 
    Download, 
    Trash2, 
    FileText,
    Maximize2,
    Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PDFDocument {
    id?: number | string;
    uri: string;
    fileName?: string;
    fileType?: string;
    size?: number;
}

interface PDFViewerProps {
    docs: PDFDocument[];
    activeDocIndex?: number;
    onActiveDocChange?: (index: number) => void;
    onDelete?: (doc: PDFDocument) => void;
    height?: number | string;
    className?: string;
}

export default function PDFViewer({
    docs,
    activeDocIndex = 0,
    onActiveDocChange,
    onDelete,
    height = 540,
    className,
}: PDFViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(activeDocIndex);
    const [zoom, setZoom] = useState(100);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Sync with parent controlled index if provided
    const activeIndex = onActiveDocChange !== undefined ? activeDocIndex : currentIndex;
    const currentDoc = docs && docs.length > 0 ? docs[activeIndex] || docs[0] : null;

    const handleSelectDoc = (index: number) => {
        setCurrentIndex(index);
        onActiveDocChange?.(index);
        setZoom(100);
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 20, 250));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 20, 50));
    };

    const handleResetZoom = () => {
        setZoom(100);
    };

    if (!docs || docs.length === 0 || !currentDoc) {
        return null;
    }

    const formatBytes = (bytes?: number) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Build the iframe URL with toolbar and initial zoom hints
    const pdfUrlWithParams = currentDoc.uri.includes("#")
        ? currentDoc.uri
        : `${currentDoc.uri}#toolbar=1&navpanes=0&zoom=${zoom}`;

    return (
        <div
            className={cn(
                "rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0D] shadow-sm overflow-hidden flex flex-col transition-all",
                isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "",
                className
            )}
        >
            {/* Document Tabs if more than 1 PDF */}
            {docs.length > 1 && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100/90 dark:bg-zinc-900/90 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-thin">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mr-1 shrink-0">
                        Documents ({docs.length}):
                    </span>
                    {docs.map((doc, idx) => (
                        <button
                            key={doc.id ?? idx}
                            type="button"
                            onClick={() => handleSelectDoc(idx)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                                idx === activeIndex
                                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-gray-200 dark:border-zinc-700"
                                    : "text-gray-600 dark:text-zinc-400 hover:bg-gray-200/60 dark:hover:bg-zinc-800/50"
                            )}
                        >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="max-w-[160px] truncate">{doc.fileName || `Document ${idx + 1}`}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Viewer Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-zinc-900/60 border-b border-gray-200 dark:border-zinc-800 gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate max-w-[220px] sm:max-w-[360px]" title={currentDoc.fileName}>
                            {currentDoc.fileName || "Document.pdf"}
                        </div>
                        {currentDoc.size ? (
                            <div className="text-[10px] text-gray-400 dark:text-zinc-500">
                                {formatBytes(currentDoc.size)}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Zoom & Action Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center bg-gray-200/80 dark:bg-zinc-800 rounded-lg p-0.5 border border-gray-300/60 dark:border-zinc-700">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            title="Zoom Out"
                            className="p-1 rounded text-gray-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
                            disabled={zoom <= 50}
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleResetZoom}
                            title="Reset Zoom (100%)"
                            className="px-2 py-0.5 text-[11px] font-bold text-gray-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 min-w-[42px] text-center"
                        >
                            {zoom}%
                        </button>
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            title="Zoom In"
                            className="p-1 rounded text-gray-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
                            disabled={zoom >= 250}
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleResetZoom}
                            title="Reset Zoom"
                            className="p-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>

                    <a
                        href={currentDoc.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Open PDF in new tab"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <a
                        href={currentDoc.uri}
                        download={currentDoc.fileName || "document.pdf"}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Download PDF"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                        type="button"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>

                    {onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(currentDoc)}
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Delete this PDF"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Document Render Area */}
            <div 
                className="relative flex-1 bg-gray-100 dark:bg-[#121216] overflow-auto scrollbar-theme flex items-center justify-center p-2"
                style={{ height: isFullscreen ? "calc(100vh - 120px)" : (typeof height === "number" ? `${height}px` : height) }}
            >
                <div 
                    className="w-full h-full transition-transform duration-200 ease-out origin-top flex items-center justify-center"
                    style={{
                        transform: zoom !== 100 ? `scale(${zoom / 100})` : "none",
                        width: zoom > 100 ? `${zoom}%` : "100%",
                        height: zoom > 100 ? `${zoom}%` : "100%",
                    }}
                >
                    <iframe
                        key={`${currentDoc.uri}-${zoom}`}
                        src={pdfUrlWithParams}
                        className="w-full h-full border-0 rounded-xl bg-white shadow-inner"
                        title={currentDoc.fileName || "PDF Viewer"}
                    />
                </div>
            </div>
        </div>
    );
}
