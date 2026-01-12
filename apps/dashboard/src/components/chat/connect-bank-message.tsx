"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";

export function ConnectBankMessage() {
  const t = useI18n();
  const router = useRouter();
  const [_, setCreateAccount] = useQueryState(
    "createAccount",
    parseAsBoolean.withDefault(false),
  );

  const handleCreateAccount = () => {
    setCreateAccount(true);
  };

  const handleMaybeLater = () => {
    router.push("/");
  };

  return (
    <div className="w-full border p-4 space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 size-7 flex items-center justify-center border text-primary bg-secondary">
          <Icons.Accounts size={15} />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-foreground">{t("chat.create_account_title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("chat.create_account_description")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 ml-11">
        <Button onClick={handleCreateAccount}>
          {t("chat.create_account_button")}
        </Button>
        <Button
          onClick={handleMaybeLater}
          variant="outline"
          className="text-primary"
        >
          {t("chat.maybe_later")}
        </Button>
      </div>
    </div>
  );
}
