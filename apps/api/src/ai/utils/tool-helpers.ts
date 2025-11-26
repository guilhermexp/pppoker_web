import type { AppContext } from "@api/ai/agents/config/shared";

export function checkBankAccountsRequired(appContext: AppContext): {
  hasBankAccounts: boolean;
  shouldYield: boolean;
} {
  const hasBankAccounts = appContext.hasBankAccounts ?? false;
  // Allow manual workflows even when no bank integrations are connected.
  return {
    hasBankAccounts,
    shouldYield: false,
  };
}
