"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import { useSortParams } from "@/hooks/use-sort-params";
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
        <TableHead className="w-[240px] min-w-[240px] md:sticky md:left-0 bg-background z-20 border-r border-border">
          <div className="flex items-center justify-between">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => createSortQuery("nickname")}
            >
              <span>Membro</span>
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

        <TableHead className="w-[120px]">
          <Button
            className="p-0 hover:bg-transparent space-x-2"
            variant="ghost"
            onClick={() => createSortQuery("pppoker_id")}
          >
            <span>PPPoker ID</span>
            {"pppoker_id" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"pppoker_id" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        <TableHead className="w-[120px]">
          <span>Papel</span>
        </TableHead>

        <TableHead className="w-[150px]">
          <span>Agente</span>
        </TableHead>

        <TableHead className="w-[120px]">
          <Button
            className="p-0 hover:bg-transparent space-x-2"
            variant="ghost"
            onClick={() => createSortQuery("created_at")}
          >
            <span>Entrada</span>
            {"created_at" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"created_at" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        <TableHead className="w-[120px] text-right">
          <Button
            className="p-0 hover:bg-transparent space-x-2 ml-auto"
            variant="ghost"
            onClick={() => createSortQuery("credit_limit")}
          >
            <span>Credito</span>
            {"credit_limit" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"credit_limit" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        <TableHead className="w-[120px] text-right">
          <Button
            className="p-0 hover:bg-transparent space-x-2 ml-auto"
            variant="ghost"
            onClick={() => createSortQuery("current_balance")}
          >
            <span>Saldo</span>
            {"current_balance" === column && value === "asc" && (
              <ArrowDown size={16} />
            )}
            {"current_balance" === column && value === "desc" && (
              <ArrowUp size={16} />
            )}
          </Button>
        </TableHead>

        <TableHead className="w-[100px]">
          <span>Status</span>
        </TableHead>
      </TableRow>
    </BaseTableHeader>
  );
}
