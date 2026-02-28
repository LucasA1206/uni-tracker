"use client";

import dynamic from "next/dynamic";
import styled from "styled-components";
import { Loader2 } from "lucide-react";

const DocViewer = dynamic(() => import("@cyntler/react-doc-viewer"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-12 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading document viewer...</span>
        </div>
    ),
});

// We need to import renderers for PPTX, DOCX etc.
// Since we are loading DocViewer dynamically, we should probably pass the renderers when it loads or just try importing them.
// Note: @cyntler/react-doc-viewer exports DocViewerRenderers
import { DocViewerRenderers } from "@cyntler/react-doc-viewer";


const Container = styled.div`
  width: 100%;
  height: 500px;
  overflow: hidden;
  border-radius: 12px;
  background-color: #f3f4f6;

  .react-doc-viewer-style {
    background: transparent !important;
  }
  
  #header-bar {
    background-color: #ffffff !important;
    border-bottom: 1px solid rgba(0,0,0,0.1);
  }

  /* Style the navigation buttons */
  #header-bar button {
    background-color: white !important;
    color: #4f46e5 !important; /* Indigo-600 - Matches app theme */
    border: 1px solid #e5e7eb !important;
    border-radius: 6px !important;
    margin: 0 4px;
    transition: all 0.2s;
  }

  #header-bar button:hover {
    background-color: #f9fafb !important;
    border-color: #4f46e5 !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  
  /* Ensure icons (svg) inside buttons are the correct color */
  #header-bar button svg {
    fill: #4f46e5 !important;
    stroke: #4f46e5 !important;
  }
`;

interface DocViewerProps {
    docs: { uri: string; fileType?: string; fileName?: string }[];
}

export default function CustomDocViewer({ docs }: DocViewerProps) {
    if (!docs || docs.length === 0) return null;

    return (
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-gray-50 dark:bg-[#0F0F12]">
            <Container>
                <DocViewer
                    documents={docs}
                    pluginRenderers={DocViewerRenderers}
                    style={{ height: 500 }}
                    config={{
                        header: {
                            disableHeader: false,
                            disableFileName: false,
                            retainURLParams: false,
                        },
                        pdfVerticalScrollByDefault: true, // Ensures scrolling behavior
                        pdfZoom: {
                            defaultZoom: 1.1,
                            zoomJump: 0.1,
                        },
                    }}
                    theme={{
                        primary: "#ffffff", // White background for header/controls
                        secondary: "#4f46e5", // Indigo accent
                        tertiary: "#e0e7ff", // Light indigo hover
                        textPrimary: "#1f2937", // Gray-800
                        textSecondary: "#4b5563", // Gray-600
                        textTertiary: "#9ca3af", // Gray-400
                        disableThemeScrollbar: false,
                    }}
                />
            </Container>
        </div>
    );
}
