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

const Container = styled.div`
  width: 100%;
  height: 500px; /* "Around half an A4 page size" - adjusting for screen but giving enough height */
  overflow: hidden;
  border-radius: 12px;
  background-color: #f3f4f6;
  
  /* Dark mode support usually easier via CSS variables or props, but styled-components 
     needs theme context or explicit colors. For simplicity we'll stick to a neutral 
     background that works for both or use passed-in classNames for the container div. 
  */

  .react-doc-viewer-style {
    background: transparent !important;
  }
  
  #header-bar {
    background-color: transparent !important;
    box-shadow: none !important;
    border-bottom: 1px solid rgba(0,0,0,0.1);
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
                    pluginRenderers={undefined} // Allows it to load default renderers including PDF and Office
                    style={{ height: 500 }}
                    config={{
                        header: {
                            disableHeader: false,
                            disableFileName: false,
                            retainURLParams: false,
                        },
                        pdfVerticalScrollByDefault: true,
                    }}
                    theme={{
                        primary: "#6366f1",
                        secondary: "#ffffff",
                        tertiary: "#4f46e5",
                        textPrimary: "#333333",
                        textSecondary: "#666666",
                        textTertiary: "#999999",
                        disableThemeScrollbar: false,
                    }}
                />
            </Container>
        </div>
    );
}
