import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.GMAIL_CLIENT_ID || "";
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || "";
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "";

  // Validate environment variables
  if (!clientId || !clientSecret || !redirectUri) {
    const missing = [];
    if (!clientId) missing.push("GMAIL_CLIENT_ID");
    if (!clientSecret) missing.push("GMAIL_CLIENT_SECRET");
    if (!redirectUri) missing.push("GMAIL_REDIRECT_URI");
    
    return NextResponse.json(
      { 
        error: "Gmail integration not configured",
        message: `Missing environment variables: ${missing.join(", ")}`,
        details: "Please set all Gmail environment variables in your .env file"
      },
      { status: 500 }
    );
  }

  // Build the redirect URI (handle both absolute and relative)
  const baseUrl = new URL(req.url).origin;
  const finalRedirectUri = redirectUri.startsWith("http") 
    ? redirectUri 
    : `${baseUrl}${redirectUri}`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: finalRedirectUri,
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    return NextResponse.json({ error: "Token exchange failed", body }, { status: 400 });
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Get user's email address
  let userEmail: string | null = null;
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { email?: string };
      userEmail = profile.email || null;
    }
  } catch {
    // Continue without email
  }

  await prisma.gmailToken.upsert({
    where: { userId: user.userId },
    create: {
      userId: user.userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      email: userEmail,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      email: userEmail,
    },
  });

  return NextResponse.redirect(new URL("/dashboard?connected=gmail", req.url));
}

