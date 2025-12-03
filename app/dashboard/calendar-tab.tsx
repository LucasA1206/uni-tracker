"use client";

import { useEffect, useState } from "react";
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

export default function CalendarTab() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  async function refresh() {
    try {
      const res = await fetch("/api/calendar/events");
      const data = res.ok ? await res.json().catch(() => ({ events: [] })) : { events: [] };
      setEvents(data.events ?? []);
    } catch (err) {
      console.error("Failed to refresh calendar events", err);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch {
        // ignore initial load errors
      }
    })();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Calendar</h2>
          <p className="text-xs text-slate-400">
            Shows uni assignment due dates, note creation dates, work task deadlines, and Outlook/Canvas events.
          </p>
        </div>
        <a
          href="/api/integrations/microsoft/login"
          className="rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-100 hover:bg-slate-800"
        >
          Connect Outlook
        </a>
      </div>
      <div className="rounded-lg bg-slate-900/60 p-3">
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Calendar</h3>
        <FullScreenCalendar
          data={(() => {
            const byDay: Record<string, { day: Date; events: { id: number; name: string; time: string; datetime: string; type?: string; meta?: Record<string, unknown> }[] }> = {};
            for (let i = 0; i < events.length; i++) {
              const e = events[i];
              const d = new Date(e.start);
              const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
              if (!byDay[key]) byDay[key] = { day: new Date(d.getFullYear(), d.getMonth(), d.getDate()), events: [] };
              const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              byDay[key].events.push({ id: i + 1, name: e.title, time: timeStr, datetime: e.start, type: e.type, meta: e.meta });
            }
            return Object.values(byDay);
          })()}
        />
      </div>
    </div>
  );
}
