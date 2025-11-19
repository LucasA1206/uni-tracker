import { prisma } from "@/lib/prisma";

const tenant = process.env.MS_TENANT_ID || "common";
const clientId = process.env.MS_CLIENT_ID ?? "";
const clientSecret = process.env.MS_CLIENT_SECRET ?? "";

export type OutlookEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "outlook";
};

export type OutlookEmail = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  preview?: string;
};

async function refreshAccessToken(userId: number) {
  const record = await prisma.microsoftToken.findUnique({ where: { userId } });
  if (!record) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: record.refreshToken,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  const updated = await prisma.microsoftToken.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? record.refreshToken,
      expiresAt,
    },
  });

  return updated;
}

async function ensureMicrosoftAccessToken(userId: number) {
  let record = await prisma.microsoftToken.findUnique({ where: { userId } });
  if (!record || !record.accessToken) return null;

  const now = Date.now();
  if (record.expiresAt.getTime() - now < 60_000) {
    // Try to refresh if expiring within 60 seconds
    const refreshed = await refreshAccessToken(userId);
    if (!refreshed) return null;
    record = refreshed;
  }

  return record;
}

export async function getOutlookEventsForUser(userId: number): Promise<OutlookEvent[]> {
  const record = await ensureMicrosoftAccessToken(userId);
  if (!record) return [];

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events?$top=50", {
    headers: {
      Authorization: `Bearer ${record.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return [];
  }

  const json = (await res.json()) as {
    value?: Array<{
      id: string;
      subject?: string | null;
      start?: { dateTime?: string | null; date?: string | null } | null;
      end?: { dateTime?: string | null; date?: string | null } | null;
    }>;
  };
  const events = json.value ?? [];

  return events
    .filter((e) => e && (e.start?.dateTime || e.start?.date))
    .map((e) => {
      // Ensure start/end are always strings to satisfy the OutlookEvent type
      const start = (e.start?.dateTime ?? e.start?.date) ?? "";
      const end = (e.end?.dateTime ?? e.end?.date) ?? start;

      return {
        id: `outlook-${e.id}`,
        title: e.subject || "(no subject)",
        start,
        end,
        type: "outlook" as const,
      };
    });

export async function getOutlookEmailsForUser(userId: number): Promise<OutlookEmail[]> {
  const record = await ensureMicrosoftAccessToken(userId);
  if (!record) return [];

  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/messages?$top=50&$select=id,subject,receivedDateTime,from,bodyPreview&$orderby=receivedDateTime desc",
    {
      headers: {
        Authorization: `Bearer ${record.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    return [];
  }

  const json = (await res.json()) as {
    value?: Array<{
      id: string;
      subject?: string | null;
      receivedDateTime?: string | null;
      from?: { emailAddress?: { address?: string | null; name?: string | null } | null } | null;
      bodyPreview?: string | null;
    }>;
  };
  const messages = json.value ?? [];

  return messages
    .filter((m) => m.receivedDateTime && m.id)
    .map((m) => ({
      id: m.id,
      subject: m.subject || "(no subject)",
      from: m.from?.emailAddress?.address || m.from?.emailAddress?.name || "(unknown)",
      receivedAt: m.receivedDateTime!,
      preview: m.bodyPreview || undefined,
    }));
}
