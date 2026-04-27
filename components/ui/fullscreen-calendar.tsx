"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import ReactMarkdown from "react-markdown"
import { CheckSquare, FileText, Calendar as CalendarIcon, Briefcase, X, ExternalLink, Trash2 } from "lucide-react"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

function getCourseNameParts(rawName: string): string[] {
  return rawName.split("-").map(p => p.trim()).filter(Boolean);
}

function getCourseSession(course: { name?: string; term?: string; year?: number }): string {
  const parts = getCourseNameParts(course.name || "");
  if (parts.length >= 2) return parts[1];
  if (course.term && course.year) return `${course.term} ${course.year}`;
  return "Other";
}

/** Extracts just the 5-digit numeric course code from the full code string. */
function getCourseCode(course: { code: string }): string {
  const match = course.code.match(/\d{5}/);
  return match ? match[0] : course.code.slice(0, 5);
}

function getCourseDisplayName(course: { name?: string; code: string; term?: string; year?: number }): string {
  const name = course.name?.trim() || "";
  if (!name) return getCourseCode(course);
  const parts = getCourseNameParts(name);
  const firstSegment = parts[0] || name;
  const firstWithoutCode = firstSegment.replace(new RegExp(`^${course.code.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*`, 'i'), '').trim();
  if (firstWithoutCode) return firstWithoutCode;
  if (firstSegment) return firstSegment;
  return name.replace(/\s*-\s*(Autumn|Spring|Summer|Winter)\s+\d{4}\s*$/i, '').trim();
}

function getCourseOptionLabel(course: { name?: string; code: string; term?: string; year?: number }): string {
  const displayName = getCourseDisplayName(course).trim();
  const code = getCourseCode(course);
  if (!displayName || displayName.toLowerCase() === code.toLowerCase()) return code;
  return `${displayName} (${code})`;
}

function sortSessions(a: string, b: string): number {
  const parseSession = (label: string) => {
    const match = label.match(/(Autumn|Spring|Summer|Winter)\s+(\d{4})/i);
    if (!match) return { year: 0, order: 99 };
    const term = match[1].toLowerCase();
    const year = Number(match[2]);
    const termOrder: Record<string, number> = { summer: 0, autumn: 1, winter: 2, spring: 3 };
    return { year, order: termOrder[term] ?? 99 };
  };
  const pa = parseSession(a);
  const pb = parseSession(b);
  if (pa.year !== pb.year) return pb.year - pa.year;
  if (pa.order !== pb.order) return pa.order - pb.order;
  return a.localeCompare(b);
}

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
    courseColor?: string
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
  const [deleting, setDeleting] = React.useState(false)
  const [editForm, setEditForm] = React.useState<{ title: string; dueDate: string; weight: string; grade: string; maxGrade: string; status: string; courseId: string; description: string } | null>(null)
  const [savingEdit, setSavingEdit] = React.useState(false)

  const startEditEvent = (ev: ApiEvent) => {
    const d = new Date(ev.start);
    const valid = !isNaN(d.getTime()) && d.getFullYear() > 1970;
    setEditForm({
      title: ev.title,
      dueDate: valid ? format(d, 'yyyy-MM-dd') : '',
      weight: ev.meta?.weight != null ? String(Math.round(ev.meta.weight * 100)) : '',
      grade: ev.meta?.grade != null ? String(ev.meta.grade) : '',
      maxGrade: ev.meta?.maxGrade != null ? String(ev.meta.maxGrade) : '',
      status: ev.meta?.status || 'pending',
      courseId: ev.meta?.courseId != null ? String(ev.meta.courseId) : '',
      description: ev.meta?.description || '',
    });
  };

  const saveEditEvent = async () => {
    if (!openEvent || !editForm || !openEvent.meta?.assignmentId) return;
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        id: openEvent.meta.assignmentId,
        title: editForm.title,
        weight: Number(editForm.weight) / 100,
        maxGrade: Number(editForm.maxGrade),
        status: editForm.status,
        description: editForm.description || '',
      };
      if (editForm.dueDate) body.dueDate = new Date(editForm.dueDate).toISOString();
      if (editForm.grade !== '') body.grade = Number(editForm.grade); else body.grade = null;
      if (editForm.courseId) body.courseId = Number(editForm.courseId);
      const res = await fetch('/api/uni/assignments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setEditForm(null); setOpenEvent(null); if (onRefresh) onRefresh(); }
    } catch (err) { console.error('Save failed', err); }
    finally { setSavingEdit(false); }
  };
  const [openCreate, setOpenCreate] = React.useState(false)
  const [createForm, setCreateForm] = React.useState<{ title: string; description: string; date: string; startTime: string; endTime: string; type: string; courseId: string; weight: string; grade: string; maxGrade: string }>({
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    type: "manual",
    courseId: "",
    weight: "",
    grade: "",
    maxGrade: ""
  })
  const [courses, setCourses] = React.useState<any[]>([])

  React.useEffect(() => {
    fetch("/api/uni/courses")
      .then(r => r.json())
      .then(d => {
        if (d.courses) setCourses(d.courses)
      })
      .catch(console.error)
  }, [])

  const coursesBySession = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    courses.forEach((c: any) => {
      const session = getCourseSession(c);
      if (!grouped[session]) grouped[session] = [];
      grouped[session].push(c);
    });
    const sortedSessions = Object.keys(grouped).sort(sortSessions);
    return sortedSessions.map(session => ({
      session,
      courses: grouped[session].sort((a: any, b: any) => a.code.localeCompare(b.code)),
    }));
  }, [courses])

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

  const getLocalDayKey = React.useCallback((dateValue: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue
    }
    const parsed = new Date(dateValue)
    if (isNaN(parsed.getTime())) {
      return dateValue.split("T")[0]
    }
    return format(parsed, "yyyy-MM-dd")
  }, [])

  const getEventsForDay = React.useCallback((dateStr: string) => {
    const targetDay = getLocalDayKey(dateStr)
    return events
      .filter(e => getLocalDayKey(e.start) === targetDay)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [events, getLocalDayKey])

  // Map our API events into FullCalendar events
  const fcEvents = React.useMemo(() => {
    const list: any[] = [];
    const byDay: Record<string, ApiEvent[]> = {};
    for (const e of events) {
      if (!e.start) continue;
      const day = getLocalDayKey(e.start)
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(e);
    }

    for (const [day, dayEvents] of Object.entries(byDay)) {
      const assignments = dayEvents.filter(e => e.type === "assignment").sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      const notes = dayEvents.filter(e => e.type === "note").sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      const others = dayEvents.filter(e => e.type !== "note" && e.type !== "assignment").sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      const firstVisible = assignments[0] ?? notes[0] ?? others[0]
      if (!firstVisible) continue

      list.push({
        id: firstVisible.id,
        title: firstVisible.title,
        start: day,
        allDay: true,
        extendedProps: {
          ...firstVisible.meta,
          type: firstVisible.type,
          sortKey: 0,
          originalStart: firstVisible.start,
          originalEnd: firstVisible.end,
        }
      })

      const remainingCount = dayEvents.length - 1

      if (remainingCount > 0) {
        list.push({
          id: `summary-${day}`,
          title: `+ ${remainingCount} more`,
          start: day,
          allDay: true,
          extendedProps: { type: "summary", isSummary: true, dayKey: day, sortKey: 1 }
        })
      }
    }
    return list;
  }, [events, getLocalDayKey]);

  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo;
    const { type, courseId, weight, maxGrade, grade, isSummary, originalStart, originalEnd, courseColor } = event.extendedProps;

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

    const colorClassRaw = courseColor ? "" : (courseId != null ? COURSE_COLORS[courseId % COURSE_COLORS.length] : "bg-gray-400");
    const noteSolidClass = courseColor ? "text-white shadow-sm border-transparent" : `${colorClassRaw} text-white shadow-sm border-transparent`;
    const displayStart = originalStart ? new Date(originalStart) : event.start
    const displayEnd = originalEnd ? new Date(originalEnd) : event.end
    const hasDisplayStart = displayStart && !isNaN(displayStart.getTime())
    const hasDisplayEnd = displayEnd && !isNaN(displayEnd.getTime())
    const showTimeRange = hasDisplayStart && hasDisplayEnd && displayStart.getTime() !== displayEnd.getTime()

    return (
      <div 
        className={cn(
          "relative overflow-hidden w-full text-left flex flex-col items-start gap-1 rounded-md p-1.5 text-xs leading-tight transition-colors",
          isNote ? noteSolidClass : "bg-gray-50 dark:bg-[#1A1A1E] border border-gray-200 dark:border-[#2A2A2E] shadow-sm"
        )}
        style={isNote && courseColor ? { backgroundColor: courseColor } : {}}
      >
        {!isNote && <div className={cn("absolute top-0 bottom-0 left-0 w-1", colorClassRaw)} style={courseColor ? { backgroundColor: courseColor } : {}} />}
        <div className={cn("w-full overflow-hidden", !isNote && "pl-1")}>
          <div className={cn("flex items-center gap-1.5 font-medium w-full truncate", isNote ? "text-white" : "text-gray-900 dark:text-gray-100")}>
            {isNote ? <FileText size={11} className="text-white shrink-0 opacity-80" /> :
              isAssignment ? <CheckSquare size={11} className="text-blue-500 shrink-0" /> :
                isWork ? <Briefcase size={11} className="text-purple-500 shrink-0" /> :
                  <CalendarIcon size={11} className="text-gray-400 shrink-0" />}

            <span className="truncate">{event.title}</span>
          </div>

          <p className={cn("leading-none mt-1.5 text-[10px]", isNote ? "text-white/80" : "text-gray-500 dark:text-gray-400")}>
            {hasDisplayStart && format(displayStart, "h:mm a")}
            {showTimeRange && ` - ${format(displayEnd, "h:mm a")}`}
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
    if (clickInfo.event.extendedProps?.isSummary) {
      const summaryDay = clickInfo.event.extendedProps?.dayKey || clickInfo.event.startStr?.split("T")[0]
      if (!summaryDay) return
      const dayEvents = getEventsForDay(summaryDay)
      setOpenDay({ dateStr: summaryDay, dayEvents })
      return
    }

    // Find back original event to pass to modal
    const originalEvent = events.find(e => e.id === clickInfo.event.id)
    if (originalEvent) setOpenEvent(originalEvent)
  }

  const handleDateClick = (info: any) => {
    // Show events for clicked day instead of opening create form
    const clickedDate = getLocalDayKey(info.dateStr)
    const dayEvents = getEventsForDay(clickedDate)
    setOpenDay({ dateStr: clickedDate, dayEvents })
  }

  return (
    <div className="flex flex-1 flex-col w-full h-[800px] overflow-hidden">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => {
            setCreateForm({ title: "", description: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", type: "manual", courseId: "", weight: "", grade: "", maxGrade: "" })
            setOpenCreate(true)
          }}
          className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12] px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A1A1E] transition-colors"
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
          --fc-page-bg-color: #f5f5f5;
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
        dayMaxEvents={false}
        eventOrder="sortKey,start,title"
        eventOrderStrict={true}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
      />

      {openDay && !openEvent && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setOpenDay(null)}>
          <div 
            className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl border border-white/20 dark:border-zinc-800 bg-gray-50 dark:bg-[#0A0A0C] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 pb-4 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {format(new Date(openDay.dateStr + "T00:00:00"), "MMMM d, yyyy")}
                </h3>
                <button
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0"
                  onClick={() => setOpenDay(null)}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            {openDay.dayEvents.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                No events on this day.
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto px-6 pb-2">
                {openDay.dayEvents.map((ev) => {
                  const isNote = ev.type === 'note'
                  const isAssignment = ev.type === 'assignment'
                  const colorClassRaw = ev.meta?.courseColor ? "" : (ev.meta?.courseId != null ? COURSE_COLORS[ev.meta.courseId % COURSE_COLORS.length] : "bg-gray-400");
                  const noteSolidClass = ev.meta?.courseColor ? "text-white border-transparent" : `${colorClassRaw} text-white border-transparent`;
                  return (
                    <button
                      key={ev.id}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 text-xs hover:opacity-90 relative overflow-hidden transition-all",
                        isNote
                          ? noteSolidClass
                          : "border-solid border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12] hover:bg-gray-50 dark:hover:bg-[#1A1A1E]"
                      )}
                      style={isNote && ev.meta?.courseColor ? { backgroundColor: ev.meta.courseColor } : {}}
                      onClick={() => {
                        setOpenEvent(ev)
                      }}
                    >
                      {!isNote && <div className={cn("absolute top-0 bottom-0 left-0 w-1", colorClassRaw)} style={ev.meta?.courseColor ? { backgroundColor: ev.meta.courseColor } : {}} />}
                      <div className={cn("relative", !isNote && "pl-2")}>
                        <div className="flex items-center gap-1.5">
                          {isNote
                            ? <span className="text-white/80">📄</span>
                            : <span className="text-blue-500">☑</span>
                          }
                          <span className={cn("font-semibold", isNote ? "text-white" : "text-gray-900 dark:text-white")}>{ev.title}</span>
                        </div>
                        <div className={cn("mt-1", isNote ? "text-white/70" : "text-gray-500 dark:text-gray-400")}>
                          {format(new Date(ev.start), "h:mm a")}
                          {ev.meta?.courseName && <span className={cn("ml-2", isNote ? "text-white/50" : "text-gray-400 dark:text-gray-500")}>· {ev.meta.courseName}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-4 pt-3 px-6 pb-5 border-t border-gray-100 dark:border-[#1F1F23]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setOpenEvent(null)}>
          <div 
            id="step-assignment-modal"
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/20 dark:border-zinc-800 bg-gray-50 dark:bg-[#0A0A0C] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-[25%] -left-[25%] w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_120deg,#6366f1_180deg,transparent_240deg,transparent_360deg)] animate-[spin_8s_linear_infinite] opacity-30" />
            </div>

            {/* Header */}
            <div className="p-8 pb-4 relative z-10 text-left">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                    {openEvent.meta?.courseCode || (openEvent.type === 'note' ? 'NOTES' : 'EVENT')}
                  </div>
                  {editForm ? (
                    <input className="text-2xl font-black text-gray-900 dark:text-white leading-tight bg-transparent border-b-2 border-indigo-500 outline-none w-full" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
                  ) : (
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{openEvent.title}</h3>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!editForm && openEvent.type === 'assignment' && openEvent.meta?.assignmentId && (
                    <Button variant="ghost" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors" onClick={() => startEditEvent(openEvent)} title="Edit">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Button>
                  )}
                  <Button variant="ghost" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors" onClick={() => { setOpenEvent(null); setEditForm(null); }}>
                    <X className="w-5 h-5 text-gray-500" />
                  </Button>
                </div>
              </div>

              {editForm ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Due Date</label><input type="date" className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Weight %</label><input type="number" min="0" max="100" className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white" value={editForm.weight} onChange={e => setEditForm({ ...editForm, weight: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Grade</label><div className="flex items-center gap-1"><input type="number" min="0" className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white" placeholder="--" value={editForm.grade} onChange={e => setEditForm({ ...editForm, grade: e.target.value })} /><span className="text-gray-400 text-sm">/</span><input type="number" min="1" className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white" value={editForm.maxGrade} onChange={e => setEditForm({ ...editForm, maxGrade: e.target.value })} /></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Status</label><select className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}><option value="pending">To-Do</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
                  <div className="space-y-1 col-span-2 sm:col-span-2"><label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider uppercase">Course</label><select className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white" value={editForm.courseId} onChange={e => setEditForm({ ...editForm, courseId: e.target.value })}>{courses.map((c: any) => <option key={c.id} value={c.id}>{getCourseOptionLabel(c)}</option>)}</select></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                    <div className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider transition-colors uppercase">{openEvent.type === 'note' ? 'Date Created' : (openEvent.type === 'assignment' ? 'Due' : 'Due / Start')}</div>
                    <div className="text-[11px] font-bold mt-1 uppercase text-indigo-500">{(() => { const d = new Date(openEvent.start); const isOld = isNaN(d.getTime()) || (d.getFullYear() < (new Date().getFullYear() - 5) && d.getFullYear() !== 1970); return isOld ? "No due date" : format(d, "MMM d, yyyy"); })()}</div>
                  </div>
                  {openEvent.meta?.weight != null && (<div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center"><div className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider transition-colors uppercase">Weight</div><div className="text-[11px] font-bold mt-1 uppercase text-purple-500">{Math.round((openEvent.meta.weight || 0) * 100)}%</div></div>)}
                  {openEvent.meta?.status && (<div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center"><div className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider transition-colors uppercase">Status</div><div className="text-[11px] font-bold mt-1 uppercase text-blue-500">{openEvent.meta.status.replace('_', ' ')}</div></div>)}
                  {(openEvent.meta?.grade != null || openEvent.meta?.maxGrade != null) && (<div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center"><div className="text-[9px] font-black text-gray-400 dark:text-zinc-500 tracking-wider transition-colors uppercase">Grade</div><div className="text-[11px] font-bold mt-1 uppercase text-pink-500">{openEvent.meta.grade != null ? `${openEvent.meta.grade}/${openEvent.meta.maxGrade}` : `PENDING/${openEvent.meta.maxGrade || '--'}`}</div></div>)}
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 relative z-10 scrollbar-hide text-left">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest text-left">Description</h4>
                {editForm ? (
                  <textarea className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed min-h-[120px] outline-none focus:ring-1 focus:ring-indigo-500 resize-y" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Add a description..." />
                ) : (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed min-h-[100px]">
                    {openEvent.meta?.description ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-left">
                        {openEvent.type === 'note' ? (<ReactMarkdown>{openEvent.meta.description}</ReactMarkdown>) : (<div dangerouslySetInnerHTML={{ __html: openEvent.meta.description }} />)}
                      </div>
                    ) : (<span className="text-left block italic">No description provided.</span>)}
                  </div>
                )}
              </div>

              {!editForm && (openEvent.meta?.canvasUrl || openEvent.meta?.noteUrl) && (
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex gap-4">
                  {openEvent.meta.noteUrl && (<button onClick={() => window.location.href = openEvent.meta!.noteUrl!} className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-wider">Open Note<FileText className="w-3 h-3" /></button>)}
                  {openEvent.meta.canvasUrl && (<a href={openEvent.meta.canvasUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-wider">View on Canvas<ExternalLink className="w-3 h-3" /></a>)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/20 flex justify-between gap-3 relative z-10">
              {!editForm && /^(assignment|note|manual|task)-\d+$/.test(openEvent.id) ? (
                <button disabled={deleting} onClick={async () => { if (!confirm("Are you sure you want to delete this event?")) return; setDeleting(true); try { const res = await fetch(`/api/calendar/events?id=${encodeURIComponent(openEvent.id)}`, { method: "DELETE" }); if (res.ok) { setOpenEvent(null); if (onRefresh) onRefresh(); } } catch (err) { console.error("Delete event failed", err); } finally { setDeleting(false); } }} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/40 transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" />{deleting ? "Deleting..." : "Delete"}</button>
              ) : <div />}
              <div className="flex gap-3">
                {editForm ? (
                  <>
                    <button type="button" onClick={() => setEditForm(null)} className="px-6 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                    <button type="button" disabled={savingEdit} onClick={() => void saveEditEvent()} className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50">{savingEdit ? 'Saving...' : 'Save Changes'}</button>
                  </>
                ) : (
                  <button onClick={() => { setOpenEvent(null); setEditForm(null); }} className="px-6 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Close</button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {openCreate && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setOpenCreate(false)}>
          <div 
            className="relative w-full max-w-xl max-h-[80vh] flex flex-col rounded-3xl border border-white/20 dark:border-zinc-800 bg-gray-50 dark:bg-[#0A0A0C] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 pb-4 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Add Event</h3>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors" onClick={() => setOpenCreate(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Event</h3>
            </div>
            <Separator className="my-4 dark:border-[#1F1F23]" />
              <form
              className="space-y-[10px] text-sm flex-1 flex flex-col overflow-y-auto p-[10px] px-8"
              onSubmit={async (e) => {
                e.preventDefault()
                const startIso = new Date(`${createForm.date}T${createForm.startTime}`).toISOString()
                const endIso = new Date(`${createForm.date}T${createForm.endTime}`).toISOString()
                
                const bodyPayload: any = {
                  title: createForm.title,
                  description: createForm.description || undefined,
                  start: startIso,
                  end: endIso,
                  type: createForm.type,
                }
                
                if (createForm.type === "assignment" || createForm.type === "note") {
                  bodyPayload.courseId = createForm.courseId ? Number(createForm.courseId) : undefined;
                }
                if (createForm.type === "assignment") {
                  bodyPayload.weight = createForm.weight ? Number(createForm.weight) : undefined;
                  bodyPayload.grade = createForm.grade ? Number(createForm.grade) : undefined;
                  bodyPayload.maxGrade = createForm.maxGrade ? Number(createForm.maxGrade) : undefined;
                }

                await fetch("/api/calendar/events", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(bodyPayload),
                })
                setOpenCreate(false)
                setCreateForm({ title: "", description: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", type: "manual", courseId: "", weight: "", grade: "", maxGrade: "" })
                if (onRefresh) onRefresh();
              }}
            >
              <div className="grid gap-2">
                <label className="text-gray-700 dark:text-gray-300 font-medium">Type</label>
                <select
                  className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={createForm.type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="manual">Other</option>
                  <option value="assignment">Assignment</option>
                  <option value="note">Note</option>
                </select>
              </div>

              {(createForm.type === "assignment" || createForm.type === "note") && (
                <div className="grid gap-2">
                  <label className="text-gray-700 dark:text-gray-300 font-medium">Course</label>
                  <select
                    required
                    className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={createForm.courseId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, courseId: e.target.value }))}
                  >
                    <option value="" disabled>Select a course</option>
                    {coursesBySession.map((group) => (
                      <optgroup key={group.session} label={group.session}>
                        {group.courses.map((c: any) => (
                          <option key={c.id} value={c.id}>{getCourseOptionLabel(c)}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-gray-700 dark:text-gray-300 font-medium">Title</label>
                <input
                  required
                  className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Event title"
                />
              </div>

              {createForm.type === "assignment" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium text-xs">Weight (e.g. 0.2)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={createForm.weight}
                      onChange={(e) => setCreateForm((f) => ({ ...f, weight: e.target.value }))}
                      placeholder="0.20"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium text-xs">Max Grade</label>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={createForm.maxGrade}
                      onChange={(e) => setCreateForm((f) => ({ ...f, maxGrade: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium text-xs">Achieved Grade</label>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1E] text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={createForm.grade}
                      onChange={(e) => setCreateForm((f) => ({ ...f, grade: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 flex-1">
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
