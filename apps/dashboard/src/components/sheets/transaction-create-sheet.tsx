"use client";

import { useTransactionParams } from "@/hooks/use-transaction-params";
import { useI18n } from "@/locales/client";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@midpoker/ui/sheet";
import { TransactionCreateForm } from "../forms/transaction-create-form";

export function TransactionCreateSheet() {
  const t = useI18n();
  const { createTransaction, setParams } = useTransactionParams();

  const isOpen = Boolean(createTransaction);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setParams(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader className="mb-8">
          <SheetTitle>{t("transaction_create.title")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
          <TransactionCreateForm />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
