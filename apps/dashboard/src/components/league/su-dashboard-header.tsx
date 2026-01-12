"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@midpoker/ui/button";
import { Calendar } from "@midpoker/ui/calendar";
import { Icons } from "@midpoker/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@midpoker/ui/popover";
import { Skeleton } from "@midpoker/ui/skeleton";
import { cn } from "@midpoker/ui/cn";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import Link from "next/link";
import type { DateRange } from "react-day-picker";

const quickSelections = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "this_month", days: 0 },
  { key: "last_month", days: -1 },
] as const;

interface SUDashboardHeaderProps {
  from?: string | null;
  to?: string | null;
  viewMode?: "current_week" | "historical" | null;
  onParamsChange?: (params: { from?: string | null; to?: string | null; viewMode?: "current_week" | "historical" | null }) => void;
}

export function SUDashboardHeader({ from, to, viewMode, onParamsChange }: SUDashboardHeaderProps = {}) {
  const trpc = useTRPC();
  const { data: openPeriods, isLoading: isLoadingOpenPeriods } =
    useQuery(trpc.su.weekPeriods.getOpenPeriods.queryOptions());
  const currentWeek = openPeriods?.[0] ?? null;

  const dateRange: DateRange = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };

  const hasDateFilter = !!(from || to);
  const isCurrentWeekView = viewMode === "current_week" || !viewMode;

  const handleSelect = (range?: DateRange) => {
    onParamsChange?.({
      from: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      to: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  const handleQuickSelect = (key: string) => {
    const now = new Date();

    if (key === "this_month") {
      onParamsChange?.({
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      });
    } else if (key === "last_month") {
      const lastMonth = subMonths(now, 1);
      onParamsChange?.({
        from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      });
    } else {
      const days = Number.parseInt(key.replace("d", ""), 10);
      onParamsChange?.({
        from: format(subDays(now, days), "yyyy-MM-dd"),
        to: format(now, "yyyy-MM-dd"),
      });
    }
  };

  const formatDateLabel = () => {
    if (!from && !to) {
      return "Todo período";
    }
    if (from && to) {
      return `${format(new Date(from), "dd/MM/yy")} - ${format(new Date(to), "dd/MM/yy")}`;
    }
    if (from) {
      return `De ${format(new Date(from), "dd/MM/yy")}`;
    }
    return `Até ${format(new Date(to!), "dd/MM/yy")}`;
  };

  const handleViewModeChange = (value: string) => {
    if (value) {
      onParamsChange?.({ viewMode: value as "current_week" | "historical" });
    }
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Main header row */}
      <div className="flex justify-between items-center">
        {/* Left side - Week indicator */}
        <div className="flex items-center gap-3">
          {isLoadingOpenPeriods ? (
            <Skeleton className="h-8 w-48" />
          ) : currentWeek ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-md border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">
                Semana {format(new Date(currentWeek.week_start), "dd/MM")} - {format(new Date(currentWeek.week_end), "dd/MM")}
              </span>
              <span className="text-xs text-muted-foreground">
                ({currentWeek.status === "open" ? "Aberta" : "Fechada"})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.CalendarMonth className="h-4 w-4" />
              <span>Super Union - Nenhum período importado</span>
            </div>
          )}
        </div>

        {/* Center - View mode toggle */}
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => handleViewModeChange("current_week")}
            className={cn(
              "flex items-center px-3 py-1.5 text-sm rounded-md transition-colors",
              isCurrentWeekView
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icons.CalendarMonth className="h-4 w-4 mr-2" />
            Semana Atual
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange("historical")}
            className={cn(
              "flex items-center px-3 py-1.5 text-sm rounded-md transition-colors",
              !isCurrentWeekView
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icons.History className="h-4 w-4 mr-2" />
            Histórico
          </button>
        </div>

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
                      Seleção rápida
                    </p>
                    {quickSelections.map((item) => (
                      <Button
                        key={item.key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm"
                        onClick={() => handleQuickSelect(item.key)}
                      >
                        {item.key === "7d" && "Últimos 7 dias"}
                        {item.key === "30d" && "Últimos 30 dias"}
                        {item.key === "90d" && "Últimos 90 dias"}
                        {item.key === "this_month" && "Este mês"}
                        {item.key === "last_month" && "Mês passado"}
                      </Button>
                    ))}
                    {hasDateFilter && (
                      <>
                        <div className="h-px bg-border my-2" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm text-muted-foreground"
                          onClick={() => onParamsChange?.({ from: null, to: null })}
                        >
                          <Icons.Clear className="mr-2 h-3 w-3" />
                          Limpar filtro
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
            <Link href="/poker/league-import">
              <Icons.Import className="mr-2 h-4 w-4" />
              Importar
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
