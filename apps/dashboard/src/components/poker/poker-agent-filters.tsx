"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
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

export function PokerAgentFilters() {
  const t = useI18n();
  const { status, setParams } = usePokerPlayerParams();

  const hasActiveFilters = status !== null;

  return (
    <div className="flex items-center gap-2">
      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Filter className="mr-2 h-4 w-4" />
            {status === "active"
              ? t("poker.players.filter.active")
              : status === "inactive"
                ? t("poker.players.filter.inactive")
                : status === "suspended"
                  ? t("poker.players.filter.suspended")
                  : status === "blacklisted"
                    ? t("poker.players.filter.blacklisted")
                    : t("poker.players.filter.all_statuses")}
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
            {t("poker.players.filter.all_statuses")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "active"}
            onCheckedChange={() => setParams({ status: "active" })}
          >
            {t("poker.players.filter.active")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "inactive"}
            onCheckedChange={() => setParams({ status: "inactive" })}
          >
            {t("poker.players.filter.inactive")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "suspended"}
            onCheckedChange={() => setParams({ status: "suspended" })}
          >
            {t("poker.players.filter.suspended")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "blacklisted"}
            onCheckedChange={() => setParams({ status: "blacklisted" })}
          >
            {t("poker.players.filter.blacklisted")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => setParams({ status: null })}
        >
          <Icons.Clear className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
