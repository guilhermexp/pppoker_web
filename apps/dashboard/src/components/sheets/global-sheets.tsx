"use client";

import dynamic from "next/dynamic";

const CreateBankAccountModal = dynamic(
  () =>
    import("@/components/modals/create-bank-account-modal").then(
      (mod) => mod.CreateBankAccountModal,
    ),
  { ssr: false },
);
const ImportModal = dynamic(
  () =>
    import("@/components/modals/import-modal").then((mod) => mod.ImportModal),
  { ssr: false },
);
const SearchModal = dynamic(
  () =>
    import("@/components/search/search-modal").then((mod) => mod.SearchModal),
  { ssr: false },
);
const CategoryCreateSheet = dynamic(
  () =>
    import("@/components/sheets/category-create-sheet").then(
      (mod) => mod.CategoryCreateSheet,
    ),
  { ssr: false },
);
const CategoryEditSheet = dynamic(
  () =>
    import("@/components/sheets/category-edit-sheet").then(
      (mod) => mod.CategoryEditSheet,
    ),
  { ssr: false },
);
const CustomerCreateSheet = dynamic(
  () =>
    import("@/components/sheets/customer-create-sheet").then(
      (mod) => mod.CustomerCreateSheet,
    ),
  { ssr: false },
);
const CustomerEditSheet = dynamic(
  () =>
    import("@/components/sheets/customer-edit-sheet").then(
      (mod) => mod.CustomerEditSheet,
    ),
  { ssr: false },
);
const DocumentSheet = dynamic(
  () =>
    import("@/components/sheets/document-sheet").then(
      (mod) => mod.DocumentSheet,
    ),
  { ssr: false },
);
const InboxDetailsSheet = dynamic(
  () =>
    import("@/components/sheets/inbox-details-sheet").then(
      (mod) => mod.InboxDetailsSheet,
    ),
  { ssr: false },
);
const InvoiceDetailsSheet = dynamic(
  () =>
    import("@/components/sheets/invoice-details-sheet").then(
      (mod) => mod.InvoiceDetailsSheet,
    ),
  { ssr: false },
);
const InvoiceSheet = dynamic(
  () =>
    import("@/components/sheets/invoice-sheet").then((mod) => mod.InvoiceSheet),
  { ssr: false },
);
const PokerAgentDetailSheet = dynamic(
  () =>
    import("@/components/sheets/poker-agent-detail-sheet").then(
      (mod) => mod.PokerAgentDetailSheet,
    ),
  { ssr: false },
);
const PokerPlayerCreateSheet = dynamic(
  () =>
    import("@/components/sheets/poker-player-create-sheet").then(
      (mod) => mod.PokerPlayerCreateSheet,
    ),
  { ssr: false },
);
const PokerPlayerDetailSheet = dynamic(
  () =>
    import("@/components/sheets/poker-player-detail-sheet").then(
      (mod) => mod.PokerPlayerDetailSheet,
    ),
  { ssr: false },
);
const PokerSessionDetailSheet = dynamic(
  () =>
    import("@/components/sheets/poker-session-detail-sheet").then(
      (mod) => mod.PokerSessionDetailSheet,
    ),
  { ssr: false },
);
const PokerSuperAgentDetailSheet = dynamic(
  () =>
    import("@/components/sheets/poker-super-agent-detail-sheet").then(
      (mod) => mod.PokerSuperAgentDetailSheet,
    ),
  { ssr: false },
);
const ProductCreateSheet = dynamic(
  () =>
    import("@/components/sheets/product-create-sheet").then(
      (mod) => mod.ProductCreateSheet,
    ),
  { ssr: false },
);
const ProductEditSheet = dynamic(
  () =>
    import("@/components/sheets/product-edit-sheet").then(
      (mod) => mod.ProductEditSheet,
    ),
  { ssr: false },
);
const TransactionCreateSheet = dynamic(
  () =>
    import("@/components/sheets/transaction-create-sheet").then(
      (mod) => mod.TransactionCreateSheet,
    ),
  { ssr: false },
);
const TransactionEditSheet = dynamic(
  () =>
    import("@/components/sheets/transaction-edit-sheet").then(
      (mod) => mod.TransactionEditSheet,
    ),
  { ssr: false },
);
const TransactionSheet = dynamic(
  () =>
    import("@/components/sheets/transaction-sheet").then(
      (mod) => mod.TransactionSheet,
    ),
  { ssr: false },
);

export function GlobalSheets() {
  return (
    <>
      <CategoryCreateSheet />
      <CategoryEditSheet />

      <CustomerCreateSheet />
      <CustomerEditSheet />

      <ProductCreateSheet />
      <ProductEditSheet />

      <PokerPlayerCreateSheet />
      <PokerPlayerDetailSheet />
      <PokerSessionDetailSheet />
      <PokerAgentDetailSheet />
      <PokerSuperAgentDetailSheet />

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
