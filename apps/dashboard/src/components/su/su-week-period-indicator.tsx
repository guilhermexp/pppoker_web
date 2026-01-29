"use client";

import { Badge } from "@midpoker/ui/badge";
import { Icons } from "@midpoker/ui/icons";
import { differenceInDays, format, getWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SUWeekPeriodIndicatorProps {
  weekStart: string;
  weekEnd: string;
  status: "open" | "closed";
  suId?: string;
}

// Get weekday name in Portuguese
function getWeekdayName(date: Date): string {
  const weekday = format(date, "EEEE", { locale: ptBR });
  return weekday.toLowerCase();
}

// Get current week number
function getCurrentWeekNumber(): number {
  return getWeek(new Date(), { weekStartsOn: 0, firstWeekContainsDate: 1 });
}

export function SUWeekPeriodIndicator({
  weekStart,
  weekEnd,
  status,
  suId,
}: SUWeekPeriodIndicatorProps) {
  // Use parseISO to correctly handle date-only strings without timezone shift
  const startDate = parseISO(weekStart);
  const endDate = parseISO(weekEnd);

  // Format date range
  const dateRange = `${format(startDate, "yyyy-MM-dd")} - ${format(endDate, "yyyy-MM-dd")}`;

  // Calculate day count (inclusive)
  const dayCount = differenceInDays(endDate, startDate) + 1;

  // Get weekday range
  const startWeekday = getWeekdayName(startDate);
  const endWeekday = getWeekdayName(endDate);
  const weekdayRange = `${startWeekday} a ${endWeekday}`;

  // Get week number
  const weekNumber = getWeek(startDate, {
    weekStartsOn: 0,
    firstWeekContainsDate: 1,
  });
  const currentWeek = getCurrentWeekNumber();
  const isCurrentWeek = weekNumber === currentWeek;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4">
      {/* SU badge */}
      <div className="flex items-center gap-2">
        <Icons.GridView className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">Super Union</span>
        {suId && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-5 bg-purple-500/20 text-purple-400 border-purple-500/30"
          >
            {suId}
          </Badge>
        )}
      </div>

      {/* Date range with calendar icon */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
        <Icons.CalendarMonth className="h-4 w-4 shrink-0" />
        <span className="font-medium text-foreground whitespace-nowrap">{dateRange}</span>
        <span className="text-xs whitespace-nowrap hidden sm:inline">
          ({dayCount} dias · {weekdayRange})
        </span>
      </div>

      {/* Week number badge */}
      <div
        className={`flex items-center gap-1.5 text-sm px-2 sm:px-3 py-1 rounded-md font-medium whitespace-nowrap ${
          isCurrentWeek
            ? "bg-[#00C969]/10 text-[#00C969]"
            : "bg-amber-500/10 text-amber-500"
        }`}
      >
        <Icons.DateFormat className="h-4 w-4 shrink-0" />
        <span>Semana {weekNumber}</span>
        {!isCurrentWeek && (
          <span className="text-xs opacity-70">(atual: {currentWeek})</span>
        )}
      </div>

      {/* Status badge */}
      <Badge
        variant={status === "open" ? "default" : "secondary"}
        className={
          status === "open"
            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
            : ""
        }
      >
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
            status === "open" ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        {status === "open" ? "Aberta" : "Fechada"}
      </Badge>
    </div>
  );
}

SUWeekPeriodIndicator.Skeleton = function SUWeekPeriodIndicatorSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4">
      <div className="h-5 w-32 bg-muted animate-pulse rounded" />
      <div className="h-5 w-40 sm:w-56 bg-muted animate-pulse rounded" />
      <div className="h-7 w-28 sm:w-32 bg-muted animate-pulse rounded-md" />
    </div>
  );
};
