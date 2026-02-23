"use client";

import type { ParsedDemonstrativo } from "@/lib/poker/types";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type DemonstrativoTabProps = {
  demonstrativo: ParsedDemonstrativo[];
};

// Type colors
const TYPE_COLORS: Record<string, string> = {
  Compra: "#3B82F6",
  Venda: "#10B981",
  Transferência: "#8B5CF6",
  Bônus: "#F59E0B",
  Rake: "#EF4444",
  Outros: "#6B7280",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function DemonstrativoTab({ demonstrativo }: DemonstrativoTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const pageSize = 15;

  const filteredData = demonstrativo.filter((row) => {
    if (selectedType && row.type !== selectedType) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.nickname.toLowerCase().includes(query) ||
      row.ppPokerId.includes(query) ||
      row.memoName?.toLowerCase().includes(query) ||
      row.type?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Calculate totals
  const totalRegistros = demonstrativo.length;
  const uniquePlayers = new Set(
    demonstrativo.map((d) => d.ppPokerId).filter(Boolean),
  );
  const totalGastos = demonstrativo.reduce(
    (sum, d) => sum + (d.amount || 0),
    0,
  );

  // Group by type
  const byType = demonstrativo.reduce(
    (acc, d) => {
      const type = d.type || "Outros";
      if (!acc[type]) acc[type] = { count: 0, total: 0 };
      acc[type].count += 1;
      acc[type].total += d.amount || 0;
      return acc;
    },
    {} as Record<string, { count: number; total: number }>,
  );

  const typesList = Object.entries(byType).sort(
    (a, b) => b[1].total - a[1].total,
  );

  if (demonstrativo.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum dado encontrado no demonstrativo
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Row 1: Counters */}
      <div className="flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Registros{" "}
          <span className="text-foreground font-medium">{totalRegistros}</span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Jogadores{" "}
          <span className="text-foreground font-medium">
            {uniquePlayers.size}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Tipos{" "}
          <span className="text-foreground font-medium">
            {typesList.length}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Total{" "}
          <span
            className={cn(
              "font-mono font-medium",
              totalGastos >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalGastos)}
          </span>
        </span>
      </div>

      {/* Row 2: Types with colored dots */}
      <div className="border-t border-border/40 py-2">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {typesList.map(([type, data]) => {
            const color = TYPE_COLORS[type] || TYPE_COLORS.Outros;
            const isSelected = selectedType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedType(isSelected ? null : type);
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
                  isSelected && "bg-muted/50",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{type}</span>
                <span
                  className={cn(
                    "font-mono",
                    data.total >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                  )}
                >
                  {formatCurrency(data.total)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  ({data.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and controls */}
      <div className="border-t border-border/40 flex items-center justify-between py-2">
        <span className="text-xs text-muted-foreground">
          {filteredData.length} registros
          {selectedType && (
            <button
              type="button"
              onClick={() => {
                setSelectedType(null);
                setCurrentPage(1);
              }}
              className="ml-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              (limpar filtro)
            </button>
          )}
        </span>
        <div className="relative w-48">
          <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* Data table */}
      <div className="border-t border-border/40 pt-2 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Tempo
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  ID
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Apelido
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Memorando
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Tipo
                </th>
                <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                  Gastos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum dado encontrado
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr
                    key={`${row.ppPokerId}-${idx}`}
                    className="hover:bg-muted/30"
                  >
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(row.occurredAt)}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {row.ppPokerId}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      {row.nickname}
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {row.memoName || "-"}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              TYPE_COLORS[row.type || "Outros"] ||
                              TYPE_COLORS.Outros,
                          }}
                        />
                        <span className="text-muted-foreground">
                          {row.type || "-"}
                        </span>
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-1.5 px-2 text-right font-mono whitespace-nowrap",
                        row.amount >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                      )}
                    >
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-border/40 flex items-center justify-between py-2">
          <span className="text-[10px] text-muted-foreground">
            {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredData.length)} de{" "}
            {filteredData.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-6 w-6 p-0"
            >
              <Icons.ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-[10px] text-muted-foreground px-2">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-6 w-6 p-0"
            >
              <Icons.ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
