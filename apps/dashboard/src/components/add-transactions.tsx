"use client";

import { useTransactionParams } from "@/hooks/use-transaction-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export function AddTransactions() {
  const t = useI18n();
  const [_, setParams] = useQueryStates({
    step: parseAsString,
    hide: parseAsBoolean,
    createAccount: parseAsBoolean,
  });

  const { setParams: setTransactionParams } = useTransactionParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Icons.Add size={17} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={10} align="end">
        <DropdownMenuItem
          onClick={() => setParams({ createAccount: true })}
          className="space-x-2"
        >
          <Icons.Accounts size={18} />
          <span>{t("transactions.add_account")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setParams({ step: "import", hide: true })}
          className="space-x-2"
        >
          <Icons.Import size={18} />
          <span>{t("transactions.import_backfill")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTransactionParams({ createTransaction: true })}
          className="space-x-2"
        >
          <Icons.CreateTransaction size={18} />
          <span>{t("transactions.create_transaction")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
