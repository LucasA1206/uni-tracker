"use client"

import * as React from "react"
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns"
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PlusCircle as PlusCircleIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useMediaQuery } from "@/hooks/use-media-query"

interface Event {
  id: number
  name: string
  time: string
  datetime: string
  type?: string
  meta?: {
    assignmentId?: number
    courseCode?: string
    description?: string
    weight?: number
    maxGrade?: number
    grade?: number
    status?: string
    canvasUrl?: string
  }
}

interface CalendarData {
  day: Date
  events: Event[]
}

interface FullScreenCalendarProps {
  data: CalendarData[]
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
]

export function FullScreenCalendar({ data }: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDay, setSelectedDay] = React.useState(today)
  const [currentMonth, setCurrentMonth] = React.useState(format(today, "MMM-yyyy"))
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date())
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [openEvent, setOpenEvent] = React.useState<{ event: Event; day: Date } | null>(null)
  const [openDay, setOpenDay] = React.useState<{ day: Date; events: Event[] } | null>(null)

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  })

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"))
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
              <h1 className="p-1 text-xs uppercase text-muted-foreground">{format(today, "MMM")}</h1>
              <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">{format(firstDayCurrentMonth, "MMMM, yyyy")}</h2>
              <p className="text-sm text-muted-foreground">
                {format(firstDayCurrentMonth, "MMM d, yyyy")} - {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">

          <Separator orientation="vertical" className="hidden h-6 lg:block" />

          <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
            <Button onClick={previousMonth} className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10" variant="outline" size="icon" aria-label="Navigate to previous month">
              <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button onClick={goToToday} className="w-full rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 md:w-auto" variant="outline">Today</Button>
            <Button onClick={nextMonth} className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10" variant="outline" size="icon" aria-label="Navigate to next month">
              <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>

          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <Separator orientation="horizontal" className="block w-full md:hidden" />

          <Button className="w全文 md:w-auto gap-2">
            <PlusCircleIcon size={16} strokeWidth={2} aria-hidden="true" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      <div className="lg:flex lg:flex-auto lg:flex-col">
        <div className="grid grid-cols-7 border text-center text-xs font-semibold leading-6 lg:flex-none">
          <div className="border-r py-2.5">Sun</div>
          <div className="border-r py-2.5">Mon</div>
          <div className="border-r py-2.5">Tue</div>
          <div className="border-r py-2.5">Wed</div>
          <div className="border-r py-2.5">Thu</div>
          <div className="border-r py-2.5">Fri</div>
          <div className="py-2.5">Sat</div>
        </div>

        <div className="flex text-xs leading-6 lg:flex-auto">
          <div className="hidden w-full border-x lg:grid lg:grid-cols-7 lg:grid-rows-5">
            {days.map((day, dayIdx) => (
              !isDesktop ? (
                <button
                  onClick={() => setSelectedDay(day)}
                  key={dayIdx}
                  type="button"
                  className={cn(
                    isEqual(day, selectedDay) && "text-primary-foreground",
                    !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground",
                    !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground",
                    (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                    "flex h-14 flex-col border-b border-r px-3 py-2 hover:bg-muted focus:z-10",
                  )}
                >
                  <time dateTime={format(day, "yyyy-MM-dd")} className={cn(
                    "ml-auto flex size-6 items-center justify-center rounded-full",
                    isEqual(day, selectedDay) && isToday(day) && "bg-primary text-primary-foreground",
                    isEqual(day, selectedDay) && !isToday(day) && "bg-primary text-primary-foreground",
                  )}>{format(day, "d")}</time>
                  {data.filter((date) => isSameDay(date.day, day)).length > 0 && (
                    <div>
                      {data.filter((date) => isSameDay(date.day, day)).map((date) => (
                        <div key={date.day.toString()} className="-mx-0.5 mt-auto flex flex-wrap-reverse">
                          {date.events.map((event) => (
                            <span key={event.id} className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ) : (
                <div
                  key={dayIdx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "bg-accent/50 text-muted-foreground",
                    "relative flex flex-col border-b border-r hover:bg-muted focus:z-10",
                    !isEqual(day, selectedDay) && "hover:bg-accent/75",
                  )}
                >
                  <header className="flex items-center justify-between p-2.5">
                    <button
                      type="button"
                      className={cn(
                        isEqual(day, selectedDay) && "text-primary-foreground",
                        !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground",
                        !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground",
                        isEqual(day, selectedDay) && isToday(day) && "border-none bg-primary",
                        isEqual(day, selectedDay) && !isToday(day) && "bg-foreground",
                        (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs hover:border",
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                    </button>
                  </header>
                  <div className="flex-1 p-2.5">
                    {data.filter((event) => isSameDay(event.day, day)).map((day) => (
                      <div key={day.day.toString()} className="space-y-1.5">
                        {day.events.slice(0, 3).map((event) => (
                          <button
                            key={event.id}
                            className="w-full text-left flex flex-col items-start gap-1 rounded-lg border bg-muted/50 p-2 text-xs leading-tight hover:bg-muted"
                            onClick={() => setOpenEvent({ event, day: day.day })}
                          >
                            <p className="font-medium leading-none">{event.name}</p>
                            <p className="leading-none text-muted-foreground">{event.time}</p>
                          </button>
                        ))}
                        {day.events.length > 3 && (
                          <button
                            className="text-left text-xs text-muted-foreground hover:underline"
                            onClick={() => setOpenDay({ day: day.day, events: day.events })}
                          >
                            + {day.events.length - 3} more
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          <div className="isolate grid w-full grid-cols-7 grid-rows-5 border-x lg:hidden">
            {days.map((day, dayIdx) => (
              <button
                onClick={() => setSelectedDay(day)}
                key={dayIdx}
                type="button"
                className={cn(
                  isEqual(day, selectedDay) && "text-primary-foreground",
                  !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground",
                  !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground",
                  (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                  "flex h-14 flex-col border-b border-r px-3 py-2 hover:bg-muted focus:z-10",
                )}
              >
                <time dateTime={format(day, "yyyy-MM-dd")} className={cn(
                  "ml-auto flex size-6 items-center justify-center rounded-full",
                  isEqual(day, selectedDay) && isToday(day) && "bg-primary text-primary-foreground",
                  isEqual(day, selectedDay) && !isToday(day) && "bg-primary text-primary-foreground",
                )}>{format(day, "d")}</time>
                {data.filter((date) => isSameDay(date.day, day)).length > 0 && (
                  <div>
                    {data.filter((date) => isSameDay(date.day, day)).map((date) => (
                      <div key={date.day.toString()} className="-mx-0.5 mt-auto flex flex-wrap-reverse items-center gap-1">
                        {date.events.slice(0, 3).map((event) => (
                          <button
                            key={event.id}
                            className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground"
                            onClick={() => setOpenEvent({ event, day })}
                            aria-label={event.name}
                          />
                        ))}
                        {date.events.length > 3 && (
                          <button
                            className="ml-1 text-[10px] text-muted-foreground underline"
                            onClick={() => setOpenDay({ day, events: date.events })}
                          >
                            + {date.events.length - 3} more
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {openEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenEvent(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-background p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{openEvent.event.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpenEvent(null)}>Close</Button>
            </div>
            <Separator className="my-3" />
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Due</span>
                <span>{format(new Date(openEvent.event.datetime), "MMM d, yyyy p")}</span>
              </div>
              {openEvent.event.meta?.courseCode && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span>{openEvent.event.meta.courseCode}</span>
                </div>
              )}
              {typeof openEvent.event.meta?.weight === "number" && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Weight</span>
                  <span>{Math.round((openEvent.event.meta.weight || 0) * 100)}%</span>
                </div>
              )}
              {typeof openEvent.event.meta?.maxGrade === "number" && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Max Grade</span>
                  <span>{openEvent.event.meta.maxGrade}</span>
                </div>
              )}
              {typeof openEvent.event.meta?.grade === "number" && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Grade</span>
                  <span>{openEvent.event.meta.grade}</span>
                </div>
              )}
              {openEvent.event.meta?.status && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{openEvent.event.meta.status}</span>
                </div>
              )}
              {openEvent.event.meta?.description && (
                <div
                  className="mt-2 max-h-48 overflow-auto rounded-md border p-3 text-[12px] leading-relaxed prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: openEvent.event.meta.description }}
                />
              )}
              {openEvent.event.meta?.canvasUrl && (
                <div className="pt-2">
                  <a
                    href={openEvent.event.meta.canvasUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] hover:bg-muted"
                  >
                    Open in Canvas
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {openDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenDay(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-background p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{format(openDay.day, "MMMM d, yyyy")}</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpenDay(null)}>Close</Button>
            </div>
            <Separator className="my-3" />
            <div className="space-y-2">
              {openDay.events.map((event) => (
                <button
                  key={event.id}
                  className="w-full text-left rounded-md border p-2 text-xs hover:bg-muted"
                  onClick={() => setOpenEvent({ event, day: openDay.day })}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{event.name}</span>
                    <span className="text-muted-foreground">{event.time}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
