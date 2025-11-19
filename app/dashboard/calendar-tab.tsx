"use client";

import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enAU from "date-fns/locale/en-AU";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-AU": enAU,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date()),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
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
      <p className="text-xs text-slate-400">
        Shows uni assignment due dates, note creation dates, work task deadlines, and (later) Outlook/Canvas
        events.
      </p>
      <div className="h-[550px] rounded-lg bg-slate-900/60 p-2 text-xs">
        <Calendar
          localizer={localizer}
          events={events.map((e) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }))}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
