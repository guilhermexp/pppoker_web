/**
 * Utilities for poker week period calculations
 * Supports both Monday-Sunday and Sunday-Saturday weeks based on settings
 */

/**
 * Calculate the boundaries of the current week
 * @param weekStartsOnMonday - If true, week runs Mon-Sun. If false, Sun-Sat.
 */
export function getCurrentWeekBoundaries(weekStartsOnMonday = true): {
  weekStart: Date;
  weekEnd: Date;
} {
  const now = new Date();
  return getWeekBoundariesForDate(now, weekStartsOnMonday);
}

/**
 * Calculate week boundaries for a specific date
 * @param date - The date to calculate boundaries for
 * @param weekStartsOnMonday - If true, week runs Mon-Sun. If false, Sun-Sat.
 */
export function getWeekBoundariesForDate(
  date: Date,
  weekStartsOnMonday = true,
): {
  weekStart: Date;
  weekEnd: Date;
} {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...

  let daysToStart: number;

  if (weekStartsOnMonday) {
    // Monday-Sunday: If today is Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
    daysToStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  } else {
    // Sunday-Saturday: dayOfWeek is already the offset from Sunday
    daysToStart = dayOfWeek;
  }

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysToStart);
  weekStart.setHours(0, 0, 0, 0);

  // Week end is always start + 6 days
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Format a date as YYYY-MM-DD for database storage
 */
export function formatDateForDb(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a week range for display (e.g., "23/12 - 29/12")
 */
export function formatWeekRange(
  start: string | Date,
  end: string | Date,
): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Format week range with year (e.g., "23/12/2024 - 29/12/2024")
 */
export function formatWeekRangeWithYear(
  start: string | Date,
  end: string | Date,
): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Check if a date falls within a week period
 */
export function isDateInWeek(
  date: Date | string,
  weekStart: Date | string,
  weekEnd: Date | string,
): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const start = typeof weekStart === "string" ? new Date(weekStart) : weekStart;
  const end = typeof weekEnd === "string" ? new Date(weekEnd) : weekEnd;

  return d >= start && d <= end;
}

/**
 * Get the previous week boundaries relative to a given week
 */
export function getPreviousWeekBoundaries(
  weekStart: Date | string,
  weekStartsOnMonday = true,
): {
  weekStart: Date;
  weekEnd: Date;
} {
  const start =
    typeof weekStart === "string" ? new Date(weekStart) : new Date(weekStart);

  // Go back 7 days to get previous week start
  const prevStart = new Date(start);
  prevStart.setDate(start.getDate() - 7);

  return getWeekBoundariesForDate(prevStart, weekStartsOnMonday);
}

/**
 * Get the next week boundaries relative to a given week
 */
export function getNextWeekBoundaries(
  weekEnd: Date | string,
  weekStartsOnMonday = true,
): {
  weekStart: Date;
  weekEnd: Date;
} {
  const end =
    typeof weekEnd === "string" ? new Date(weekEnd) : new Date(weekEnd);

  // Go forward 1 day to get next week start
  const nextStart = new Date(end);
  nextStart.setDate(end.getDate() + 1);

  return getWeekBoundariesForDate(nextStart, weekStartsOnMonday);
}

/**
 * Get week number in the year (ISO week number)
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Format week as "Semana XX/YYYY" (e.g., "Semana 52/2024")
 */
export function formatWeekLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const weekNumber = getISOWeekNumber(d);
  const year = d.getFullYear();
  return `Semana ${weekNumber.toString().padStart(2, "0")}/${year}`;
}
