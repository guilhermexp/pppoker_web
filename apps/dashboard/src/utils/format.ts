import type { TZDate } from "@date-fns/tz";
import {
  differenceInDays,
  differenceInMonths,
  format,
  isSameYear,
  startOfDay,
} from "date-fns";

export function formatSize(bytes: number): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];

  const unitIndex = Math.max(
    0,
    Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1),
  );

  return Intl.NumberFormat("en-US", {
    style: "unit",
    unit: units[unitIndex],
  }).format(+Math.round(bytes / 1024 ** unitIndex));
}

type FormatAmountParams = {
  currency: string;
  amount: number;
  locale?: string | null;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

export function formatAmount({
  currency,
  amount,
  locale = "en-US",
  minimumFractionDigits,
  maximumFractionDigits,
}: FormatAmountParams) {
  if (!currency) {
    return;
  }

  // Fix: locale can be null, but Intl.NumberFormat expects string | string[] | undefined
  // So, if locale is null, pass undefined instead
  const safeLocale = locale ?? undefined;

  return Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function secondsToHoursAndMinutes(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  if (minutes) {
    return `${minutes}m`;
  }

  return "0m";
}

type BurnRateData = {
  value: number;
  date: string;
};

export function calculateAvgBurnRate(data: BurnRateData[] | null) {
  if (!data) {
    return 0;
  }

  return data?.reduce((acc, curr) => acc + curr.value, 0) / data?.length;
}

export function formatAccountName({
  name = "",
  currency,
}: { name?: string; currency?: string | null }) {
  if (currency) {
    return `${name} (${currency})`;
  }

  return name;
}

export function formatDateRange(dates: TZDate[]): string {
  if (!dates.length) return "";

  const formatFullDate = (date: TZDate) => format(date, "MMM d");
  const formatDay = (date: TZDate) => format(date, "d");

  const startDate = dates[0];
  const endDate = dates[1];

  if (!startDate) return "";

  if (
    dates.length === 1 ||
    !endDate ||
    startDate.getTime() === endDate.getTime()
  ) {
    return formatFullDate(startDate);
  }

  if (startDate.getMonth() === endDate.getMonth()) {
    // Same month
    return `${format(startDate, "MMM")} ${formatDay(startDate)} - ${formatDay(endDate)}`;
  }
  // Different months
  return `${formatFullDate(startDate)} - ${formatFullDate(endDate)}`;
}

export function getDueDateStatus(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);

  // Set both dates to the start of their respective days
  const nowDay = startOfDay(now);
  const dueDay = startOfDay(due);

  const diffDays = differenceInDays(dueDay, nowDay);
  const diffMonths = differenceInMonths(dueDay, nowDay);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  if (diffDays > 0) {
    if (diffMonths < 1) return `in ${diffDays} days`;
    return `in ${diffMonths} month${diffMonths === 1 ? "" : "s"}`;
  }

  if (diffMonths < 1)
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const intervals = [
    { label: "y", seconds: 31536000 },
    { label: "mo", seconds: 2592000 },
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
  ] as const;

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return `${count}${interval.label} ago`;
    }
  }

  return "just now";
}

export function formatNumber(
  value: number,
  locale?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  const safeLocale = locale ?? "en-US";
  return value.toLocaleString(safeLocale, options);
}

export function formatCompactAmount(
  amount: number,
  locale?: string | null,
): string {
  const absAmount = Math.abs(amount);
  const safeLocale = locale ?? "en-US";

  if (absAmount >= 1000000) {
    const formatted = (absAmount / 1000000).toLocaleString(safeLocale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatted}m`;
  }
  // Always show in thousands notation
  const formatted = (absAmount / 1000).toLocaleString(safeLocale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatted}k`;
}

// ---------------------------------------------------------------------------
// Poker-specific formatters (pt-BR / BRL)
// ---------------------------------------------------------------------------

/**
 * Format as BRL currency with R$ prefix and 2 decimal places.
 * Example: formatCurrency(1234.5) => "R$ 1.234,50"
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format as BRL currency with R$ prefix and 0 decimal places.
 * Example: formatCurrencyRounded(1234.5) => "R$ 1.235"
 */
export function formatCurrencyRounded(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with 2 decimal places in pt-BR locale (no currency symbol).
 * Example: formatDecimal(1234.5) => "1.234,50"
 */
export function formatDecimal(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number in pt-BR locale with no decimal places.
 * Example: formatNumberPtBR(1234) => "1.234"
 */
export function formatNumberPtBR(value: number): string {
  return value.toLocaleString("pt-BR");
}

/**
 * Format a number in pt-BR locale, rounding first.
 * Example: formatNumberRounded(1234.7) => "1.235"
 */
export function formatNumberRounded(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

/**
 * Compact currency: integers show without decimals, fractional values
 * show 2 decimal places. No currency symbol.
 * Example: formatCurrencyCompact(100) => "100"
 *          formatCurrencyCompact(100.5) => "100,50"
 */
export function formatCurrencyCompact(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("pt-BR");
  }
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a percentage with 1 decimal place.
 * Example: formatPercent(12.345) => "12.3%"
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format a percentage with 2 decimal places.
 * Example: formatPercentPrecise(12.345) => "12.35%"
 */
export function formatPercentPrecise(value: number): string {
  return `${value.toFixed(2)}%`;
}
