"use client";

import { FormatAmount } from "@/components/format-amount";
import { useChatInterface } from "@/hooks/use-chat-interface";
import { useTeamQuery } from "@/hooks/use-team";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { useChatActions, useChatId } from "@ai-sdk-tools/store";
import { Icons } from "@midday/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BaseWidget } from "./base";
import { WIDGET_POLLING_CONFIG } from "./widget-config";

export function CustomerLifetimeValueWidget() {
  const trpc = useTRPC();
  const { data: team } = useTeamQuery();
  const router = useRouter();
  const { sendMessage } = useChatActions();
  const chatId = useChatId();
  const { setChatId } = useChatInterface();
  const t = useI18n();

  const { data, isLoading } = useQuery({
    ...trpc.widgets.getCustomerLifetimeValue.queryOptions({
      currency: team?.baseCurrency ?? undefined,
    }),
    ...WIDGET_POLLING_CONFIG,
  });

  const handleToolCall = (params: {
    toolName: string;
    toolParams?: Record<string, any>;
    text: string;
  }) => {
    if (!chatId) return;

    setChatId(chatId);

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: params.text }],
      metadata: {
        toolCall: {
          toolName: params.toolName,
          toolParams: params.toolParams,
        },
      },
    });
  };

  const handleViewDetails = () => {
    handleToolCall({
      toolName: "getCustomers",
      toolParams: {
        sort: ["totalRevenue", "desc"],
        pageSize: 10,
      },
      text: "Show customers",
    });
  };

  const result = data?.result;
  const summary = result?.summary;
  const currency = summary?.currency || team?.baseCurrency || "USD";

  // Calculate active customer percentage
  const activePercentage =
    summary?.totalCustomers && summary.totalCustomers > 0
      ? Math.round((summary.activeCustomers / summary.totalCustomers) * 100)
      : 0;

  return (
    <BaseWidget
      title={t("widget_titles.customer_lifetime_value")}
      icon={<Icons.Customers className="size-4" />}
      description={
        <div className="flex flex-col gap-3">
          {!isLoading && summary ? (
            <>
              {/* Average CLV */}
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-medium">
                  <FormatAmount
                    amount={summary.averageCLV}
                    currency={currency}
                  />
                </p>
                <span className="text-xs text-[#878787]">
                  {t("widget_descriptions.avg_clv")}
                </span>
              </div>

              {/* Summary Stats */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#878787] text-xs">
                    {t("widget_descriptions.total_customers")}
                  </span>
                  <span className="font-medium">{summary.totalCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#878787] text-xs">
                    {t("widget_descriptions.active_30d")}
                  </span>
                  <span className="font-medium">
                    {summary.activeCustomers}{" "}
                    <span className="text-[#878787]">
                      ({activePercentage}%)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#878787] text-xs">
                    {t("widget_descriptions.avg_lifespan")}
                  </span>
                  <span className="font-medium">
                    {summary.averageLifespanDays}{" "}
                    {t("widget_descriptions.days")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleViewDetails}
                className="text-xs text-[#878787] hover:text-foreground text-left transition-colors mt-1"
              >
                {t("widget_actions.view_all_customers")}
              </button>
            </>
          ) : (
            <div className="flex items-center min-h-[120px]">
              <div className="text-xs text-muted-foreground">
                {t("widget_descriptions.no_customer_data")}
              </div>
            </div>
          )}
        </div>
      }
      actions=""
      onClick={handleViewDetails}
    >
      <div />
    </BaseWidget>
  );
}
