"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@midday/ui/button";
import { parseAsBoolean, useQueryState } from "nuqs";

export function AddAccountButton({ onClick }: { onClick?: () => void }) {
  const t = useI18n();
  const [_, setCreateAccount] = useQueryState(
    "createAccount",
    parseAsBoolean.withDefault(false),
  );

  const handleClick = () => {
    setCreateAccount(true);
    onClick?.();
  };

  return (
    <Button
      data-event="Add account"
      data-icon="🏦"
      data-channel="bank"
      onClick={handleClick}
    >
      {t("bank_account.add_account")}
    </Button>
  );
}
