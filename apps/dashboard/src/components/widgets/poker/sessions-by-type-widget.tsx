"use client";

import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#22c55e", // green for cash_game
  "#3b82f6", // blue for mtt
  "#a855f7", // purple for sit_n_go
  "#f97316", // orange for spin
  "#6b7280", // gray for others
];

const SESSION_TYPE_LABELS: Record<string, string> = {
  cash_game: "Cash Game",
  mtt: "MTT",
  sit_n_go: "Sit & Go",
  spin: "SPIN",
  ring: "Ring",
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      type: string;
      count: number;
      percentage: number;
    };
  }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const label = SESSION_TYPE_LABELS[data.type] ?? data.type;
    return (
      <div className="p-2 bg-white dark:bg-[#0c0c0c] text-black dark:text-white text-xs rounded-none border dark:border-[#1d1d1d]">
        <p className="mb-1 text-gray-500 dark:text-[#666666] font-medium">
          {label}
        </p>
        <p className="mb-1 text-black dark:text-white font-sans">
          Sessoes: {data.count}
        </p>
        <p className="text-gray-500 dark:text-[#666666]">{data.percentage}%</p>
      </div>
    );
  }
  return null;
}

export function SessionsByTypeWidget() {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getSessionsByType.queryOptions(),
  );

  if (isLoading) {
    return <SessionsByTypeWidget.Skeleton />;
  }

  const breakdown = data?.breakdown ?? [];
  const total = data?.total ?? 0;

  const chartData = breakdown.map((item, index) => ({
    ...item,
    label: SESSION_TYPE_LABELS[item.type] ?? item.type,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center gap-2 mb-4">
        <Icons.PieChart className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium">
          Sessoes por Tipo
        </h3>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma sessao registrada
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={100}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="count"
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.type}-${index}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{total}</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {chartData.map((item) => (
              <div
                key={item.type}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-medium">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

SessionsByTypeWidget.Skeleton = function SessionsByTypeWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex items-center gap-4">
        <Skeleton className="w-32 h-32 rounded-full" />
        <div className="flex-1 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};
