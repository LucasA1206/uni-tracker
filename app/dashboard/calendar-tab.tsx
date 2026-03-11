"use client";

import { useEffect, useState, useCallback } from "react";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  meta?: any;
}

export default function CalendarTab() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/events");
      const data = res.ok ? await res.json().catch(() => ({ events: [] })) : { events: [] };
      setEvents(data.events ?? []);
    } catch (err) {
      console.error("Failed to refresh calendar events", err);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Calendar</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Shows uni assignment due dates, note creation dates, work task deadlines, and Outlook/Canvas events.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/oauth-consent?provider=gmail"
            className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-3 py-1 text-[11px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Connect Gmail
          </a>
          <a
            href="/oauth-consent?provider=outlook"
            className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-3 py-1 text-[11px] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Connect Outlook
          </a>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 text-gray-900 dark:text-white">
        <FullScreenCalendar
          events={events}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
