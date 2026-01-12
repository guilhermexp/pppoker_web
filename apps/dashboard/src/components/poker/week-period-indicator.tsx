"use client";

import { Badge } from "@midpoker/ui/badge";
import { Icons } from "@midpoker/ui/icons";
import { differenceInDays, format, getWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeekPeriodIndicatorProps {
  weekStart: string;
  weekEnd: string;
  status: "open" | "closed";
  clubId?: string;
  isLeague?: boolean;
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

export function WeekPeriodIndicator({
  weekStart,
  weekEnd,
  status,
  clubId,
  isLeague = false,
}: WeekPeriodIndicatorProps) {
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
    <div className="flex items-center gap-4">
      {/* Club ID with type badge - same style as validator */}
      {clubId && (
        <div className="flex items-center gap-2">
          <Icons.GridView className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Clube {clubId}</span>
          {isLeague && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-5 bg-blue-500/20 text-blue-400 border-blue-500/30"
            >
              Liga
            </Badge>
          )}
        </div>
      )}

      {/* Date range with calendar icon - same style as validator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icons.CalendarMonth className="h-4 w-4" />
        <span className="font-medium text-foreground">{dateRange}</span>
        <span className="text-xs">
          ({dayCount} dias · {weekdayRange})
        </span>
      </div>

      {/* Week number badge - same style as validator */}
      <div
        className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-md font-medium ${
          isCurrentWeek
            ? "bg-[#00C969]/10 text-[#00C969]"
            : "bg-amber-500/10 text-amber-500"
        }`}
      >
        <Icons.DateFormat className="h-4 w-4" />
        <span>Semana {weekNumber}</span>
        {!isCurrentWeek && (
          <span className="text-xs opacity-70">(atual: {currentWeek})</span>
        )}
      </div>

      {/* Status badge - only show if not using club header */}
      {!clubId && (
        <div className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-md border border-[#1d1d1d]/50 bg-transparent">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              status === "open" ? "bg-[#00C969] animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {status === "open" ? "Aberta" : "Fechada"}
          </span>
        </div>
      )}
    </div>
  );
}

WeekPeriodIndicator.Skeleton = function WeekPeriodIndicatorSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-5 w-32 bg-muted animate-pulse rounded" />
      <div className="h-5 w-56 bg-muted animate-pulse rounded" />
      <div className="h-7 w-32 bg-muted animate-pulse rounded-md" />
    </div>
  );
};
