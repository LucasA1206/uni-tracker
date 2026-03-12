"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import ReactMarkdown from "react-markdown"
import { CheckSquare, FileText, Calendar as CalendarIcon, Briefcase } from "lucide-react"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const COURSE_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500"
];

interface ApiEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  meta?: {
    courseId?: number
    assignmentId?: number
    courseCode?: string
    courseName?: string
    description?: string
    weight?: number
    maxGrade?: number
    grade?: number
    status?: string
    canvasUrl?: string
    noteUrl?: string
    isSummary?: boolean
  };
}

interface FullScreenCalendarProps {
  events: ApiEvent[]
  onRefresh?: () => void
  autoOpenEventId?: string | null
}

export function FullScreenCalendar({ events, onRefresh, autoOpenEventId }: FullScreenCalendarProps) {
  const [openEvent, setOpenEvent] = React.useState<ApiEvent | null>(null)
  const [openDay, setOpenDay] = React.useState<{ dateStr: string; dayEvents: ApiEvent[] } | null>(null)
  const [openCreate, setOpenCreate] = React.useState(false)
  const [createForm, setCreateForm] = React.useState<{ title: string; description: string; date: string; startTime: string; endTime: string }>({
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
  })

  React.useEffect(() => {
    if (openEvent || openCreate || openDay) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [openEvent, openCreate, openDay])

  React.useEffect(() => {
    if (autoOpenEventId && events.length > 0) {
      const ev = events.find(e => e.id === autoOpenEventId);
      if (ev) setOpenEvent(ev);
    }
  }, [autoOpenEventId, events]);

  // Map our API events into FullCalendar events
  const fcEvents = React.useMemo(() => {
    const list: any[] = [];
    const byDay: Record<string, ApiEvent[]> = {};
    for (const e of events) {
      if (!e.start) continue;
      const day = e.start.split('T')[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(e);
    }

    for (const [day, dayEvents] of Object.entries(byDay)) {
      const notes = dayEvents.filter(e => e.type === 'note');
      const assignments = dayEvents.filter(e => e.type === 'assignment');
      const others = dayEvents.filter(e => e.type !== 'note' && e.type !== 'assignment');

      assignments.forEach(a => list.push({
        id: a.id, title: a.title, start: a.start, end: a.end, extendedProps: { type: a.type, ...a.meta }
      }));
      others.forEach(o => list.push({
        id: o.id, title: o.title, start: o.start, end: o.end, extendedProps: { type: o.type, ...o.meta }
      }));

      if (assignments.length > 0) {
        if (notes.length > 0) {
          list.push({
            id: `notes-summary-${day}`,
            title: `+ ${notes.length} note${notes.length > 1 ? 's' : ''}`,
            start: day,
            allDay: true,
            extendedProps: { type: 'summary', isSummary: true }
          });
        }
      } else {
        if (notes.length > 0) {
          const sortedNotes = [...notes].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          const firstNote = sortedNotes[0];
          list.push({
            id: firstNote.id, title: firstNote.title, start: firstNote.start, end: firstNote.end, extendedProps: { type: firstNote.type, ...firstNote.meta }
          });
          if (sortedNotes.length > 1) {
            list.push({
              id: `notes-summary-${day}`,
              title: `+ ${sortedNotes.length - 1} note${sortedNotes.length - 1 > 1 ? 's' : ''}`,
              start: day,
              allDay: true,
              extendedProps: { type: 'summary', isSummary: true }
            });
          }
        }
      }
    }
    return list;
  }, [events]);

  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo;
    const { type, courseId, weight, maxGrade, grade, isSummary } = event.extendedProps;

    if (isSummary) {
      return (
        <div className="text-xs text-gray-400 dark:text-gray-500 font-medium pl-1 italic">
          {event.title}
        </div>
      );
    }

    const isNote = type === 'note';
    const isAssignment = type === 'assignment';
    const isWork = type === 'work';

    const colorClassRaw = courseId != null ? COURSE_COLORS[courseId % COURSE_COLORS.length] : "bg-gray-400";
    const noteSolidClass = `${colorClassRaw} text-white shadow-sm border-transparent`;

    return (
      <div className={cn(
        "relative overflow-hidden w-full text-left flex flex-col items-start gap-1 rounded-md p-1.5 text-xs leading-tight transition-colors",
        isNote ? noteSolidClass : "bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-[#2A2A2E] shadow-sm"
      )}>
        {!isNote && <div className={cn("absolute top-0 bottom-0 left-0 w-1", colorClassRaw)} />}
        <div className={cn("w-full overflow-hidden", !isNote && "pl-1")}>
          <div className={cn("flex items-center gap-1.5 font-medium w-full truncate", isNote ? "text-white" : "text-gray-900 dark:text-gray-100")}>
            {isNote ? <FileText size={11} className="text-white shrink-0 opacity-80" /> :
              isAssignment ? <CheckSquare size={11} className="text-blue-500 shrink-0" /> :
                isWork ? <Briefcase size={11} className="text-purple-500 shrink-0" /> :
                  <CalendarIcon size={11} className="text-gray-400 shrink-0" />}

            <span className="truncate">{event.title}</span>
          </div>

          <p className={cn("leading-none mt-1.5 text-[10px]", isNote ? "text-white/80" : "text-gray-500 dark:text-gray-400")}>
            {event.start && format(event.start, "h:mm a")}
            {event.end && event.start.getTime() !== event.end.getTime() && ` - ${format(event.end, "h:mm a")}`}
          </p>

          {isAssignment && weight != null && maxGrade != null && (
            <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-1 font-medium bg-gray-100 dark:bg-gray-800/50 inline-block px-1 rounded">
              {Math.round(weight * 100)}% wgt {grade != null ? `· ${grade}/${maxGrade}` : `· --/${maxGrade}`}
            </p>
          )}
        </div>
      </div>
    );
  };

  const handleEventClick = (clickInfo: any) => {
    // Find back original event to pass to modal
    const originalEvent = events.find(e => e.id === clickInfo.event.id)
    if (originalEvent) setOpenEvent(originalEvent)
  }

  const handleDateClick = (info: any) => {
    // Show events for clicked day instead of opening create form
    const clickedDate = info.dateStr.split('T')[0]
    const dayEvents = events.filter(e => e.start.startsWith(clickedDate))
    setOpenDay({ dateStr: clickedDate, dayEvents })
  }

  return (
    <div className="flex flex-1 flex-col w-full h-[800px] overflow-hidden">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => {
            setCreateForm({ title: "", description: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00" })
            setOpenCreate(true)
          }}
          className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A1A1E] transition-colors"
        >
          <span className="text-lg leading-none">+</span> New Event
        </button>
      </div>
      <style>{`
        /* Minimalist Light/Dark Mode FullCalendar Styles */
        .fc {
          --fc-border-color: #e5e7eb;
          --fc-button-text-color: #111827;
          --fc-button-bg-color: #f9fafb;
          --fc-button-border-color: #d1d5db;
          --fc-button-hover-bg-color: #f3f4f6;
          --fc-button-hover-border-color: #d1d5db;
          --fc-button-active-bg-color: #e5e7eb;
          --fc-button-active-border-color: #d1d5db;
          --fc-event-bg-color: transparent;
          --fc-event-border-color: transparent;
          --fc-today-bg-color: #f3f4f6;
          --fc-page-bg-color: #ffffff;
          --fc-neutral-bg-color: #f9fafb;
          font-family: inherit;
        }

        .dark .fc {
          --fc-border-color: #1F1F23;
          --fc-button-text-color: #f3f4f6;
          --fc-button-bg-color: #0F0F12;
          --fc-button-border-color: #2A2A2E;
          --fc-button-hover-bg-color: #1A1A1E;
          --fc-button-hover-border-color: #2A2A2E;
          --fc-button-active-bg-color: #2A2A2E;
          --fc-button-active-border-color: #2A2A2E;
          --fc-today-bg-color: #1A1A1E;
          --fc-page-bg-color: #0F0F12;
          --fc-neutral-bg-color: #1A1A1E;
        }

        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid var(--fc-border-color);
        }
        
        .fc-toolbar-title {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          color: #111827;
        }

        .dark .fc-toolbar-title {
          color: #f3f4f6;
        }

        .fc .fc-col-header-cell-cushion {
          padding: 10px;
          font-weight: 600;
          color: #4b5563; /* text-gray-600 */
        }
        
        .dark .fc .fc-col-header-cell-cushion {
          color: #9ca3af; /* text-gray-400 */
        }

        .fc .fc-daygrid-day-number {
          padding: 8px;
          color: #374151;
        }
        
        .dark .fc .fc-daygrid-day-number {
          color: #d1d5db;
        }

        .fc-event {
          cursor: pointer;
        }
        .fc-h-event {
          border: none;
          background: none;
        }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        }}
        firstDay={1} // Monday
        events={fcEvents}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="100%"
        dayMaxEvents={true}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
      />

      {openDay && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/60 transition-opacity backdrop-blur-sm"
          onClick={() => setOpenDay(null)}
        >
          <div
            className="fixed top-[150px] bottom-[150px] left-[200px] right-[200px] rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {format(new Date(openDay.dateStr + "T00:00:00"), "MMMM d, yyyy")}
              </h3>
              <button
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1F1F23] rounded-md px-2 py-1"
                onClick={() => setOpenDay(null)}
              >
                Close
              </button>
            </div>
            {openDay.dayEvents.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                No events on this day.
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {openDay.dayEvents.map((ev) => {
                  const isNote = ev.type === 'note'
                  const colorClass = ev.meta?.courseId != null
                    ? COURSE_COLORS[ev.meta.courseId % COURSE_COLORS.length].replace('bg-', 'border-l-').replace('-500', '-500')
                    : 'border-l-gray-300'
                  return (
                    <button
                      key={ev.id}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#1A1A1E] relative overflow-hidden transition-colors",
                        isNote
                          ? "border-dashed border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12]"
                          : "border-solid border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]"
                      )}
                      onClick={() => {
                        setOpenDay(null)
                        setOpenEvent(ev)
                      }}
                    >
                      <div className={cn("absolute top-0 bottom-0 left-0 w-1", ev.meta?.courseId != null ? COURSE_COLORS[ev.meta.courseId % COURSE_COLORS.length] : "bg-gray-300")} />
                      <div className="pl-2">
                        <div className="flex items-center gap-1.5">
                          {isNote
                            ? <span className="text-gray-400">📄</span>
                            : <span className="text-blue-500">☑</span>
                          }
                          <span className="font-semibold text-gray-900 dark:text-white">{ev.title}</span>
                        </div>
                        <div className="mt-1 text-gray-500 dark:text-gray-400">
                          {format(new Date(ev.start), "h:mm a")}
                          {ev.meta?.courseName && <span className="ml-2 text-gray-400 dark:text-gray-500">· {ev.meta.courseName}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#1F1F23]">
              <button
                className="text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                onClick={() => {
                  setOpenDay(null)
                  setCreateForm(prev => ({ ...prev, date: openDay.dateStr }))
                  setOpenCreate(true)
                }}
              >
                + Add event on this day
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {openEvent && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/60 transition-opacity backdrop-blur-sm"
          onClick={() => setOpenEvent(null)}
        >
          <div
            id="step-assignment-modal"
            className="fixed top-[150px] bottom-[150px] left-[200px] right-[200px] rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight pr-4">{openEvent.title}</h3>
            </div>
            <Separator className="my-4 dark:border-[#1F1F23]" />
            <div className="space-y-3 text-sm flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F1F23] pb-2">
                <span className="text-gray-500 dark:text-gray-400">
                  {openEvent.type === 'note' ? 'Date Created' : (openEvent.type === 'assignment' ? 'Due' : 'Due / Start')}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{format(new Date(openEvent.start), "MMM d, yyyy h:mm a")}</span>
              </div>

              {openEvent.meta?.courseName && (
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F1F23] pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Course</span>
                  <span className="font-medium text-gray-900 dark:text-white">{openEvent.meta.courseName}</span>
                </div>
              )}

              {typeof openEvent.meta?.weight === "number" && (
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F1F23] pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Weight</span>
                  <span className="font-medium text-gray-900 dark:text-white">{Math.round((openEvent.meta.weight || 0) * 100)}%</span>
                </div>
              )}

              {typeof openEvent.meta?.maxGrade === "number" && (
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F1F23] pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Max Grade</span>
                  <span className="font-medium text-gray-900 dark:text-white">{openEvent.meta.maxGrade}</span>
                </div>
              )}

              {typeof openEvent.meta?.grade === "number" && (
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F1F23] pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Grade</span>
                  <span className="font-medium text-gray-900 dark:text-white">{openEvent.meta.grade}</span>
                </div>
              )}

              {openEvent.meta?.status && (
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F1F23] pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span className="font-medium text-gray-900 dark:text-white uppercase text-[11px] tracking-wider">{openEvent.meta.status}</span>
                </div>
              )}

              {openEvent.meta?.description && (
                <div className="mt-4 pt-2 flex flex-col flex-1 min-h-0">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-2">Description</span>
                  <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1A1A1E] p-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    {openEvent.type === 'note' ? (
                      <ReactMarkdown>{openEvent.meta.description}</ReactMarkdown>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: openEvent.meta.description }} />
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 mt-auto shrink-0 border-t border-gray-100 dark:border-[#1F1F23]">
                <Button variant="outline" onClick={() => setOpenEvent(null)}>Close</Button>
                {openEvent.meta?.noteUrl && (
                  <button
                    onClick={() => window.location.href = openEvent.meta!.noteUrl!}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700 transition"
                  >
                    Open Note
                  </button>
                )}
                {openEvent.meta?.canvasUrl && (
                  <a
                    href={openEvent.meta.canvasUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700 transition"
                  >
                    Open in Canvas
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {openCreate && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/60 transition-opacity backdrop-blur-sm"
          onClick={() => setOpenCreate(false)}
        >
          <div
            className="fixed top-[150px] bottom-[150px] left-[200px] right-[200px] rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Event</h3>
            </div>
            <Separator className="my-4 dark:border-[#1F1F23]" />
            <form
              className="space-y-4 text-sm flex-1 flex flex-col overflow-y-auto pr-1"
              onSubmit={async (e) => {
                e.preventDefault()
                const startIso = new Date(`${createForm.date}T${createForm.startTime}`).toISOString()
                const endIso = new Date(`${createForm.date}T${createForm.endTime}`).toISOString()
                await fetch("/api/calendar/events", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: createForm.title,
                    description: createForm.description || undefined,
                    start: startIso,
                    end: endIso,
                    type: "manual",
                  }),
                })
                setOpenCreate(false)
                setCreateForm({ title: "", description: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00" })
                if (onRefresh) onRefresh();
              }}
            >
              <div className="grid gap-2">
                <label className="text-gray-700 dark:text-gray-300 font-medium">Title</label>
                <input
                  required
                  className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Event title"
                />
              </div>
              <div className="grid gap-2 flex-1 flex flex-col">
                <label className="text-gray-700 dark:text-gray-300 font-medium w-full">Description</label>
                <textarea
                  className="min-h-[100px] flex-1 w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-1">
                  <label className="text-gray-700 dark:text-gray-300 font-medium text-xs">Date</label>
                  <input
                    type="date"
                    required
                    className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={createForm.date}
                    onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-gray-700 dark:text-gray-300 font-medium text-xs">Start Time</label>
                  <input
                    type="time"
                    required
                    className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-gray-700 dark:text-gray-300 font-medium text-xs">End Time</label>
                  <input
                    type="time"
                    required
                    className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 mt-auto shrink-0 border-t border-gray-100 dark:border-[#1F1F23]">
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button type="submit">Add Event</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
