"use client";

import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

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

interface SUWidgetsGridProps {
  from?: string | null;
  to?: string | null;
  viewMode?: "current_week" | "historical" | null;
}

export function SUWidgetsGrid({ from, to, viewMode }: SUWidgetsGridProps = {}) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.su.analytics.getDashboardStats.queryOptions(
      {
        from: from ?? undefined,
        to: to ?? undefined,
        viewMode: viewMode ?? undefined,
      },
      {
        refetchOnWindowFocus: false,
      }
    )
  );

  // Loading state
  if (isLoading) {
    return <SUWidgetsGrid.Skeleton />;
  }

  // Use data or defaults
  const stats = data ?? {
    totalLeagues: 0,
    totalGamesPPST: 0,
    totalGamesPPSR: 0,
    totalPlayersPPST: 0,
    totalPlayersPPSR: 0,
    leagueEarningsTotal: 0,
    leagueEarningsPPST: 0,
    leagueEarningsPPSR: 0,
    gapGuaranteedTotal: 0,
    gamesWithGap: 0,
    maxGap: 0,
    playerWinningsTotal: 0,
    playerWinningsPPST: 0,
    playerWinningsPPSR: 0,
    totalGTD: 0,
    topLeagues: [],
    gamesPPSTByType: { nlh: 0, spinup: 0, knockout: 0 },
    gamesPPSRByType: { nlh: 0, plo: 0, other: 0 },
  };

  const totalPlayers = (stats.totalPlayersPPST ?? 0) + (stats.totalPlayersPPSR ?? 0);
  const totalGames = (stats.totalGamesPPST ?? 0) + (stats.totalGamesPPSR ?? 0);
  const gameTypes = stats.gamesPPSTByType ?? { nlh: 0, spinup: 0, knockout: 0 };
  const gameTypesPPSR = stats.gamesPPSRByType ?? { nlh: 0, plo: 0, other: 0 };

  return (
    <div className="space-y-6">
      {/* Row 1 - Ligas, Jogadores, Taxa, GTD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        <SUWidget
          title="Ligas"
          description="Total de ligas ativas"
          icon={<Icons.Link className="size-4" />}
        >
          <h2 className="text-2xl font-normal">
            {formatNumber(stats.totalLeagues ?? 0)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Jogadores"
          description="Total de participações"
          icon={<Icons.Customers className="size-4" />}
        >
          <h2 className="text-2xl font-normal">
            {formatNumber(totalPlayers)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Taxa Total"
          description="Ganhos das ligas"
          icon={<Icons.Currency className="size-4" />}
        >
          <h2 className="text-2xl font-normal text-[#00C969]">
            {formatCurrency(stats.leagueEarningsTotal ?? 0)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Total Garantidos"
          description="Soma de GTD anunciado"
          icon={<Icons.TrendingUp className="size-4" />}
        >
          <h2 className="text-2xl font-normal">
            {formatCurrency(stats.totalGTD ?? 0)}
          </h2>
        </SUWidget>
      </div>

      {/* Row 2 - Gap e Detalhes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        <SUWidget
          title="Total Gap"
          description="Overlay total (GTD - Arrecadação)"
          icon={<Icons.TrendingDown className="size-4" />}
        >
          <h2
            className={`text-2xl font-normal ${(stats.gapGuaranteedTotal ?? 0) < 0 ? "text-red-500" : "text-muted-foreground"}`}
          >
            {formatCurrency(stats.gapGuaranteedTotal ?? 0)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Jogos PPST"
          description="Total de torneios"
          icon={<Icons.PlayOutline className="size-4" />}
        >
          <h2 className="text-2xl font-normal">
            {formatNumber(stats.totalGamesPPST ?? 0)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Jogos PPSR"
          description="Total de cash games"
          icon={<Icons.Inbox className="size-4" />}
        >
          <h2 className="text-2xl font-normal">
            {formatNumber(stats.totalGamesPPSR ?? 0)}
          </h2>
        </SUWidget>

        <SUWidget
          title="Resultado Jogadores"
          description="Ganhos e perdas"
          icon={<Icons.Accounts className="size-4" />}
        >
          <h2
            className={`text-2xl font-normal ${(stats.playerWinningsTotal ?? 0) < 0 ? "text-red-500" : "text-blue-500"}`}
          >
            {formatCurrency(stats.playerWinningsTotal ?? 0)}
          </h2>
        </SUWidget>
      </div>

      {/* Row 3 - Tipos de Jogos PPST */}
      <div className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 transition-all duration-300 dark:hover:bg-[#0f0f0f] dark:hover:border-[#222222]">
        <div className="flex items-center gap-2 mb-4">
          <Icons.Category className="size-4 text-[#666666]" />
          <span className="text-xs text-[#666666] font-medium">
            Tipos de Torneio (PPST)
          </span>
          <span className="ml-auto text-2xl font-normal">
            {formatNumber(stats.totalGamesPPST ?? 0)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-blue-500/10 text-xs">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[#666666]">NLH</span>
            <span className="font-mono font-medium">
              {formatNumber(gameTypes.nlh ?? 0)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-pink-500/10 text-xs">
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            <span className="text-[#666666]">SpinUp</span>
            <span className="font-mono font-medium">
              {formatNumber(gameTypes.spinup ?? 0)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-orange-500/10 text-xs">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[#666666]">PKO/MKO</span>
            <span className="font-mono font-medium">
              {formatNumber(gameTypes.knockout ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 4 - Tipos de Jogos PPSR */}
      <div className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 transition-all duration-300 dark:hover:bg-[#0f0f0f] dark:hover:border-[#222222]">
        <div className="flex items-center gap-2 mb-4">
          <Icons.Category className="size-4 text-[#666666]" />
          <span className="text-xs text-[#666666] font-medium">
            Tipos de Cash Game (PPSR)
          </span>
          <span className="ml-auto text-2xl font-normal">
            {formatNumber(stats.totalGamesPPSR ?? 0)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-green-500/10 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[#666666]">NLH</span>
            <span className="font-mono font-medium">
              {formatNumber(gameTypesPPSR.nlh ?? 0)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-purple-500/10 text-xs">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[#666666]">PLO</span>
            <span className="font-mono font-medium">
              {formatNumber(gameTypesPPSR.plo ?? 0)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-gray-500/10 text-xs">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-[#666666]">Outros</span>
            <span className="font-mono font-medium">
              {formatNumber(gameTypesPPSR.other ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 5 - Top Leagues */}
      {(stats.topLeagues?.length ?? 0) > 0 && (
        <div className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 transition-all duration-300 dark:hover:bg-[#0f0f0f] dark:hover:border-[#222222]">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Leaderboard className="size-4 text-[#666666]" />
            <span className="text-xs text-[#666666] font-medium">
              Top Ligas por Taxa
            </span>
          </div>
          <div className="space-y-2">
            {stats.topLeagues?.slice(0, 5).map((league: any, index: number) => (
              <div key={league.ligaId} className="flex items-center justify-between py-2 border-b border-[#1d1d1d] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono text-[#666666]">{index + 1}</span>
                  <span className="text-sm">{league.ligaNome}</span>
                </div>
                <span className="text-sm text-[#00C969] font-mono">
                  {formatCurrency(league.totalFee ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Skeleton component
SUWidgetsGrid.Skeleton = function SUWidgetsGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 h-[210px]">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-3 w-32 mb-4" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 h-[210px]">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-3 w-32 mb-4" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
};
