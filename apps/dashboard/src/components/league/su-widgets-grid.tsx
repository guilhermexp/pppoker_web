"use client";

import { Icons } from "@midday/ui/icons";
import { useEffect, useState } from "react";

// Storage key for SU validation data
const SU_VALIDATION_STORAGE_KEY = "su-validation-data";

// Type for stored validation data
interface StoredSUValidationData {
  // General stats
  totalLigas: number;
  totalTorneios: number;
  totalJogadores: number;
  // Taxa stats
  totalTaxaPPST: number;
  totalTaxaPPSR: number;
  totalTaxa: number;
  // Player stats
  totalGanhosJogador: number;
  // GTD stats
  totalGTD: number;
  totalArrecadacao: number;
  totalGap: number;
  // Overlay distribution
  gapBrasileiro: number;
  gapEstrangeiro: number;
  percBrasileiro: number;
  percEstrangeiro: number;
  // Tournament types
  gameTypes: {
    mtt: number;
    spin: number;
    pko: number;
    mko: number;
    sat: number;
  };
  // Meta
  period: {
    start: string;
    end: string;
  };
  savedAt: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Widget component matching BaseWidget style
function SUWidget({
  title,
  description,
  icon,
  children,
  action,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: string;
}) {
  return (
    <div className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 h-[210px] flex flex-col justify-between transition-all duration-300 dark:hover:bg-[#0f0f0f] dark:hover:border-[#222222] group">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[#666666]">{icon}</span>
          <h3 className="text-xs text-[#666666] font-medium">{title}</h3>
        </div>
        <p className="text-sm text-[#666666]">{description}</p>
      </div>

      <div>
        {children}
        {action && (
          <span className="text-xs text-[#666666] group-hover:text-primary transition-colors duration-300">
            {action}
          </span>
        )}
      </div>
    </div>
  );
}

export function SUWidgetsGrid() {
  const [data, setData] = useState<StoredSUValidationData | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SU_VALIDATION_STORAGE_KEY);
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Empty state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 border rounded-lg bg-muted/10">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-6">
          <Icons.Globle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Nenhum dado disponível</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Importe e valide uma planilha da Super Union para ver os dados aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Info */}
      {data.period.start && data.period.end && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icons.CalendarMonth className="w-4 h-4" />
          <span>Período: {data.period.start} - {data.period.end}</span>
        </div>
      )}

      {/* Row 1 - Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        <SUWidget
          title="Entidades"
          description="Blocos Liga/SuperUnion"
          icon={<Icons.Link className="size-4" />}
        >
          <h2 className="text-2xl font-normal">{formatNumber(data.totalLigas)}</h2>
        </SUWidget>

        <SUWidget
          title="Torneios"
          description="Total de torneios importados"
          icon={<Icons.PlayOutline className="size-4" />}
        >
          <h2 className="text-2xl font-normal">{formatNumber(data.totalTorneios)}</h2>
        </SUWidget>

        <SUWidget
          title="Jogadores"
          description="Participações em torneios"
          icon={<Icons.Customers className="size-4" />}
        >
          <h2 className="text-2xl font-normal">{formatNumber(data.totalJogadores)}</h2>
        </SUWidget>

        <SUWidget
          title="Taxa Total"
          description="Taxa total coletada"
          icon={<Icons.Currency className="size-4" />}
        >
          <h2 className="text-2xl font-normal text-[#00C969]">
            {formatCurrency(data.totalTaxa)}
          </h2>
        </SUWidget>
      </div>

      {/* Row 2 - Taxa Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        <SUWidget
          title="Taxa PPST"
          description="Taxa de torneios (PPST)"
          icon={<Icons.Star className="size-4" />}
        >
          <h2 className="text-2xl font-normal text-[#00C969]">
            {formatCurrency(data.totalTaxaPPST)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Taxa PPSR"
          description="Taxa de cash game (PPSR)"
          icon={<Icons.TrendingUp className="size-4" />}
        >
          <h2 className="text-2xl font-normal text-[#00C969]">
            {formatCurrency(data.totalTaxaPPSR)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Resultado Jogadores"
          description="Ganhos e perdas dos jogadores"
          icon={<Icons.Accounts className="size-4" />}
        >
          <h2 className={`text-2xl font-normal ${data.totalGanhosJogador < 0 ? "text-red-500" : "text-blue-500"}`}>
            {formatCurrency(data.totalGanhosJogador)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Gap (Overlay)"
          description="Diferença GTD vs Arrecadação"
          icon={<Icons.Speed className="size-4" />}
        >
          <h2 className={`text-2xl font-normal ${data.totalGap < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {formatCurrency(data.totalGap)}
          </h2>
        </SUWidget>
      </div>

      {/* Row 3 - GTD Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        <SUWidget
          title="GTD Total"
          description="Garantido total anunciado"
          icon={<Icons.TrendingUp className="size-4" />}
        >
          <h2 className="text-2xl font-normal">{formatCurrency(data.totalGTD)}</h2>
        </SUWidget>

        <SUWidget
          title="Arrecadação"
          description="Total de buy-ins coletados"
          icon={<Icons.ReceiptLong className="size-4" />}
        >
          <h2 className="text-2xl font-normal text-blue-500">{formatCurrency(data.totalArrecadacao)}</h2>
        </SUWidget>

        <SUWidget
          title="Overlay BR"
          description="Gap ligas 1765, 1675, 2448, 2101"
          icon={<Icons.PieChart className="size-4" />}
        >
          <div className="flex flex-col">
            <h2 className={`text-2xl font-normal ${data.gapBrasileiro < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {formatCurrency(data.gapBrasileiro)}
            </h2>
            <span className="text-xs text-[#666666]">{data.percBrasileiro.toFixed(0)}% do total</span>
          </div>
        </SUWidget>

        <SUWidget
          title="Overlay Outros"
          description="Gap outras ligas (não BR)"
          icon={<Icons.Globle className="size-4" />}
        >
          <div className="flex flex-col">
            <h2 className={`text-2xl font-normal ${data.gapEstrangeiro < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {formatCurrency(data.gapEstrangeiro)}
            </h2>
            <span className="text-xs text-[#666666]">{data.percEstrangeiro.toFixed(0)}% do total</span>
          </div>
        </SUWidget>
      </div>

      {/* Row 4 - Tournament Types */}
      <div className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 transition-all duration-300 dark:hover:bg-[#0f0f0f] dark:hover:border-[#222222]">
        <div className="flex items-center gap-2 mb-4">
          <Icons.Category className="size-4 text-[#666666]" />
          <span className="text-xs text-[#666666] font-medium">Tipos de Torneio</span>
          <span className="ml-auto text-2xl font-normal">
            {formatNumber(
              data.gameTypes.mtt +
              data.gameTypes.spin +
              data.gameTypes.pko +
              data.gameTypes.mko +
              data.gameTypes.sat
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.gameTypes.mtt > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-blue-500/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[#666666]">MTT</span>
              <span className="font-mono font-medium">{formatNumber(data.gameTypes.mtt)}</span>
            </div>
          )}
          {data.gameTypes.spin > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-pink-500/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="text-[#666666]">SPIN</span>
              <span className="font-mono font-medium">{formatNumber(data.gameTypes.spin)}</span>
            </div>
          )}
          {data.gameTypes.pko > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-orange-500/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[#666666]">PKO</span>
              <span className="font-mono font-medium">{formatNumber(data.gameTypes.pko)}</span>
            </div>
          )}
          {data.gameTypes.mko > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-orange-400/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-[#666666]">MKO</span>
              <span className="font-mono font-medium">{formatNumber(data.gameTypes.mko)}</span>
            </div>
          )}
          {data.gameTypes.sat > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-purple-500/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-[#666666]">SAT</span>
              <span className="font-mono font-medium">{formatNumber(data.gameTypes.sat)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
