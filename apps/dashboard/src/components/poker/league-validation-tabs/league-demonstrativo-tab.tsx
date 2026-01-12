"use client";

import type { ParsedDemonstrativo } from "@/lib/poker/types";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type LeagueDemonstrativoTabProps = {
  demonstrativo: ParsedDemonstrativo[];
};

export function LeagueDemonstrativoTab({
  demonstrativo,
}: LeagueDemonstrativoTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredData = demonstrativo.filter((row) => {
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
      if (!acc[type]) acc[type] = 0;
      acc[type] += d.amount || 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Stats */}
      <div className="border rounded-lg bg-muted/20 p-4 space-y-3">
        {/* Row 1: Contagens */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Registros:</span>
            <span className="text-sm font-semibold">{totalRegistros}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Jogadores:</span>
            <span className="text-sm font-semibold">{uniquePlayers.size}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Tipos:</span>
            <span className="text-sm font-semibold">
              {Object.keys(byType).length}
            </span>
          </div>
        </div>

        {/* Row 2: Valores */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Total Gastos:</span>
            <span
              className={`text-sm font-semibold font-mono ${totalGastos >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {totalGastos.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>

        {/* Row 3: Por Tipo */}
        {Object.keys(byType).length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              POR TIPO
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {Object.entries(byType).map(([type, amount]) => (
                <span key={type}>
                  {type}:{" "}
                  <span
                    className={`font-mono font-medium ${amount >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
                  >
                    {amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#878787]">
          {demonstrativo.length} registros
        </p>
        <div className="relative w-64">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Tempo</th>
              <th className="text-left p-3 font-medium">ID</th>
              <th className="text-left p-3 font-medium">Apelido</th>
              <th className="text-left p-3 font-medium">Memorando</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-right p-3 font-medium">Gastos</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#878787]">
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={`${row.ppPokerId}-${idx}`}
                  className="hover:bg-muted/30"
                >
                  <td className="p-3 text-[#878787]">
                    {formatDateTime(row.occurredAt)}
                  </td>
                  <td className="p-3 font-mono text-xs text-[#878787]">
                    {row.ppPokerId}
                  </td>
                  <td className="p-3">{row.nickname}</td>
                  <td className="p-3 text-[#878787]">{row.memoName || "-"}</td>
                  <td className="p-3 text-[#878787]">{row.type || "-"}</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#878787]">
            {(currentPage - 1) * pageSize + 1} -{" "}
            {Math.min(currentPage * pageSize, filteredData.length)} de{" "}
            {filteredData.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <Icons.ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-[#878787]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <Icons.ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
