"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "#ffffff",
  "#707070",
  "#A0A0A0",
  "#606060",
  "#404040",
  "#303030",
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      gameType: string;
      rake: number;
      percentage: number;
    };
  }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-white dark:bg-[#0c0c0c] text-black dark:text-white text-xs rounded-none border dark:border-[#1d1d1d]">
        <p className="mb-1 text-gray-500 dark:text-[#666666] font-medium">
          {data.gameType}
        </p>
        <p className="mb-1 text-black dark:text-white font-sans">
          Rake: {data.rake.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-gray-500 dark:text-[#666666]">
          Share: {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
}

export function RevenueByGameWidget() {
  const trpc = useTRPC();
  const t = useI18n();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getRevenueByGameType.queryOptions()
  );

  if (isLoading) {
    return <RevenueByGameWidget.Skeleton />;
  }

  const gameTypes = data?.gameTypes ?? [];
  const totalRake = gameTypes.reduce((sum, g) => sum + g.rake, 0);

  const chartData = gameTypes.map((item, index) => ({
    ...item,
    percentage: totalRake > 0 ? (item.rake / totalRake) * 100 : 0,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center gap-2 mb-4">
        <Icons.Category className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium">
          {t("poker.widgets.revenueByGame")}
        </h3>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("poker.widgets.noGameData")}
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-40 h-40 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={100}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  dataKey="rake"
                  paddingAngle={1}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.gameType}-${index}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-2">
            {chartData.map((item, index) => (
              <div
                key={item.gameType}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.gameType}</span>
                </div>
                <span className="font-medium">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

RevenueByGameWidget.Skeleton = function RevenueByGameWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex items-center gap-4">
        <Skeleton className="w-40 h-40 rounded-full" />
        <div className="flex-1 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};
