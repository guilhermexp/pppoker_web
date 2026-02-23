"use client";

import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { Calendar } from "@midpoker/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@midpoker/ui/popover";
import { format, parseISO } from "date-fns";

function formatDateRange(
  dateFrom: string | null,
  dateTo: string | null,
): string {
  if (!dateFrom && !dateTo) return "Período";

  const fromDate = dateFrom ? parseISO(dateFrom) : null;
  const toDate = dateTo ? parseISO(dateTo) : null;

  if (fromDate && toDate) {
    return `${format(fromDate, "dd/MM")} - ${format(toDate, "dd/MM")}`;
  }
  if (fromDate) {
    return `Desde ${format(fromDate, "dd/MM/yyyy")}`;
  }
  if (toDate) {
    return `Até ${format(toDate, "dd/MM/yyyy")}`;
  }
  return "Período";
}

export function PokerSessionFilters() {
  const t = useI18n();
  const { sessionType, gameVariant, dateFrom, dateTo, setParams, hasFilters } =
    usePokerSessionParams();

  const dateRange =
    dateFrom || dateTo
      ? {
          from: dateFrom ? parseISO(dateFrom) : undefined,
          to: dateTo ? parseISO(dateTo) : undefined,
        }
      : undefined;

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setParams({
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.CalendarMonth className="mr-2 h-4 w-4" />
            {formatDateRange(dateFrom, dateTo)}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Session Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Time className="mr-2 h-4 w-4" />
            {sessionType === "cash_game"
              ? t("poker.sessions.type.cash_game")
              : sessionType === "mtt"
                ? t("poker.sessions.type.mtt")
                : sessionType === "sit_n_go"
                  ? t("poker.sessions.type.sit_n_go")
                  : sessionType === "spin"
                    ? t("poker.sessions.type.spin")
                    : t("poker.sessions.filter.all_types")}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Session Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={sessionType === null}
            onCheckedChange={() => setParams({ sessionType: null })}
          >
            {t("poker.sessions.filter.all_types")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sessionType === "cash_game"}
            onCheckedChange={() => setParams({ sessionType: "cash_game" })}
          >
            {t("poker.sessions.type.cash_game")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sessionType === "mtt"}
            onCheckedChange={() => setParams({ sessionType: "mtt" })}
          >
            {t("poker.sessions.type.mtt")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sessionType === "sit_n_go"}
            onCheckedChange={() => setParams({ sessionType: "sit_n_go" })}
          >
            {t("poker.sessions.type.sit_n_go")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sessionType === "spin"}
            onCheckedChange={() => setParams({ sessionType: "spin" })}
          >
            {t("poker.sessions.type.spin")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Game Variant Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Category className="mr-2 h-4 w-4" />
            {gameVariant
              ? gameVariant.toUpperCase()
              : t("poker.sessions.filter.all_games")}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Game</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={gameVariant === null}
            onCheckedChange={() => setParams({ gameVariant: null })}
          >
            {t("poker.sessions.filter.all_games")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={gameVariant === "nlh"}
            onCheckedChange={() => setParams({ gameVariant: "nlh" })}
          >
            NL Hold'em
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={gameVariant === "plo4"}
            onCheckedChange={() => setParams({ gameVariant: "plo4" })}
          >
            PLO4
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={gameVariant === "plo5"}
            onCheckedChange={() => setParams({ gameVariant: "plo5" })}
          >
            PLO5
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={gameVariant === "plo6"}
            onCheckedChange={() => setParams({ gameVariant: "plo6" })}
          >
            PLO6
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={gameVariant === "ofc"}
            onCheckedChange={() => setParams({ gameVariant: "ofc" })}
          >
            OFC
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={gameVariant === "nlh_6plus"}
            onCheckedChange={() => setParams({ gameVariant: "nlh_6plus" })}
          >
            Short Deck (6+)
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => setParams(null)}
        >
          <Icons.Clear className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
