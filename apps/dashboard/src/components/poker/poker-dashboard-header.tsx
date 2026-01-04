"use client";

import { PokerCustomize } from "@/components/widgets/poker/poker-customize";
import { usePokerDashboardParams } from "@/hooks/use-poker-dashboard-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Button } from "@midday/ui/button";
import { Calendar } from "@midday/ui/calendar";
import { Icons } from "@midday/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@midday/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CloseWeekPreviewModal } from "./close-week-preview-modal";
import { PendingWeeksWarning } from "./pending-weeks-warning";
import { WeekPeriodIndicator } from "./week-period-indicator";
import { WeekViewToggle } from "./week-view-toggle";

const quickSelections = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "this_month", days: 0 },
  { key: "last_month", days: -1 },
] as const;

export function PokerDashboardHeader() {
  const t = useI18n();
  const trpc = useTRPC();
  const {
    from,
    to,
    setParams,
    hasDateFilter,
    viewMode,
    setViewMode,
    isCurrentWeekView,
  } = usePokerDashboardParams();

  const [closeWeekModalOpen, setCloseWeekModalOpen] = useState(false);
  const [selectedWeekPeriodId, setSelectedWeekPeriodId] = useState<
    string | undefined
  >();

  // Fetch open periods - use the most recent one as "current" week
  // This shows data from IMPORTED weeks, not calculated from today's date
  const { data: openPeriods, isLoading: isLoadingOpenPeriods } = useQuery(
    trpc.poker.weekPeriods.getOpenPeriods.queryOptions(),
  );

  // The "current" week is the most recent open period (first in list, sorted by week_start desc)
  const currentWeek = openPeriods?.[0] ?? null;
  const isLoadingCurrentWeek = isLoadingOpenPeriods;

  const dateRange: DateRange = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };

  const handleSelect = (range?: DateRange) => {
    setParams({
      from: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      to: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  const handleQuickSelect = (key: string) => {
    const now = new Date();

    if (key === "this_month") {
      setParams({
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      });
    } else if (key === "last_month") {
      const lastMonth = subMonths(now, 1);
      setParams({
        from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      });
    } else {
      const days = Number.parseInt(key.replace("d", ""), 10);
      setParams({
        from: format(subDays(now, days), "yyyy-MM-dd"),
        to: format(now, "yyyy-MM-dd"),
      });
    }
  };

  const formatDateLabel = () => {
    if (!from && !to) {
      return t("poker.dashboard.all_time");
    }
    if (from && to) {
      return `${format(new Date(from), "dd/MM/yy")} - ${format(new Date(to), "dd/MM/yy")}`;
    }
    if (from) {
      return `${t("poker.dashboard.from")} ${format(new Date(from), "dd/MM/yy")}`;
    }
    return `${t("poker.dashboard.to")} ${format(new Date(to!), "dd/MM/yy")}`;
  };

  const handleCloseWeekClick = (weekId: string) => {
    setSelectedWeekPeriodId(weekId);
    setCloseWeekModalOpen(true);
  };

  const handleCloseCurrentWeek = () => {
    if (currentWeek) {
      setSelectedWeekPeriodId(currentWeek.id);
      setCloseWeekModalOpen(true);
    }
  };

  const handleCloseWeekSuccess = () => {
    // Switch to historical view after closing
    setViewMode("historical");
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Pending weeks warning - only show if there are OTHER open periods besides the displayed one */}
      {openPeriods && openPeriods.length > 1 && (
        <PendingWeeksWarning
          pendingWeeks={openPeriods.slice(1)} // Exclude the first one (already being displayed)
          currentWeekId={currentWeek?.id}
          onCloseClick={handleCloseWeekClick}
        />
      )}

      {/* Main header row */}
      <div className="flex justify-between items-center">
        {/* Left side - Week indicator and Close Week button */}
        <div className="flex items-center gap-3">
          {isLoadingCurrentWeek ? (
            <WeekPeriodIndicator.Skeleton />
          ) : currentWeek ? (
            <WeekPeriodIndicator
              weekStart={currentWeek.weekStart}
              weekEnd={currentWeek.weekEnd}
              status={currentWeek.status}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.CalendarMonth className="h-4 w-4" />
              <span>{t("poker.weekPeriod.noOpenPeriods")}</span>
            </div>
          )}

          {isCurrentWeekView && currentWeek?.status === "open" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseCurrentWeek}
            >
              <Icons.Check className="h-4 w-4 mr-2" />
              {t("poker.weekPeriod.closeWeek")}
            </Button>
          )}
        </div>

        {/* Center - View mode toggle */}
        <WeekViewToggle
          value={viewMode}
          onChange={setViewMode}
          disabled={isLoadingCurrentWeek}
        />

        {/* Right side - Filters and Actions */}
        <div className="flex items-center gap-2">
          {/* Date Range Picker - only show in historical mode */}
          {!isCurrentWeekView && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[140px] justify-start"
                >
                  <Icons.CalendarMonth className="mr-2 h-4 w-4" />
                  <span className="text-sm">{formatDateLabel()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                  {/* Quick selections */}
                  <div className="border-r p-2 space-y-1">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {t("poker.dashboard.quick_select")}
                    </p>
                    {quickSelections.map((item) => (
                      <Button
                        key={item.key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm"
                        onClick={() => handleQuickSelect(item.key)}
                      >
                        {t(`poker.dashboard.period_${item.key}` as any)}
                      </Button>
                    ))}
                    {hasDateFilter && (
                      <>
                        <div className="h-px bg-border my-2" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm text-muted-foreground"
                          onClick={() => setParams(null)}
                        >
                          <Icons.Clear className="mr-2 h-3 w-3" />
                          {t("poker.dashboard.clear_filter")}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Calendar */}
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleSelect}
                    numberOfMonths={2}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Quick Actions */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/poker/import">
              <Icons.Import className="mr-2 h-4 w-4" />
              {t("poker.dashboard.import")}
            </Link>
          </Button>

          {/* Customize Widgets */}
          <PokerCustomize />
        </div>
      </div>

      {/* Close Week Preview Modal */}
      <CloseWeekPreviewModal
        open={closeWeekModalOpen}
        onOpenChange={setCloseWeekModalOpen}
        weekPeriodId={selectedWeekPeriodId}
        onSuccess={handleCloseWeekSuccess}
      />
    </div>
  );
}
