import { useChatInterface } from "@/hooks/use-chat-interface";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { useChatActions, useChatId } from "@ai-sdk-tools/store";
import { Icons } from "@midday/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { BaseWidget } from "./base";
import { WIDGET_POLLING_CONFIG } from "./widget-config";

export function RunwayWidget() {
  const trpc = useTRPC();
  const { sendMessage } = useChatActions();
  const chatId = useChatId();
  const { setChatId } = useChatInterface();
  const t = useI18n();

  const { data } = useQuery({
    ...trpc.widgets.getRunway.queryOptions({
      from: subMonths(startOfMonth(new Date()), 12).toISOString(),
      to: endOfMonth(new Date()).toISOString(),
    }),
    ...WIDGET_POLLING_CONFIG,
  });

  const handleToolCall = (params: {
    toolName: string;
    toolParams: Record<string, any>;
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

  return (
    <BaseWidget
      title={t("widget_titles.cash_runway")}
      icon={<Icons.Time className="size-4" />}
      description={t("widget_descriptions.cash_runway_months")}
      onClick={() => {
        handleToolCall({
          toolName: "getRunway",
          toolParams: {
            from: subMonths(startOfMonth(new Date()), 12).toISOString(),
            to: endOfMonth(new Date()).toISOString(),
            showCanvas: true,
          },
          text: "Show cash runway",
        });
      }}
      actions={t("widget_actions.view_runway")}
    >
      <h2 className="text-2xl font-normal text-[24px] mb-2">
        {data?.result} {t("widget_descriptions.months")}
      </h2>
    </BaseWidget>
  );
}
