"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    ExternalLink, 
    Download, 
    Trash2, 
    FileText,
    Maximize2,
    Minimize2,
    GripHorizontal,
    ChevronsUpDown
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

    // Dynamic height resize state
    const parsedDefaultHeight = typeof height === "number" ? height : parseInt(String(height), 10) || 540;
    const [viewerHeight, setViewerHeight] = useState<number>(parsedDefaultHeight);
    const [isDragging, setIsDragging] = useState(false);

    const dragStartYRef = useRef(0);
    const dragStartHeightRef = useRef(parsedDefaultHeight);
    const viewerHeightRef = useRef(parsedDefaultHeight);

    // Sync ref when viewerHeight changes
    useEffect(() => {
        viewerHeightRef.current = viewerHeight;
    }, [viewerHeight]);

    // Update if parent height prop changes
    useEffect(() => {
        setViewerHeight(parsedDefaultHeight);
        viewerHeightRef.current = parsedDefaultHeight;
    }, [parsedDefaultHeight]);

    // Pointer events for drag resizing
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only accept primary button (left mouse) or touch
        if (e.button !== 0 && e.pointerType === "mouse") return;
        
        e.preventDefault();
        e.stopPropagation();

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // ignore if not supported
        }

        setIsDragging(true);
        dragStartYRef.current = e.clientY;
        dragStartHeightRef.current = viewerHeightRef.current;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        e.preventDefault();
        const deltaY = e.clientY - dragStartYRef.current;
        const newHeight = Math.max(260, Math.min(1400, Math.round(dragStartHeightRef.current + deltaY)));
        setViewerHeight(newHeight);
        viewerHeightRef.current = newHeight;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            setIsDragging(false);
            try {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                }
            } catch {
                // ignore
            }
        }
    };

    // Global window listeners as guarantee if cursor leaves handle during fast dragging
    useEffect(() => {
        if (!isDragging) return;

        const prevUserSelect = document.body.style.userSelect;
        const prevCursor = document.body.style.cursor;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "ns-resize";

        const onWindowPointerMove = (e: PointerEvent) => {
            const deltaY = e.clientY - dragStartYRef.current;
            const newHeight = Math.max(260, Math.min(1400, Math.round(dragStartHeightRef.current + deltaY)));
            setViewerHeight(newHeight);
            viewerHeightRef.current = newHeight;
        };

        const onWindowPointerUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("pointermove", onWindowPointerMove);
        window.addEventListener("pointerup", onWindowPointerUp);
        window.addEventListener("pointercancel", onWindowPointerUp);

        return () => {
            document.body.style.userSelect = prevUserSelect;
            document.body.style.cursor = prevCursor;
            window.removeEventListener("pointermove", onWindowPointerMove);
            window.removeEventListener("pointerup", onWindowPointerUp);
            window.removeEventListener("pointercancel", onWindowPointerUp);
        };
    }, [isDragging]);

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
                "rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0D] shadow-sm overflow-hidden flex flex-col",
                isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "w-full",
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

            {/* Document Render Area with strict height constraint (no flex-1 fighting it) */}
            <div 
                className={cn(
                    "relative w-full bg-gray-100 dark:bg-[#121216] overflow-hidden flex items-center justify-center p-2",
                    isFullscreen ? "flex-1" : ""
                )}
                style={{ 
                    height: isFullscreen ? "calc(100vh - 120px)" : `${viewerHeight}px`,
                    minHeight: isFullscreen ? "calc(100vh - 120px)" : `${viewerHeight}px`,
                }}
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
                        className={cn(
                            "w-full h-full border-0 rounded-xl bg-white shadow-inner",
                            isDragging ? "pointer-events-none select-none" : ""
                        )}
                        title={currentDoc.fileName || "PDF Viewer"}
                    />
                </div>
            </div>

            {/* Height Resize Handle Bar */}
            {!isFullscreen && (
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onDoubleClick={() => setViewerHeight(parsedDefaultHeight)}
                    className={cn(
                        "group relative w-full h-7 bg-gray-100/90 dark:bg-zinc-900/90 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between px-3 cursor-ns-resize select-none hover:bg-indigo-50/70 dark:hover:bg-zinc-800 transition-colors shrink-0 touch-none",
                        isDragging ? "bg-indigo-100/90 dark:bg-indigo-950/80 ring-1 ring-indigo-500/40" : ""
                    )}
                    title="Drag up/down to resize height • Double-click to reset"
                >
                    {/* Left: Quick Height Preset Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setViewerHeight(380); }}
                            className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                                viewerHeight === 380 
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold" 
                                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Compact
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setViewerHeight(parsedDefaultHeight); }}
                            className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                                viewerHeight === parsedDefaultHeight 
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold" 
                                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Default
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setViewerHeight(780); }}
                            className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                                viewerHeight === 780 
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold" 
                                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Tall
                        </button>
                    </div>

                    {/* Center: Drag Pill Handle */}
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pointer-events-none">
                        <ChevronsUpDown className="w-3.5 h-3.5" />
                        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-zinc-700 group-hover:bg-indigo-400 transition-colors" />
                    </div>

                    {/* Right: Height Readout & Reset Tooltip */}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                        <span className="font-semibold">{Math.round(viewerHeight)}px</span>
                        {viewerHeight !== parsedDefaultHeight && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setViewerHeight(parsedDefaultHeight); }}
                                className="text-[10px] text-indigo-500 hover:underline font-sans cursor-pointer"
                                title="Reset to default height"
                            >
                                (reset)
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
