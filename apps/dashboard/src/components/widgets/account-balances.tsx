import { FormatAmount } from "@/components/format-amount";
import { useChatInterface } from "@/hooks/use-chat-interface";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { useChatActions, useChatId } from "@ai-sdk-tools/store";
import { Icons } from "@midday/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { BaseWidget } from "./base";
import { WIDGET_POLLING_CONFIG } from "./widget-config";

export function AccountBalancesWidget() {
  const trpc = useTRPC();
  const { sendMessage } = useChatActions();
  const chatId = useChatId();
  const { setChatId } = useChatInterface();
  const t = useI18n();

  // Fetch combined account balances
  const { data } = useQuery({
    ...trpc.widgets.getAccountBalances.queryOptions({}),
    ...WIDGET_POLLING_CONFIG,
  });

  const balanceData = data?.result;
  const totalBalance = balanceData?.totalBalance ?? 0;
  const currency = balanceData?.currency ?? "USD";
  const accountCount = balanceData?.accountCount ?? 0;

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

  const handleOpenAccounts = () => {
    handleToolCall({
      toolName: "getAccountBalances",
      text: "Show account balances",
    });
  };

  const getDescription = () => {
    if (accountCount === 0) {
      return t("widget_descriptions.no_accounts");
    }

    if (accountCount === 1) {
      return t("widget_descriptions.combined_balance_one");
    }

    return t("widget_descriptions.combined_balance_other", { count: accountCount });
  };

  return (
    <BaseWidget
      title={t("widget_titles.account_balances")}
      icon={<Icons.Accounts className="size-4" />}
      description={getDescription()}
      onClick={handleOpenAccounts}
      actions={t("widget_actions.view_account_balances")}
    >
      {balanceData && (
        <div className="space-y-1">
          <h2 className="text-2xl font-normal text-[24px]">
            <FormatAmount
              currency={currency}
              amount={totalBalance}
              minimumFractionDigits={0}
              maximumFractionDigits={0}
            />
          </h2>
        </div>
      )}
    </BaseWidget>
  );
}
