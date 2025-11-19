import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: process.env.MS_REDIRECT_URI || "",
    response_mode: "query",
    scope: "offline_access Calendars.Read Mail.Read",
  });

  const tenant = process.env.MS_TENANT_ID || "common";
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;

  return NextResponse.redirect(url);
}
