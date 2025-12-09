"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";
import { format } from "date-fns";

// removed react-big-calendar in favor of FullScreenCalendar

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  meta?: Record<string, unknown>;
}

interface CalendarEventItem {
  id: number;
  name: string;
  time: string;
  datetime: string;
  type?: string;
  meta?: Record<string, unknown>;
}

interface DayData {
  day: Date;
  events: CalendarEventItem[];
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

  const calendarData = useMemo(() => {
    const byDay: Record<string, DayData> = {};
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const d = new Date(e.start);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      if (!byDay[key]) byDay[key] = { day: new Date(d.getFullYear(), d.getMonth(), d.getDate()), events: [] };
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      byDay[key].events.push({ id: i + 1, name: e.title, time: timeStr, datetime: e.start, type: e.type, meta: e.meta });
    }
    return Object.values(byDay);
  }, [events]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
          <p className="text-xs text-muted-foreground">
            Shows uni assignment due dates, note creation dates, work task deadlines, and Outlook/Canvas events.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/oauth-consent?provider=gmail"
            className="rounded-full border px-3 py-1 text-[11px] hover:bg-muted"
          >
            Connect Gmail
          </a>
          <a
            href="/oauth-consent?provider=outlook"
            className="rounded-full border px-3 py-1 text-[11px] hover:bg-muted"
          >
            Connect Outlook
          </a>
        </div>
      </div>
      <div className="rounded-lg border p-3 bg-card">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Calendar</h3>
        <FullScreenCalendar
          data={calendarData}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
