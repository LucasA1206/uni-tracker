import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GMAIL_CLIENT_ID || "";
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "";

  // Validate environment variables
  if (!clientId || !redirectUri) {
    const missing = [];
    if (!clientId) missing.push("GMAIL_CLIENT_ID");
    if (!redirectUri) missing.push("GMAIL_REDIRECT_URI");
    
    return NextResponse.json(
      { 
        error: "Gmail integration not configured",
        message: `Missing environment variables: ${missing.join(", ")}`,
        details: "Please set GMAIL_CLIENT_ID and GMAIL_REDIRECT_URI in your .env file"
      },
      { status: 500 }
    );
  }

  // Build the OAuth URL
  const baseUrl = new URL(req.url).origin;
  const finalRedirectUri = redirectUri.startsWith("http") 
    ? redirectUri 
    : `${baseUrl}${redirectUri}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: finalRedirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent", // Force consent to get refresh token
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(url);
}

