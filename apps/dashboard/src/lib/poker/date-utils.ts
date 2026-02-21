import { getWeek, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Shared date utility functions for PPPoker spreadsheet imports and validation.
 *
 * Used across:
 * - poker/import-validation-modal.tsx
 * - poker/league-import-validation-modal.tsx
 * - league/validation-tabs/overview-tab.tsx
 * - su/grade/grade-tab.tsx
 */

/**
 * Get ISO week number from a date string.
 * Tries multiple date formats: dd/MM/yyyy, yyyy-MM-dd.
 * Uses Sunday as week start with firstWeekContainsDate=1 for consistency.
 *
 * @param dateStr - Date string in dd/MM/yyyy or yyyy-MM-dd format
 * @returns Week number (1-53) or null if parsing fails
 */
export function getWeekFromDateString(dateStr: string): number | null {
  try {
    // Try dd/MM/yyyy format first (Brazilian format, most common in PPPoker)
    let date = parse(dateStr, "dd/MM/yyyy", new Date(), { locale: ptBR });
    if (Number.isNaN(date.getTime())) {
      // Try yyyy-MM-dd format (ISO format, used in some contexts)
      date = parse(dateStr, "yyyy-MM-dd", new Date());
    }
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return getWeek(date, { weekStartsOn: 0, firstWeekContainsDate: 1 });
  } catch {
    return null;
  }
}

/**
 * Get ISO week number from a short date string (DD/MM format).
 * Appends the current year (or provided year) before parsing.
 *
 * @param dateStr - Date string in DD/MM format
 * @param year - Optional year to use (defaults to current year)
 * @returns Week number (1-53) or null if parsing fails
 */
export function getWeekFromShortDateString(
  dateStr: string,
  year?: number,
): number | null {
  try {
    const currentYear = year || new Date().getFullYear();
    const date = parse(`${dateStr}/${currentYear}`, "dd/MM/yyyy", new Date(), {
      locale: ptBR,
    });
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return getWeek(date, { weekStartsOn: 0, firstWeekContainsDate: 1 });
  } catch {
    return null;
  }
}

/**
 * Normalize a date-time string to ISO 8601 format (YYYY-MM-DDTHH:MM:00).
 * Handles formats like "2024-01-15 14:30" or "2024/01/15 14:30".
 *
 * @param value - Date-time string or null
 * @returns Normalized ISO string or the trimmed original value
 */
export function normalizeDateTime(value: string | null): string | null {
  if (!value || typeof value !== "string") return value;
  const match = value.match(/(\d{4})[/-](\d{2})[/-](\d{2})\s+(\d{2}:\d{2})/);
  if (!match) return value.trim();
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:00`;
}
