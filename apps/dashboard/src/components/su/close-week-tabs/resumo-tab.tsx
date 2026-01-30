"use client";

import { formatNumber } from "@/utils/format";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { getVariantColor, getVariantLabel } from "./utils";

interface Stats {
  totalLeagues: number;
  leaguesWithPPST: number;
  leaguesWithPPSR: number;
  totalGamesPPST: number;
  totalGamesPPSR: number;
  totalPlayersPPST: number;
  totalPlayersPPSR: number;
  totalLeagueFee: number;
  totalGapGuaranteed: number;
  overlayCount: number;
  overlayTotal: number;
  totalPlayerWinnings: number;
  totalTaxaPPST: number;
  totalTaxaPPSR: number;
  totalPlayerWinningsPPST: number;
  totalPlayerWinningsPPSR: number;
  gameVariantDistribution: Array<{
    variant: string;
    type: string;
    count: number;
  }>;
}

interface SettlementsSummary {
  count: number;
  totalGrossAmount: number;
  totalNetAmount: number;
  alreadySettled: number;
}

interface ResumoTabProps {
  stats: Stats;
  settlementsSummary: SettlementsSummary;
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  variant?: "default" | "success" | "warning" | "muted";
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "text-xl font-semibold",
          variant === "success" && "text-green-600",
          variant === "warning" && "text-yellow-600",
          variant === "muted" && "text-muted-foreground",
        )}
      >
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
    </div>
  );
}

export function ResumoTab({ stats, settlementsSummary }: ResumoTabProps) {
  const ppstVariants = stats.gameVariantDistribution.filter(
    (d) => d.type === "ppst",
  );
  const ppsrVariants = stats.gameVariantDistribution.filter(
    (d) => d.type === "ppsr",
  );

  return (
    <div className="space-y-5 p-6">
      {/* PPST Section */}
      <div className="bg-card border border-blue-500/30 rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          PPST - Torneios
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            label="Torneios"
            value={stats.totalGamesPPST}
            icon={Icons.Play}
          />
          <StatCard
            label="Ligas"
            value={stats.leaguesWithPPST}
            icon={Icons.Link}
          />
          <StatCard label="Jogadores" value={stats.totalPlayersPPST} />
          <StatCard
            label={`Overlay (${stats.overlayCount})`}
            value={formatNumber(Math.abs(stats.overlayTotal))}
            variant="warning"
          />
        </div>
        <div className="grid grid-cols-3 gap-6 mt-4 pt-4 border-t border-blue-500/20">
          <StatCard
            label="Taxa Liga"
            value={stats.totalTaxaPPST}
            icon={Icons.Currency}
            variant="success"
          />
          <StatCard
            label="Ganhos Jogador"
            value={stats.totalPlayerWinningsPPST}
          />
          <StatCard
            label="Gap GTD"
            value={stats.totalGapGuaranteed}
            icon={Icons.TrendingDown}
            variant="warning"
          />
        </div>
      </div>

      {/* PPSR Section */}
      <div className="bg-card border border-green-500/30 rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          PPSR - Cash
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            label="Mesas"
            value={stats.totalGamesPPSR}
            icon={Icons.Time}
          />
          <StatCard
            label="Ligas"
            value={stats.leaguesWithPPSR}
            icon={Icons.Link}
          />
          <StatCard label="Jogadores" value={stats.totalPlayersPPSR} />
          <StatCard
            label="Taxa Liga"
            value={stats.totalTaxaPPSR}
            icon={Icons.Currency}
            variant="success"
          />
        </div>
        <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-green-500/20">
          <StatCard
            label="Ganhos Jogador"
            value={stats.totalPlayerWinningsPPSR}
          />
          <StatCard
            label="Total Ligas"
            value={stats.totalLeagues}
            icon={Icons.Link}
            variant="muted"
          />
        </div>
      </div>

      {/* Game Variant Distribution */}
      {stats.gameVariantDistribution.length > 0 && (
        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">
            Distribuicao por Variante
          </h3>
          <div className="space-y-3">
            {ppstVariants.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">PPST</p>
                <div className="flex flex-wrap gap-2">
                  {ppstVariants.map((d) => (
                    <span
                      key={`${d.type}-${d.variant}`}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium",
                        getVariantColor(d.variant),
                      )}
                    >
                      {getVariantLabel(d.variant)}{" "}
                      <span className="opacity-70">{d.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ppsrVariants.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">PPSR</p>
                <div className="flex flex-wrap gap-2">
                  {ppsrVariants.map((d) => (
                    <span
                      key={`${d.type}-${d.variant}`}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium",
                        getVariantColor(d.variant),
                      )}
                    >
                      {getVariantLabel(d.variant)}{" "}
                      <span className="opacity-70">{d.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settlement Summary */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-4">Resumo dos Acertos</h3>
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            label="Ligas para Acerto"
            value={settlementsSummary.count}
          />
          <StatCard
            label="Valor Bruto Total"
            value={settlementsSummary.totalGrossAmount}
          />
          <StatCard
            label="Valor Liquido Total"
            value={settlementsSummary.totalNetAmount}
            variant="success"
          />
          <StatCard
            label="Ja Acertados"
            value={settlementsSummary.alreadySettled}
            variant="muted"
          />
        </div>
      </div>
    </div>
  );
}
