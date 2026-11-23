import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.MS_CLIENT_ID || "";
  const redirectUri = process.env.MS_REDIRECT_URI || "";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Microsoft integration not configured" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(32).toString("hex");

  const baseUrl = new URL(req.url).origin;
  const finalRedirectUri = redirectUri.startsWith("http")
    ? redirectUri
    : `${baseUrl}${redirectUri}`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: finalRedirectUri,
    response_mode: "query",
    scope: "offline_access Calendars.Read Mail.Read",
    state,
  });

  const tenant = process.env.MS_TENANT_ID || "common";
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;

  const response = NextResponse.redirect(url);
  response.cookies.set("oauth_state_ms", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
