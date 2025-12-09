import { NextRequest, NextResponse } from "next/server";

// Google Search Console Verification Route
// This route serves the Google verification HTML file
// 
// INSTRUCTIONS:
// 1. Download the verification HTML file from Google Search Console
// 2. Copy the entire contents of that file
// 3. Replace the htmlContent variable below with the actual verification HTML
// 4. The file will be accessible at: /google-verification.html

export async function GET(req: NextRequest) {
  // REPLACE THIS WITH THE ACTUAL VERIFICATION HTML FROM GOOGLE SEARCH CONSOLE
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Google Site Verification</title>
  <!-- Replace the meta tag below with the one from your Google verification file -->
  <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" />
</head>
<body>
  <p>Google Site Verification</p>
  <p><strong>IMPORTANT:</strong> Replace this content with the actual verification HTML file downloaded from Google Search Console.</p>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

