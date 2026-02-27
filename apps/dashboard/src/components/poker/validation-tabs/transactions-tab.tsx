"use client";

import type { ParsedTransaction } from "@/lib/poker/types";
import {
  formatCurrency,
  formatNumberPtBR as formatNumber,
} from "@/utils/format";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type TransactionsTabProps = {
  transactions: ParsedTransaction[];
};

// Transaction categories with colors
const TRANSACTION_CATEGORIES = [
  { key: "credito", name: "Crédito", color: "#3B82F6", colRange: "I-K" },
  { key: "fichas", name: "Fichas", color: "#8B5CF6", colRange: "L-R" },
  { key: "ticket", name: "Ticket", color: "#10B981", colRange: "S-U" },
] as const;

// Summary columns
const SUMMARY_COLUMNS = [
  { key: "occurredAt", label: "Tempo", type: "datetime" },
  { key: "senderNickname", label: "Remetente", type: "text" },
  { key: "recipientNickname", label: "Destinatário", type: "text" },
  { key: "creditSent", label: "Créd. Env.", type: "currency" },
  { key: "chipsSent", label: "Fichas Env.", type: "currency" },
  { key: "chipsRedeemed", label: "Fichas Resg.", type: "currency" },
  { key: "ticketSent", label: "Ticket Env.", type: "currency" },
] as const;

// All columns (21 fields)
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
    group: "Destinatário",
  },
  {
    key: "recipientNickname",
    label: "Apelido Dest.",
    type: "text",
    group: "Destinatário",
  },
  {
    key: "recipientMemoName",
    label: "Memo Dest.",
    type: "text",
    group: "Destinatário",
  },
  {
    key: "creditSent",
    label: "Créd. Enviado",
    type: "currency",
    group: "Crédito",
  },
  {
    key: "creditRedeemed",
    label: "Créd. Resgatado",
    type: "currency",
    group: "Crédito",
  },
  {
    key: "creditLeftClub",
    label: "Créd. Saiu",
    type: "currency",
    group: "Crédito",
  },
  {
    key: "chipsSent",
    label: "Fichas Enviadas",
    type: "currency",
    group: "Fichas",
  },
  {
    key: "classificationPpsr",
    label: "Class. PPSR",
    type: "number",
    group: "Fichas",
  },
  {
    key: "classificationRing",
    label: "Class. Ring",
    type: "number",
    group: "Fichas",
  },
  {
    key: "classificationCustomRing",
    label: "Class. RG Pers.",
    type: "number",
    group: "Fichas",
  },
  {
    key: "classificationMtt",
    label: "Class. MTT",
    type: "number",
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

export function TransactionsTab({ transactions }: TransactionsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSenders, setShowSenders] = useState(false);

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

  // Chips sent per sender (aggregated)
  const chipsBySender = transactions.reduce(
    (acc, t) => {
      if (t.senderPlayerId && t.chipsSent) {
        const id = t.senderPlayerId;
        if (!acc[id]) {
          acc[id] = { id, nickname: t.senderNickname || id, total: 0 };
        }
        acc[id].total += t.chipsSent;
      }
      return acc;
    },
    {} as Record<string, { id: string; nickname: string; total: number }>,
  );
  const sendersList = Object.values(chipsBySender).sort(
    (a, b) => b.total - a.total,
  );

  // Credit totals (I-K)
  const totalCreditSent = transactions.reduce(
    (sum, t) => sum + (t.creditSent || 0),
    0,
  );
  const totalCreditRedeemed = transactions.reduce(
    (sum, t) => sum + (t.creditRedeemed || 0),
    0,
  );
  const totalCreditLeftClub = transactions.reduce(
    (sum, t) => sum + (t.creditLeftClub || 0),
    0,
  );
  const creditNet = totalCreditSent - totalCreditRedeemed;

  // Chips totals (L-R)
  const totalChipsSent = transactions.reduce(
    (sum, t) => sum + (t.chipsSent || 0),
    0,
  );
  const totalChipsRedeemed = transactions.reduce(
    (sum, t) => sum + (t.chipsRedeemed || 0),
    0,
  );
  const totalChipsLeftClub = transactions.reduce(
    (sum, t) => sum + (t.chipsLeftClub || 0),
    0,
  );
  const chipsNet = totalChipsSent - totalChipsRedeemed;

  // Classifications (M-P)
  const totalClassPpsr = transactions.reduce(
    (sum, t) => sum + (t.classificationPpsr || 0),
    0,
  );
  const totalClassRing = transactions.reduce(
    (sum, t) => sum + (t.classificationRing || 0),
    0,
  );
  const totalClassCustomRing = transactions.reduce(
    (sum, t) => sum + (t.classificationCustomRing || 0),
    0,
  );
  const totalClassMtt = transactions.reduce(
    (sum, t) => sum + (t.classificationMtt || 0),
    0,
  );

  // Ticket totals (S-U)
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
  const ticketNet = totalTicketSent - totalTicketRedeemed - totalTicketExpired;

  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhuma transação encontrada
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Row 1: Counters */}
      <div className="flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Transações{" "}
          <span className="text-foreground font-medium">
            {totalTransactions}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <button
          type="button"
          onClick={() => setShowSenders(!showSenders)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Remetentes{" "}
          <span className="text-foreground font-medium">
            {uniqueSenders.size}
          </span>
          <Icons.ChevronDown
            className={cn(
              "w-3 h-3 inline ml-1 transition-transform",
              showSenders && "rotate-180",
            )}
          />
        </button>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Destinatários{" "}
          <span className="text-foreground font-medium">
            {uniqueRecipients.size}
          </span>
        </span>
      </div>

      {/* Expanded senders list */}
      {showSenders && sendersList.length > 0 && (
        <div className="border-t border-border/40 py-2">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-muted-foreground text-[10px] font-medium">
              Top remetentes:
            </span>
            {sendersList.slice(0, 8).map((sender) => (
              <span key={sender.id} className="text-muted-foreground">
                {sender.nickname}{" "}
                <span className="font-mono text-[#00C969]">
                  {formatNumber(sender.total)}
                </span>
              </span>
            ))}
            {sendersList.length > 8 && (
              <span className="text-[10px] text-muted-foreground">
                +{sendersList.length - 8} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Row 2: Category totals with colored dots */}
      <div className="border-t border-border/40 py-2">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Credit */}
          <button
            type="button"
            onClick={() =>
              setSelectedCategory(
                selectedCategory === "credito" ? null : "credito",
              )
            }
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              selectedCategory === "credito" && "bg-muted/50",
            )}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#3B82F6" }}
            />
            <span className="text-muted-foreground">Crédito</span>
            <span
              className={cn(
                "font-mono",
                creditNet >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
              )}
            >
              {formatCurrency(creditNet)}
            </span>
          </button>

          {/* Chips */}
          <button
            type="button"
            onClick={() =>
              setSelectedCategory(
                selectedCategory === "fichas" ? null : "fichas",
              )
            }
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              selectedCategory === "fichas" && "bg-muted/50",
            )}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#8B5CF6" }}
            />
            <span className="text-muted-foreground">Fichas</span>
            <span
              className={cn(
                "font-mono",
                chipsNet >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
              )}
            >
              {formatCurrency(chipsNet)}
            </span>
          </button>

          {/* Ticket */}
          <button
            type="button"
            onClick={() =>
              setSelectedCategory(
                selectedCategory === "ticket" ? null : "ticket",
              )
            }
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              selectedCategory === "ticket" && "bg-muted/50",
            )}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#10B981" }}
            />
            <span className="text-muted-foreground">Ticket</span>
            <span
              className={cn(
                "font-mono",
                ticketNet >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
              )}
            >
              {formatCurrency(ticketNet)}
            </span>
          </button>
        </div>
      </div>

      {/* Expanded category details */}
      {selectedCategory === "credito" && (
        <div className="border-t border-border/40 py-2">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-muted-foreground text-[10px] font-medium">
              Crédito (I-K):
            </span>
            <span className="text-muted-foreground">
              Enviado (I){" "}
              <span className="font-mono text-foreground">
                {formatCurrency(totalCreditSent)}
              </span>
            </span>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              Resgatado (J){" "}
              <span className="font-mono text-foreground">
                {formatCurrency(totalCreditRedeemed)}
              </span>
            </span>
            {totalCreditLeftClub !== 0 && (
              <>
                <span className="text-border/60">·</span>
                <span className="text-muted-foreground">
                  Saiu (K){" "}
                  <span
                    className={cn(
                      "font-mono",
                      totalCreditLeftClub < 0
                        ? "text-[#FF3638]"
                        : "text-[#00C969]",
                    )}
                  >
                    {formatCurrency(totalCreditLeftClub)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {selectedCategory === "fichas" && (
        <div className="border-t border-border/40 py-2">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-muted-foreground text-[10px] font-medium">
              Fichas (L-R):
            </span>
            <span className="text-muted-foreground">
              Enviadas (L){" "}
              <span className="font-mono text-foreground">
                {formatCurrency(totalChipsSent)}
              </span>
            </span>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              Resgatadas (Q){" "}
              <span className="font-mono text-foreground">
                {formatCurrency(totalChipsRedeemed)}
              </span>
            </span>
            {totalChipsLeftClub !== 0 && (
              <>
                <span className="text-border/60">·</span>
                <span className="text-muted-foreground">
                  Saiu (R){" "}
                  <span
                    className={cn(
                      "font-mono",
                      totalChipsLeftClub < 0
                        ? "text-[#FF3638]"
                        : "text-[#00C969]",
                    )}
                  >
                    {formatCurrency(totalChipsLeftClub)}
                  </span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs mt-1">
            <span className="text-muted-foreground text-[10px] font-medium">
              Classificações:
            </span>
            <span className="text-muted-foreground">
              PPSR (M){" "}
              <span className="font-mono text-foreground">
                {formatNumber(totalClassPpsr)}
              </span>
            </span>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              Ring (N){" "}
              <span className="font-mono text-foreground">
                {formatNumber(totalClassRing)}
              </span>
            </span>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              RG Pers. (O){" "}
              <span className="font-mono text-foreground">
                {formatNumber(totalClassCustomRing)}
              </span>
            </span>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              MTT (P){" "}
              <span className="font-mono text-foreground">
                {formatNumber(totalClassMtt)}
              </span>
            </span>
          </div>
        </div>
      )}

      {selectedCategory === "ticket" && (
        <div className="border-t border-border/40 py-2">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-muted-foreground text-[10px] font-medium">
              Ticket (S-U):
            </span>
            <span className="text-muted-foreground">
              Enviado (S){" "}
              <span className="font-mono text-foreground">
                {formatCurrency(totalTicketSent)}
              </span>
            </span>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              Resgatado (T){" "}
              <span className="font-mono text-foreground">
                {formatCurrency(totalTicketRedeemed)}
              </span>
            </span>
            {totalTicketExpired !== 0 && (
              <>
                <span className="text-border/60">·</span>
                <span className="text-muted-foreground">
                  Expirado (U){" "}
                  <span className="font-mono text-[#FF3638]">
                    {formatCurrency(totalTicketExpired)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search and controls */}
      <div className="border-t border-border/40 flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {transactions.length} transações
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 px-2 text-xs"
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-3 h-3 mr-1" />
                Resumido ({SUMMARY_COLUMNS.length})
              </>
            ) : (
              <>
                Expandir ({ALL_COLUMNS.length})
                <Icons.ChevronRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>
        <div className="relative w-48">
          <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar transação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* Data table */}
      <div className="border-t border-border/40 pt-2 pb-4">
        <div className="overflow-x-auto">
          <table
            className={cn(
              "w-full text-xs",
              expanded ? "min-w-[2200px]" : "min-w-[800px]",
            )}
          >
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "py-1.5 px-2 font-medium whitespace-nowrap",
                      col.type === "currency" || col.type === "number"
                        ? "text-right"
                        : "text-left",
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredData.map((row, idx) => (
                <tr
                  key={`${row.occurredAt}-${idx}`}
                  className="hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "py-1.5 px-2 whitespace-nowrap",
                        col.type === "currency" || col.type === "number"
                          ? "text-right font-mono"
                          : "",
                        col.type === "id" &&
                          "font-mono text-muted-foreground text-[10px]",
                        col.type === "datetime" && "text-muted-foreground",
                      )}
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
      return typeof value === "number" ? formatCurrency(value) : "-";
    case "number":
      return typeof value === "number" ? formatNumber(value) : "-";
    case "id":
      return String(value);
    default:
      return String(value) || "-";
  }
}
