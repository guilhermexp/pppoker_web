"use client";

import { PokerDateFilter } from "@/components/poker/poker-date-filter";
import { usePokerSettlementParams } from "@/hooks/use-poker-settlement-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midday/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@midday/ui/dropdown-menu";
import { Icons } from "@midday/ui/icons";

export function PokerSettlementFilters() {
  const t = useI18n();
  const { status, periodStart, periodEnd, setParams, hasFilters } = usePokerSettlementParams();

  return (
    <div className="flex items-center gap-2">
      {/* Date Range Filter */}
      <PokerDateFilter
        from={periodStart}
        to={periodEnd}
        onChange={(params) => setParams({ periodStart: params.from, periodEnd: params.to })}
      />

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Filter className="mr-2 h-4 w-4" />
            {status === "pending"
              ? t("poker.settlements.status.pending")
              : status === "partial"
                ? t("poker.settlements.status.partial")
                : status === "completed"
                  ? t("poker.settlements.status.completed")
                  : status === "disputed"
                    ? t("poker.settlements.status.disputed")
                    : t("poker.settlements.filter.all_statuses")}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={status === null}
            onCheckedChange={() => setParams({ status: null })}
          >
            {t("poker.settlements.filter.all_statuses")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "pending"}
            onCheckedChange={() => setParams({ status: "pending" })}
          >
            {t("poker.settlements.status.pending")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "partial"}
            onCheckedChange={() => setParams({ status: "partial" })}
          >
            {t("poker.settlements.status.partial")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "completed"}
            onCheckedChange={() => setParams({ status: "completed" })}
          >
            {t("poker.settlements.status.completed")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "disputed"}
            onCheckedChange={() => setParams({ status: "disputed" })}
          >
            {t("poker.settlements.status.disputed")}
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
