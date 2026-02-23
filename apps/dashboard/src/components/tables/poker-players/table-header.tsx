"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import { useSortParams } from "@/hooks/use-sort-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import {
  TableHeader as BaseTableHeader,
  TableHead,
  TableRow,
} from "@midpoker/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";

interface Props {
  tableScroll?: {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    isScrollable: boolean;
    scrollLeft: () => void;
    scrollRight: () => void;
  };
}

export function TableHeader({ tableScroll }: Props) {
  const { params, setParams } = useSortParams();
  const t = useI18n();

  const [column, value] = params.sort || [];

  const createSortQuery = (name: string) => {
    const [currentColumn, currentValue] = params.sort || [];

    if (name === currentColumn) {
      if (currentValue === "asc") {
        setParams({ sort: [name, "desc"] });
      } else if (currentValue === "desc") {
        setParams({ sort: null });
      } else {
        setParams({ sort: [name, "asc"] });
      }
    } else {
      setParams({ sort: [name, "asc"] });
    }
  };

  return (
    <BaseTableHeader className="border-l-0 border-r-0">
      <TableRow>
        {/* Player (sticky left) */}
        <TableHead className="w-[240px] min-w-[240px] md:sticky md:left-0 bg-background z-20 border-r border-border before:absolute before:right-0 before:top-0 before:bottom-0 before:w-px before:bg-border after:absolute after:right-[-24px] after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-l after:from-transparent after:to-background after:z-[-1]">
          <div className="flex items-center justify-between">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("nickname")}
            >
              <span>{t("poker.players.table.player")}</span>
              {"nickname" === column && value === "asc" && (
                <ArrowDown size={16} />
              )}
              {"nickname" === column && value === "desc" && (
                <ArrowUp size={16} />
              )}
            </Button>
            {tableScroll?.isScrollable && (
              <HorizontalPagination
                canScrollLeft={tableScroll.canScrollLeft}
                canScrollRight={tableScroll.canScrollRight}
                onScrollLeft={tableScroll.scrollLeft}
                onScrollRight={tableScroll.scrollRight}
                className="ml-auto hidden md:flex"
              />
            )}
          </div>
        </TableHead>

        {/* PPPoker ID */}
        <TableHead className="w-[120px]">
          <Button
            className="p-0 hover:bg-transparent space-x-2"
            variant="ghost"
            onClick={() => createSortQuery("ppPokerId")}
          >
            <span>{t("poker.players.table.pppoker_id")}</span>
            {"ppPokerId" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"ppPokerId" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        {/* Status (Activity) */}
        <TableHead className="w-[100px]">
          <span>{t("poker.players.table.status")}</span>
        </TableHead>

        {/* Agent */}
        <TableHead className="w-[150px]">
          <Button
            className="p-0 hover:bg-transparent space-x-2"
            variant="ghost"
            onClick={() => createSortQuery("agent")}
          >
            <span>{t("poker.players.table.agent")}</span>
            {"agent" === column && value === "asc" && <ArrowDown size={16} />}
            {"agent" === column && value === "desc" && <ArrowUp size={16} />}
          </Button>
        </TableHead>

        {/* Balance */}
        <TableHead className="w-[120px] text-right">
          <Button
            className="p-0 hover:bg-transparent space-x-2 ml-auto"
            variant="ghost"
            onClick={() => createSortQuery("currentBalance")}
          >
            <span>{t("poker.players.table.balance")}</span>
            {"currentBalance" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"currentBalance" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        {/* Chips */}
        <TableHead className="w-[120px] text-right">
          <Button
            className="p-0 hover:bg-transparent space-x-2 ml-auto"
            variant="ghost"
            onClick={() => createSortQuery("chipBalance")}
          >
            <span>{t("poker.players.table.chips")}</span>
            {"chipBalance" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"chipBalance" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        {/* Credit Limit */}
        <TableHead className="w-[120px] text-right">
          <Button
            className="p-0 hover:bg-transparent space-x-2 ml-auto"
            variant="ghost"
            onClick={() => createSortQuery("creditLimit")}
          >
            <span>{t("poker.players.table.credit_limit")}</span>
            {"creditLimit" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"creditLimit" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        {/* Taxa (Rake) */}
        <TableHead className="w-[100px] text-right">
          <span>Taxa</span>
        </TableHead>

        {/* Ganhos (Winnings) */}
        <TableHead className="w-[100px] text-right">
          <span>Ganhos</span>
        </TableHead>

        {/* Contact */}
        <TableHead className="w-[200px]">
          <span>{t("poker.players.table.contact")}</span>
        </TableHead>

        {/* Actions (sticky right) */}
        <TableHead
          className={cn(
            "w-[50px] md:sticky md:right-0 bg-background z-30",
            "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-border",
            "after:absolute after:left-[-24px] after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-r after:from-transparent after:to-background after:z-[-1]",
          )}
        />
      </TableRow>
    </BaseTableHeader>
  );
}
