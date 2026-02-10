/**
 * Fortnight resets every second Saturday starting 15 Feb 2026.
 * Returns the period start (Saturday 00:00) for the fortnight containing the given date.
 */
const ANCHOR = new Date("2026-02-15T00:00:00.000Z");

export function getFortnightPeriodStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const anchor = new Date(ANCHOR);
  anchor.setHours(0, 0, 0, 0);
  const diffMs = d.getTime() - anchor.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const periods = Math.floor(diffDays / 14);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + periods * 14);
  return start;
}

export function getPreviousFortnightPeriodStart(date: Date): Date {
  const current = getFortnightPeriodStart(date);
  const prev = new Date(current);
  prev.setDate(prev.getDate() - 14);
  return prev;
}

export function getFortnightPeriodEnd(date: Date): Date {
  const start = getFortnightPeriodStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  end.setHours(23, 59, 59, 999);
  return end;
}
