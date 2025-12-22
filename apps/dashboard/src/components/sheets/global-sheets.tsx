"use client";

import { CreateBankAccountModal } from "@/components/modals/create-bank-account-modal";
import { ImportModal } from "@/components/modals/import-modal";
import { SearchModal } from "@/components/search/search-modal";
import { CategoryCreateSheet } from "@/components/sheets/category-create-sheet";
import { CategoryEditSheet } from "@/components/sheets/category-edit-sheet";
import { CustomerCreateSheet } from "@/components/sheets/customer-create-sheet";
import { CustomerEditSheet } from "@/components/sheets/customer-edit-sheet";
import { DocumentSheet } from "@/components/sheets/document-sheet";
import { InboxDetailsSheet } from "@/components/sheets/inbox-details-sheet";
import { InvoiceDetailsSheet } from "@/components/sheets/invoice-details-sheet";
import { InvoiceSheet } from "@/components/sheets/invoice-sheet";
import { PokerPlayerCreateSheet } from "@/components/sheets/poker-player-create-sheet";
import { PokerPlayerEditSheet } from "@/components/sheets/poker-player-edit-sheet";
import { ProductCreateSheet } from "@/components/sheets/product-create-sheet";
import { ProductEditSheet } from "@/components/sheets/product-edit-sheet";
import { TrackerCreateSheet } from "@/components/sheets/tracker-create-sheet";
import { TrackerScheduleSheet } from "@/components/sheets/tracker-schedule-sheet";
import { TrackerUpdateSheet } from "@/components/sheets/tracker-update-sheet";
import { TransactionCreateSheet } from "@/components/sheets/transaction-create-sheet";
import { TransactionEditSheet } from "@/components/sheets/transaction-edit-sheet";
import { TransactionSheet } from "@/components/sheets/transaction-sheet";

export function GlobalSheets() {
  return (
    <>
      <TrackerUpdateSheet />
      <TrackerCreateSheet />
      <TrackerScheduleSheet />

      <CategoryCreateSheet />
      <CategoryEditSheet />

      <CustomerCreateSheet />
      <CustomerEditSheet />

      <ProductCreateSheet />
      <ProductEditSheet />

      <PokerPlayerCreateSheet />
      <PokerPlayerEditSheet />

      <TransactionSheet />
      <TransactionCreateSheet />
      <TransactionEditSheet />

      <SearchModal />

      <DocumentSheet />
      <InboxDetailsSheet />

      <ImportModal />
      <CreateBankAccountModal />

      <InvoiceDetailsSheet />
      <InvoiceSheet />
    </>
  );
}
