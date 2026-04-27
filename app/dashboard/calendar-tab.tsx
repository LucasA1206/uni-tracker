"use client";

import { useEffect, useState, useCallback } from "react";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";
import { BorderBeam } from "@/components/magicui/border-beam";
import { BlurFade } from "@/components/magicui/blur-fade";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  meta?: any;
}

interface CalendarTabProps {
  showMock?: boolean;
  autoOpenEventId?: string | null;
}

export default function CalendarTab({ showMock, autoOpenEventId }: CalendarTabProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/events");
      let apiData = res.ok ? await res.json().catch(() => ({ events: [] })) : { events: [] };
      let combinedEvents = apiData.events ?? [];

      if (showMock) {
        const mockEvents: CalendarEvent[] = [
          {
            id: "mock-note-1",
            title: "Example Note: AI Implementation Lecture",
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            type: "note",
            meta: {
              courseCode: "20001",
              courseName: "Cloud Computing",
              content: "# Lecture Note Snapshot\n\n- Exploring AWS Lambda and serverless architectures.\n- Benefits: Auto-scaling, pay-per-use.\n- Challenges: Cold starts, stateless nature."
            }
          },
          {
            id: "mock-assignment-1",
            title: "Example Assignment: Final Project",
            start: new Date(Date.now() + 86400000 * 3).toISOString(),
            end: new Date(Date.now() + 86400000 * 3).toISOString(),
            type: "assignment",
            meta: {
              courseCode: "01234",
              courseName: "System Design",
              weight: 0.25,
              maxGrade: 100,
              description: "Build a scalable microservices architecture using Go and Kafka."
            }
          }
        ];
        combinedEvents = [...combinedEvents, ...mockEvents];
      }
      setEvents(combinedEvents);
    } catch (err) {
      console.error("Failed to refresh calendar events", err);
    }
  }, [showMock]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <BlurFade delay={0.1} className="h-full">
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Calendar Hub</h2>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Interactive workspace for your assignment deadlines and course notes.
            </p>
          </div>
        </div>
        <div className="relative flex-1 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#0F0F12]/50 backdrop-blur-md p-4 bg-gray-50 dark:bg-[#0A0A0C] overflow-hidden">
          <BorderBeam size={400} duration={15} colorFrom="#06b6d4" colorTo="#3b82f6" />
          <FullScreenCalendar
            events={events}
            onRefresh={refresh}
            autoOpenEventId={autoOpenEventId}
          />
        </div>
      </div>
    </BlurFade>
  );
}
