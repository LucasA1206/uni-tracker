import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.GMAIL_CLIENT_ID || "";
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "";

  // Validate environment variables
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { 
        error: "Gmail integration not configured",
        message: "Missing GMAIL_CLIENT_ID or GMAIL_REDIRECT_URI"
      },
      { status: 500 }
    );
  }

  // Generate cryptographically secure state parameter
  const state = crypto.randomBytes(32).toString("hex");

  // Build the OAuth URL
  const baseUrl = new URL(req.url).origin;
  const finalRedirectUri = redirectUri.startsWith("http") 
    ? redirectUri 
    : `${baseUrl}${redirectUri}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: finalRedirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent", // Force consent to get refresh token
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const response = NextResponse.redirect(url);
  response.cookies.set("oauth_state_gmail", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
