export function startOfLocalDay(date: Date = new Date()): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfLocalDay(date: Date = new Date()): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Whole calendar-day difference between two dates in the local timezone.
 *
 * Computed from the local YYYY-MM-DD keys rather than from milliseconds, so
 * DST transitions (where a calendar day is 23 or 25 hours long) do not shift
 * the day count by one. Positive when `b` is after `a`.
 */
export function localDayDiff(a: Date, b: Date): number {
  const aKey = localDateKey(startOfLocalDay(a));
  const bKey = localDateKey(startOfLocalDay(b));
  const aDate = new Date(`${aKey}T00:00:00Z`);
  const bDate = new Date(`${bKey}T00:00:00Z`);
  return Math.round((bDate.getTime() - aDate.getTime()) / (1000 * 60 * 60 * 24));
}
