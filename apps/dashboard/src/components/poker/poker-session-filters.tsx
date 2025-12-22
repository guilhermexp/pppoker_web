"use client";

import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
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

export function PokerSessionFilters() {
  const t = useI18n();
  const { sessionType, gameVariant, setParams, hasFilters } = usePokerSessionParams();

  return (
    <div className="flex items-center gap-2">
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
            {gameVariant ? gameVariant.toUpperCase() : t("poker.sessions.filter.all_games")}
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
