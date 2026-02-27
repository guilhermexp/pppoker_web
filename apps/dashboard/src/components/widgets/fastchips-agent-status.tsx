"use client";

import { getApiBaseUrl } from "@/lib/api-base-url";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { createClient } from "@midpoker/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BaseWidget } from "./base";

export function FastchipsAgentStatusWidget() {
  const trpc = useTRPC();

  const { data: nanobotSettings } = useQuery({
    ...trpc.nanobot.getSettings.queryOptions(),
    refetchInterval: 60_000,
  });

  const { data: nanobotStatus } = useQuery({
    ...trpc.nanobot.status.queryOptions(),
    refetchInterval: 60_000,
  });

  const { data: gatewayData } = useQuery({
    queryKey: ["gateway-status"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const apiBase = getApiBaseUrl();
      const resp = await fetch(`${apiBase}/nanobot/gateway/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) return null;
      return resp.json() as Promise<{
        whatsapp: { status: string; has_qr: boolean };
        telegram: { status: string; has_token: boolean };
      }>;
    },
    refetchInterval: 30_000,
  });

  const isAgentEnabled = nanobotSettings?.enabled ?? false;
  const engine = nanobotStatus?.engine ?? "nanobot";
  const modelProvider =
    nanobotSettings?.modelConfig?.provider || nanobotSettings?.provider || "";
  const modelName =
    nanobotSettings?.modelConfig?.model || nanobotSettings?.model || "";
  const modelDisplay = modelName || modelProvider || "Nao configurado";

  const whatsappStatus = gatewayData?.whatsapp?.status ?? "desconhecido";
  const telegramStatus = gatewayData?.telegram?.status ?? "desconhecido";
  const whatsappConnected = whatsappStatus === "connected";
  const telegramConnected = telegramStatus === "connected";
  const hasGateway = whatsappConnected || telegramConnected;

  const gatewayLabel =
    whatsappConnected && telegramConnected
      ? "WhatsApp + Telegram"
      : whatsappConnected
        ? "WhatsApp"
        : telegramConnected
          ? "Telegram"
          : "Nenhum";

  return (
    <BaseWidget
      title="Status do Agente"
      icon={<Icons.TrendingUp className="size-4" />}
      description={
        <p className="text-sm text-[#666666]">Nanobot AI + Gateway</p>
      }
      actions="Ver configuracoes"
      onClick={() => {
        window.location.href = "/settings/nanobot";
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 ${isAgentEnabled ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
          />
          <span className="text-xs">
            Agente:{" "}
            <span className="font-medium">
              {isAgentEnabled ? "Ativo" : "Inativo"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 ${hasGateway ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
          />
          <span className="text-xs">
            Gateway: <span className="font-medium">{gatewayLabel}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0 bg-blue-500" />
          <span className="text-xs truncate">
            Modelo: <span className="font-medium">{modelDisplay}</span>
          </span>
        </div>
      </div>
    </BaseWidget>
  );
}
