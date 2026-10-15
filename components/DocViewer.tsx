"use client";

import React from "react";
import PDFViewer, { PDFDocument } from "@/components/PDFViewer";

interface DocViewerProps {
    docs: PDFDocument[];
    onDelete?: (doc: PDFDocument) => void;
    height?: number | string;
    className?: string;
}

export default function CustomDocViewer({ docs, onDelete, height = 500, className }: DocViewerProps) {
    if (!docs || docs.length === 0) return null;

    return (
        <PDFViewer
            docs={docs}
            onDelete={onDelete}
            height={height}
            className={className}
        />
    );
}
