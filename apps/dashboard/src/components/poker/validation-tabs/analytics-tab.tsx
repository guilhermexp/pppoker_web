"use client";

import type { DetectedInsight } from "@/lib/poker/types";

type AnalyticsTabProps = {
  insights: DetectedInsight[];
};

export function AnalyticsTab({ insights }: AnalyticsTabProps) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#878787]">Nenhum insight detectado</p>
        <p className="text-sm text-[#878787] mt-1">
          Os dados não apresentam padrões significativos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#878787]">
        {insights.length} insights detectados
      </p>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div key={insight.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">{insight.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{insight.title}</p>
                <p className="text-sm text-[#878787] mt-1">
                  {insight.description}
                </p>

                {insight.entities && insight.entities.length > 0 && (
                  <div className="mt-3 border-t pt-3 space-y-1">
                    {insight.entities.map((entity) => (
                      <div
                        key={entity.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-[#878787]">{entity.name}</span>
                        <span
                          className={`font-mono ${entity.value >= 0 ? "text-[#00C969]" : ""}`}
                        >
                          {entity.value >= 0 ? "+" : ""}
                          {formatCurrency(entity.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
