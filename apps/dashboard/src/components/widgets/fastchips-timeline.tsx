"use client";

import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { cn } from "@midpoker/ui/cn";
import { useQuery } from "@tanstack/react-query";
import { BaseWidget } from "./base";

function TimelineStep({
  step,
  label,
  count,
  total,
  color,
  isLast,
}: {
  step: number;
  label: string;
  count: number;
  total: number;
  color: string;
  isLast?: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold border-2",
            count > 0
              ? `${color} border-current text-current`
              : "border-[#333] text-[#555]",
          )}
        >
          {step}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[#666666] truncate">{label}</p>
        <p className="text-xs font-mono font-medium">
          {count} <span className="text-[10px] text-[#666666]">({pct}%)</span>
        </p>
      </div>
      {!isLast && (
        <div className="w-4 h-px bg-[#333] flex-shrink-0" />
      )}
    </div>
  );
}

export function FastchipsTimelineWidget() {
  const trpc = useTRPC();

  const { data: stats } = useQuery({
    ...trpc.fastchips.paymentOrders.getStats.queryOptions(),
    refetchInterval: 15_000,
  });

  const linkGerado = stats?.linkGerado ?? 0;
  const pago = stats?.pago ?? 0;
  const fichasEnviadas = stats?.fichasEnviadas ?? 0;
  const erro = stats?.erro ?? 0;
  const cancelado = stats?.cancelado ?? 0;
  const total = stats?.total ?? 0;

  const successRate = total > 0 ? Math.round((fichasEnviadas / total) * 100) : 0;

  return (
    <BaseWidget
      title="Taxa de Sucesso"
      icon={<Icons.ShowChart className="size-4" />}
      description={
        <p className="text-sm text-[#666666]">
          Fluxo: Link &rarr; Pago &rarr; Enviadas
        </p>
      }
      actions="Ver detalhes"
      onClick={() => {
        window.location.href = "/fastchips";
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <TimelineStep
            step={1}
            label="Link"
            count={linkGerado}
            total={total}
            color="text-amber-400"
          />
          <TimelineStep
            step={2}
            label="Pago"
            count={pago}
            total={total}
            color="text-emerald-400"
          />
          <TimelineStep
            step={3}
            label="Enviadas"
            count={fichasEnviadas}
            total={total}
            color="text-blue-400"
            isLast
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#666666]">
            Sucesso: <span className={cn("font-medium", successRate >= 70 ? "text-green-500" : successRate >= 40 ? "text-amber-400" : "text-red-400")}>{successRate}%</span>
          </span>
          {(erro > 0 || cancelado > 0) && (
            <span className="text-[#666666]">
              {erro > 0 && <span className="text-red-400">{erro} erro</span>}
              {erro > 0 && cancelado > 0 && " · "}
              {cancelado > 0 && <span className="text-[#666666]">{cancelado} canc.</span>}
            </span>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}
