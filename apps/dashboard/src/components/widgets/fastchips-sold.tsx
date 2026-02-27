"use client";

import { useTRPC } from "@/trpc/client";
import { formatCurrency } from "@/utils/format";
import { Icons } from "@midpoker/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { BaseWidget } from "./base";

export function FastchipsSoldWidget() {
  const trpc = useTRPC();

  const { data: stats } = useQuery({
    ...trpc.fastchips.paymentOrders.getStats.queryOptions(),
    refetchInterval: 15_000,
  });

  const totalVendidoHoje = stats?.totalVendidoHoje ?? 0;
  const fichasEnviadasHoje = stats?.fichasEnviadasHoje ?? 0;
  const linksGerados = stats?.linkGerado ?? 0;
  const totalOrdens = stats?.total ?? 0;

  return (
    <BaseWidget
      title="Fastchips Vendas"
      icon={<Icons.Currency className="size-4" />}
      description={
        <p className="text-sm text-[#666666]">
          Fichas vendidas e links emitidos
        </p>
      }
      actions="Ver fastchips"
      onClick={() => {
        window.location.href = "/fastchips";
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-normal text-green-500">
          {formatCurrency(totalVendidoHoje)}
        </h2>
        <div className="flex items-center gap-3 text-xs text-[#666666]">
          <span>
            Enviadas hoje:{" "}
            <span className="font-medium text-foreground">
              {fichasEnviadasHoje}
            </span>
          </span>
          <span>
            Links:{" "}
            <span className="font-medium text-foreground">{linksGerados}</span>
          </span>
          <span>
            Total:{" "}
            <span className="font-medium text-foreground">{totalOrdens}</span>
          </span>
        </div>
      </div>
    </BaseWidget>
  );
}
