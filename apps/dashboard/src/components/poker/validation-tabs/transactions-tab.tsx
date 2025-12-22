"use client";

import type { ParsedTransaction } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type TransactionsTabProps = {
  transactions: ParsedTransaction[];
};

// Colunas resumidas (mais importantes)
const SUMMARY_COLUMNS = [
  { key: "occurredAt", label: "Tempo", type: "datetime" },
  { key: "senderNickname", label: "Remetente", type: "text" },
  { key: "recipientNickname", label: "Destinatário", type: "text" },
  { key: "creditSent", label: "Créd. Env.", type: "currency" },
  { key: "chipsSent", label: "Fichas Env.", type: "currency" },
  { key: "chipsRedeemed", label: "Fichas Resg.", type: "currency" },
  { key: "ticketSent", label: "Ticket Env.", type: "currency" },
] as const;

// Todas as colunas (21 campos - A até U)
const ALL_COLUMNS = [
  // Tempo (A)
  { key: "occurredAt", label: "Tempo", type: "datetime", group: "Geral" },
  // Remetente (B-E)
  { key: "senderClubId", label: "ID Clube Rem.", type: "id", group: "Remetente" },
  { key: "senderPlayerId", label: "ID Jogador Rem.", type: "id", group: "Remetente" },
  { key: "senderNickname", label: "Apelido Rem.", type: "text", group: "Remetente" },
  { key: "senderMemoName", label: "Memo Rem.", type: "text", group: "Remetente" },
  // Destinatário (F-H)
  { key: "recipientPlayerId", label: "ID Jogador Dest.", type: "id", group: "Destinatário" },
  { key: "recipientNickname", label: "Apelido Dest.", type: "text", group: "Destinatário" },
  { key: "recipientMemoName", label: "Memo Dest.", type: "text", group: "Destinatário" },
  // Dar crédito (I-K)
  { key: "creditSent", label: "Créd. Enviado", type: "currency", group: "Crédito" },
  { key: "creditRedeemed", label: "Créd. Resgatado", type: "currency", group: "Crédito" },
  { key: "creditLeftClub", label: "Créd. Saiu", type: "currency", group: "Crédito" },
  // Fichas (L-R)
  { key: "chipsSent", label: "Fichas Enviadas", type: "currency", group: "Fichas" },
  { key: "classificationPpsr", label: "Class. PPSR", type: "number", group: "Fichas" },
  { key: "classificationRing", label: "Class. Ring", type: "number", group: "Fichas" },
  { key: "classificationCustomRing", label: "Class. RG Pers.", type: "number", group: "Fichas" },
  { key: "classificationMtt", label: "Class. MTT", type: "number", group: "Fichas" },
  { key: "chipsRedeemed", label: "Fichas Resg.", type: "currency", group: "Fichas" },
  { key: "chipsLeftClub", label: "Fichas Saiu", type: "currency", group: "Fichas" },
  // Ticket (S-U)
  { key: "ticketSent", label: "Ticket Enviado", type: "currency", group: "Ticket" },
  { key: "ticketRedeemed", label: "Ticket Resgatado", type: "currency", group: "Ticket" },
  { key: "ticketExpired", label: "Ticket Expirado", type: "currency", group: "Ticket" },
] as const;

export function TransactionsTab({ transactions }: TransactionsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

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
  // Unique senders and recipients
  const uniqueSenders = new Set(transactions.map((t) => t.senderPlayerId).filter(Boolean));
  const uniqueRecipients = new Set(transactions.map((t) => t.recipientPlayerId).filter(Boolean));

  // Chips sent per sender (aggregated by sender ID)
  const chipsBySender = transactions.reduce((acc, t) => {
    if (t.senderPlayerId && t.chipsSent) {
      const id = t.senderPlayerId;
      if (!acc[id]) {
        acc[id] = { id, nickname: t.senderNickname || id, total: 0 };
      }
      acc[id].total += t.chipsSent;
    }
    return acc;
  }, {} as Record<string, { id: string; nickname: string; total: number }>);
  const sendersList = Object.values(chipsBySender).sort((a, b) => b.total - a.total);
  // Crédito (I-K)
  const totalCreditSent = transactions.reduce((sum, t) => sum + (t.creditSent || 0), 0);
  const totalCreditRedeemed = transactions.reduce((sum, t) => sum + (t.creditRedeemed || 0), 0);
  const totalCreditLeftClub = transactions.reduce((sum, t) => sum + (t.creditLeftClub || 0), 0);
  // Fichas (L, Q, R)
  const totalChipsSent = transactions.reduce((sum, t) => sum + (t.chipsSent || 0), 0);
  const totalChipsRedeemed = transactions.reduce((sum, t) => sum + (t.chipsRedeemed || 0), 0);
  const totalChipsLeftClub = transactions.reduce((sum, t) => sum + (t.chipsLeftClub || 0), 0);
  // Classificações (M-P)
  const totalClassPpsr = transactions.reduce((sum, t) => sum + (t.classificationPpsr || 0), 0);
  const totalClassRing = transactions.reduce((sum, t) => sum + (t.classificationRing || 0), 0);
  const totalClassCustomRing = transactions.reduce((sum, t) => sum + (t.classificationCustomRing || 0), 0);
  const totalClassMtt = transactions.reduce((sum, t) => sum + (t.classificationMtt || 0), 0);
  // Ticket (S-U)
  const totalTicketSent = transactions.reduce((sum, t) => sum + (t.ticketSent || 0), 0);
  const totalTicketRedeemed = transactions.reduce((sum, t) => sum + (t.ticketRedeemed || 0), 0);
  const totalTicketExpired = transactions.reduce((sum, t) => sum + (t.ticketExpired || 0), 0);

  if (transactions.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhuma transação encontrada
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Transações</p>
          <p className="text-lg font-semibold">{totalTransactions}</p>
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("remetentes")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Remetentes</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.remetentes ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold">{uniqueSenders.size}</p>
          {expandedCards.remetentes ? (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5 max-h-32 overflow-y-auto">
              {sendersList.slice(0, 10).map((sender) => (
                <div key={sender.id} className="flex items-center justify-between text-[8px] gap-1">
                  <span className="truncate text-muted-foreground" title={`${sender.nickname} (${sender.id})`}>
                    {sender.nickname}
                  </span>
                  <span className="font-mono text-[#00C969] shrink-0 text-right" style={{ minWidth: '70px' }}>
                    {sender.total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
              {sendersList.length > 10 && (
                <p className="text-[8px] text-muted-foreground text-center pt-1">+{sendersList.length - 10} mais</p>
              )}
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Clique para ver detalhes</p>
          )}
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Destinatários</p>
          <p className="text-lg font-semibold">{uniqueRecipients.size}</p>
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("credito")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Crédito (I-K)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.credito ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold font-mono">
            {(totalCreditSent - totalCreditRedeemed).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.credito ? (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Enviado (I)</span>
                <span className="font-mono">{totalCreditSent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Resgatado (J)</span>
                <span className="font-mono">{totalCreditRedeemed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Saiu do clube (K)</span>
                <span className="font-mono">{totalCreditLeftClub.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Clique para ver detalhes</p>
          )}
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("fichas")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Fichas (L-R)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.fichas ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold font-mono">
            {(totalChipsSent - totalChipsRedeemed).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.fichas ? (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Enviadas (L)</span>
                <span className="font-mono">{totalChipsSent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Class. PPSR (M)</span>
                <span className="font-mono">{totalClassPpsr.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Class. Ring (N)</span>
                <span className="font-mono">{totalClassRing.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Class. RG Pers. (O)</span>
                <span className="font-mono">{totalClassCustomRing.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Class. MTT (P)</span>
                <span className="font-mono">{totalClassMtt.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Resgatadas (Q)</span>
                <span className="font-mono">{totalChipsRedeemed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Saiu do clube (R)</span>
                <span className="font-mono">{totalChipsLeftClub.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Clique para ver detalhes</p>
          )}
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("ticket")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ticket (S-U)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.ticket ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold font-mono">
            {(totalTicketSent - totalTicketRedeemed - totalTicketExpired).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.ticket ? (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Enviado (S)</span>
                <span className="font-mono">{totalTicketSent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Resgatado (T)</span>
                <span className="font-mono">{totalTicketRedeemed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Expirado (U)</span>
                <span className="font-mono">{totalTicketExpired.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Clique para ver detalhes</p>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#878787]">{transactions.length} transações</p>
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
            placeholder="Buscar transação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${expanded ? "min-w-[2200px]" : "min-w-[900px]"}`}>
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
              {filteredData.map((row, idx) => (
                <tr key={`${row.occurredAt}-${idx}`} className="hover:bg-muted/30">
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
                      {formatValue(row[col.key as keyof ParsedTransaction], col.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatValue(
  value: string | number | null | undefined,
  type: string
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
