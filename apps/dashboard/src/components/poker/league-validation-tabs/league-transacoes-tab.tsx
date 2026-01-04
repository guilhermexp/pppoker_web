"use client";

import type { ParsedTransaction } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type LeagueTransacoesTabProps = {
  transactions: ParsedTransaction[];
};

// Colunas resumidas (mais importantes)
const SUMMARY_COLUMNS = [
  { key: "occurredAt", label: "Tempo", type: "datetime" },
  { key: "senderNickname", label: "Remetente", type: "text" },
  { key: "recipientNickname", label: "Destinatario", type: "text" },
  { key: "creditSent", label: "Cred. Env.", type: "currency" },
  { key: "chipsSent", label: "Fichas Env.", type: "currency" },
  { key: "chipsRedeemed", label: "Fichas Resg.", type: "currency" },
  { key: "ticketSent", label: "Ticket Env.", type: "currency" },
] as const;

// Todas as colunas (21 campos - A ate U)
const ALL_COLUMNS = [
  { key: "occurredAt", label: "Tempo", type: "datetime", group: "Geral" },
  {
    key: "senderClubId",
    label: "ID Clube Rem.",
    type: "id",
    group: "Remetente",
  },
  {
    key: "senderPlayerId",
    label: "ID Jogador Rem.",
    type: "id",
    group: "Remetente",
  },
  {
    key: "senderNickname",
    label: "Apelido Rem.",
    type: "text",
    group: "Remetente",
  },
  {
    key: "senderMemoName",
    label: "Memo Rem.",
    type: "text",
    group: "Remetente",
  },
  {
    key: "recipientPlayerId",
    label: "ID Jogador Dest.",
    type: "id",
    group: "Destinatario",
  },
  {
    key: "recipientNickname",
    label: "Apelido Dest.",
    type: "text",
    group: "Destinatario",
  },
  {
    key: "recipientMemoName",
    label: "Memo Dest.",
    type: "text",
    group: "Destinatario",
  },
  {
    key: "creditSent",
    label: "Cred. Enviado",
    type: "currency",
    group: "Credito",
  },
  {
    key: "creditRedeemed",
    label: "Cred. Resgatado",
    type: "currency",
    group: "Credito",
  },
  {
    key: "creditLeftClub",
    label: "Cred. Saiu",
    type: "currency",
    group: "Credito",
  },
  {
    key: "chipsSent",
    label: "Fichas Enviadas",
    type: "currency",
    group: "Fichas",
  },
  {
    key: "chipsRedeemed",
    label: "Fichas Resg.",
    type: "currency",
    group: "Fichas",
  },
  {
    key: "chipsLeftClub",
    label: "Fichas Saiu",
    type: "currency",
    group: "Fichas",
  },
  {
    key: "ticketSent",
    label: "Ticket Enviado",
    type: "currency",
    group: "Ticket",
  },
  {
    key: "ticketRedeemed",
    label: "Ticket Resgatado",
    type: "currency",
    group: "Ticket",
  },
  {
    key: "ticketExpired",
    label: "Ticket Expirado",
    type: "currency",
    group: "Ticket",
  },
] as const;

export function LeagueTransacoesTab({
  transactions,
}: LeagueTransacoesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filteredData = transactions.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.senderNickname?.toLowerCase().includes(query) ||
      t.recipientNickname?.toLowerCase().includes(query) ||
      t.senderPlayerId?.includes(query) ||
      t.recipientPlayerId?.includes(query) ||
      t.senderClubId?.includes(query)
    );
  });

  const columns = expanded ? ALL_COLUMNS : SUMMARY_COLUMNS;

  // Calculate totals
  const totalTransactions = transactions.length;
  const uniqueSenders = new Set(
    transactions.map((t) => t.senderPlayerId).filter(Boolean),
  );
  const uniqueRecipients = new Set(
    transactions.map((t) => t.recipientPlayerId).filter(Boolean),
  );

  const totalCreditSent = transactions.reduce(
    (sum, t) => sum + (t.creditSent || 0),
    0,
  );
  const totalCreditRedeemed = transactions.reduce(
    (sum, t) => sum + (t.creditRedeemed || 0),
    0,
  );
  const totalChipsSent = transactions.reduce(
    (sum, t) => sum + (t.chipsSent || 0),
    0,
  );
  const totalChipsRedeemed = transactions.reduce(
    (sum, t) => sum + (t.chipsRedeemed || 0),
    0,
  );
  const totalTicketSent = transactions.reduce(
    (sum, t) => sum + (t.ticketSent || 0),
    0,
  );
  const totalTicketRedeemed = transactions.reduce(
    (sum, t) => sum + (t.ticketRedeemed || 0),
    0,
  );
  const totalTicketExpired = transactions.reduce(
    (sum, t) => sum + (t.ticketExpired || 0),
    0,
  );

  if (transactions.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhuma transacao encontrada
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Stats */}
      <div className="border rounded-lg bg-muted/20 p-4 space-y-3">
        {/* Row 1: Contagens */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Transações:</span>
            <span className="text-sm font-semibold">{totalTransactions}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Remetentes:</span>
            <span className="text-sm font-semibold">{uniqueSenders.size}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Destinatários:
            </span>
            <span className="text-sm font-semibold">
              {uniqueRecipients.size}
            </span>
          </div>
        </div>

        {/* Row 2: Valores */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Crédito:</span>
            <span
              className={`text-sm font-semibold font-mono ${(totalCreditSent - totalCreditRedeemed) >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {(totalCreditSent - totalCreditRedeemed).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Fichas:</span>
            <span
              className={`text-sm font-semibold font-mono ${(totalChipsSent - totalChipsRedeemed) >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {(totalChipsSent - totalChipsRedeemed).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Ticket:</span>
            <span
              className={`text-sm font-semibold font-mono ${(totalTicketSent - totalTicketRedeemed - totalTicketExpired) >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {(
                totalTicketSent -
                totalTicketRedeemed -
                totalTicketExpired
              ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </div>

        {/* Row 3: Detalhado */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            DETALHADO
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Crédito Env:{" "}
              <span className="font-mono">
                {totalCreditSent.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
            <span>
              Crédito Resg:{" "}
              <span className="font-mono">
                {totalCreditRedeemed.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
            <span>
              Fichas Env:{" "}
              <span className="font-mono">
                {totalChipsSent.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
            <span>
              Fichas Resg:{" "}
              <span className="font-mono">
                {totalChipsRedeemed.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
            <span>
              Ticket Env:{" "}
              <span className="font-mono">
                {totalTicketSent.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
            <span>
              Ticket Resg:{" "}
              <span className="font-mono">
                {totalTicketRedeemed.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
            <span>
              Ticket Exp:{" "}
              <span className="font-mono">
                {totalTicketExpired.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#878787]">
            {transactions.length} transacoes
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-4 h-4 mr-1" />
                Resumido ({SUMMARY_COLUMNS.length} cols)
              </>
            ) : (
              <>
                Expandir ({ALL_COLUMNS.length} cols)
                <Icons.ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
        <div className="relative w-64">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar transacao..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className={`w-full text-xs ${expanded ? "min-w-[1800px]" : "min-w-[900px]"}`}
          >
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`p-2 font-medium whitespace-nowrap ${
                      col.type === "currency" || col.type === "number"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.slice(0, 100).map((row, idx) => (
                <tr
                  key={`${row.occurredAt}-${idx}`}
                  className="hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-2 whitespace-nowrap ${
                        col.type === "currency" || col.type === "number"
                          ? "text-right font-mono"
                          : col.type === "id"
                            ? "font-mono text-[#878787]"
                            : col.type === "datetime"
                              ? "text-[#878787]"
                              : ""
                      }`}
                    >
                      {formatValue(
                        row[col.key as keyof ParsedTransaction],
                        col.type,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length > 100 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            +{filteredData.length - 100} transacoes adicionais
          </p>
        )}
      </div>
    </div>
  );
}

function formatValue(
  value: string | number | null | undefined,
  type: string,
): string {
  if (value === null || value === undefined) return "-";

  switch (type) {
    case "datetime":
      try {
        const date = new Date(String(value));
        return format(date, "dd/MM HH:mm", { locale: ptBR });
      } catch {
        return String(value);
      }
    case "currency":
      return typeof value === "number"
        ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "-";
    case "number":
      return typeof value === "number" ? value.toLocaleString("pt-BR") : "-";
    case "id":
      return String(value);
    default:
      return String(value) || "-";
  }
}
