"use client";

import { useFastchipsTransactionParams } from "@/hooks/use-fastchips-transaction-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Sheet, SheetContent } from "@midpoker/ui/sheet";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

function formatCurrency(value: number): string {
  return `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  label,
  value,
}: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function FastChipsTransactionDetailSheet() {
  const trpc = useTRPC();
  const { fastchipsTransactionId, setParams } = useFastchipsTransactionParams();
  const isOpen = Boolean(fastchipsTransactionId);

  const { data: op, isLoading } = useQuery({
    ...trpc.fastchips.operations.getById.queryOptions({
      id: fastchipsTransactionId ?? "",
    }),
    enabled: isOpen,
  });

  const isEntry = op?.operationType === "Entrada";

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setParams({ fastchipsTransactionId: null });
        }
      }}
    >
      <SheetContent>
        <div className="flex items-center gap-2 border-b pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setParams({ fastchipsTransactionId: null })}
          >
            <Icons.ArrowBack className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-sm">Detalhes da Transação</h2>
        </div>

        {isLoading || !op ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-5 pt-4">
            {/* Type + Purpose */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={
                  isEntry
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }
              >
                {op.operationType}
              </Badge>
              {op.purpose && (
                <span className="text-sm text-muted-foreground">
                  {op.purpose}
                </span>
              )}
            </div>

            {/* Player */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Jogador
              </h3>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <DetailRow label="Nome" value={op.memberName || "-"} />
                <DetailRow label="Player ID" value={op.ppPokerId || "-"} />
                {op.member && (
                  <DetailRow
                    label="Membro"
                    value={(op.member as any).name || "-"}
                  />
                )}
              </div>
            </div>

            {/* Values */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Valores
              </h3>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <DetailRow
                  label="Fichas"
                  value={Math.round(op.grossAmount / 100).toLocaleString(
                    "pt-BR",
                  )}
                />
                <DetailRow
                  label="Valor Bruto"
                  value={formatCurrency(op.grossAmount)}
                />
                {op.feeRate != null && op.feeRate > 0 && (
                  <DetailRow label="Taxa" value={`${op.feeRate}%`} />
                )}
                {op.feeAmount != null && op.feeAmount > 0 && (
                  <DetailRow
                    label="Valor da Taxa"
                    value={formatCurrency(op.feeAmount)}
                  />
                )}
                <DetailRow
                  label="Valor Líquido"
                  value={formatCurrency(op.netAmount ?? op.grossAmount)}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Datas
              </h3>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <DetailRow
                  label="Data da Operação"
                  value={formatDateTime(op.occurredAt)}
                />
                <DetailRow
                  label="Registrado em"
                  value={formatDateTime(op.createdAt)}
                />
              </div>
            </div>

            {/* IDs */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Identificadores
              </h3>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                {op.externalId && (
                  <DetailRow label="ID Externo" value={op.externalId} />
                )}
                {op.paymentId && (
                  <DetailRow label="ID Pagamento" value={op.paymentId} />
                )}
                {(op as any).import && (
                  <DetailRow
                    label="Importação"
                    value={(op as any).import.file_name}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
