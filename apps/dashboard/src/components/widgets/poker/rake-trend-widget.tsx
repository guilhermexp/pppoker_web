"use client";

import { useTRPC } from "@/trpc/client";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      week: string;
      rake: number;
      formattedWeek: string;
    };
  }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-white dark:bg-[#0c0c0c] text-black dark:text-white text-xs rounded-none border dark:border-[#1d1d1d]">
        <p className="mb-1 text-gray-500 dark:text-[#666666] font-medium">
          Semana de {data.formattedWeek}
        </p>
        <p className="text-black dark:text-white font-sans font-medium">
          Rake:{" "}
          {data.rake.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    );
  }
  return null;
}

function formatCurrency(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

export function RakeTrendWidget() {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getRakeTrend.queryOptions({ weeks: 8 }),
  );

  if (isLoading) {
    return <RakeTrendWidget.Skeleton />;
  }

  const trend = data?.trend ?? [];

  const chartData = trend.map((item) => ({
    ...item,
    formattedWeek: format(parseISO(item.week), "dd/MM", { locale: ptBR }),
  }));

  const totalRake = trend.reduce((sum, t) => sum + t.rake, 0);
  const avgRake = trend.length > 0 ? totalRake / trend.length : 0;

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground font-medium">
            Tendencia de Rake
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Media Semanal</p>
          <p className="text-sm font-bold text-green-600">
            {avgRake.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Sem dados de rake
        </p>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%" minWidth={100}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="rakeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="formattedWeek"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#888" }}
                dy={5}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#888" }}
                tickFormatter={formatCurrency}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="rake"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#rakeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

RakeTrendWidget.Skeleton = function RakeTrendWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
};
