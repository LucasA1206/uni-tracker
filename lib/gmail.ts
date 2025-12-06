import { prisma } from "@/lib/prisma";

const clientId = process.env.GMAIL_CLIENT_ID ?? "";
const clientSecret = process.env.GMAIL_CLIENT_SECRET ?? "";

export type GmailEmail = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  preview?: string;
};

async function refreshGmailAccessToken(userId: number) {
  const record = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!record) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: record.refreshToken,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  const updated = await prisma.gmailToken.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? record.refreshToken,
      expiresAt,
    },
  });

  return updated;
}

async function ensureGmailAccessToken(userId: number) {
  let record = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!record || !record.accessToken) return null;

  const now = Date.now();
  if (record.expiresAt.getTime() - now < 60_000) {
    // Try to refresh if expiring within 60 seconds
    const refreshed = await refreshGmailAccessToken(userId);
    if (!refreshed) return null;
    record = refreshed;
  }

  return record;
}

export async function getGmailEmailsForUser(userId: number): Promise<GmailEmail[]> {
  const record = await ensureGmailAccessToken(userId);
  if (!record) return [];

  // Get list of messages
  const messagesRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=is:inbox",
    {
      headers: {
        Authorization: `Bearer ${record.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!messagesRes.ok) {
    return [];
  }

  const messagesData = (await messagesRes.json()) as {
    messages?: Array<{ id: string }>;
  };

  const messageIds = messagesData.messages?.map((m) => m.id) ?? [];
  if (messageIds.length === 0) return [];

  // Fetch details for each message
  const emailPromises = messageIds.slice(0, 50).map(async (messageId) => {
    try {
      const messageRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: {
            Authorization: `Bearer ${record.accessToken}`,
            Accept: "application/json",
          },
        },
      );

      if (!messageRes.ok) return null;

      const message = (await messageRes.json()) as {
        id: string;
        snippet?: string;
        payload?: {
          headers?: Array<{
            name: string;
            value: string;
          }>;
        };
        internalDate?: string;
      };

      const headers = message.payload?.headers ?? [];
      const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(no subject)";
      const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "(unknown)";
      const dateHeader = headers.find((h) => h.name.toLowerCase() === "date")?.value;
      
      // Parse date from header or use internalDate
      let receivedAt = message.internalDate || "";
      if (dateHeader) {
        try {
          const parsedDate = new Date(dateHeader);
          if (!isNaN(parsedDate.getTime())) {
            receivedAt = parsedDate.toISOString();
          }
        } catch {
          // Use internalDate if parsing fails
        }
      }

      return {
        id: message.id,
        subject,
        from: from.replace(/<[^>]+>/g, "").trim(), // Remove email brackets, keep name
        receivedAt,
        preview: message.snippet || undefined,
      };
    } catch {
      return null;
    }
  });

  const emails = await Promise.all(emailPromises);
  return emails.filter((e): e is GmailEmail => e !== null);
}

