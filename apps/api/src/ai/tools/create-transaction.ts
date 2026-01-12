import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@midpoker/db/client";
import {
  createTransaction,
  getBankAccounts,
  getCategories,
} from "@midpoker/db/queries";
import type { EmbedTransactionPayload } from "@midpoker/jobs/schema";
import { getAppUrl } from "@midpoker/utils/envs";
import { formatAmount, formatDate } from "@midpoker/utils/format";
import { tasks } from "@trigger.dev/sdk";
import { tool } from "ai";
import { z } from "zod";

const createTransactionSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Name/description of the transaction (e.g., 'Office Supplies')"),
  amount: z
    .number()
    .describe(
      "Amount of the transaction. Use NEGATIVE values for expenses/payments (e.g., -150.50) and POSITIVE values for income/receipts (e.g., 500.00)",
    ),
  currency: z
    .string()
    .length(3)
    .optional()
    .describe(
      "Currency code (ISO 4217, e.g., 'USD', 'BRL', 'EUR'). Defaults to team's base currency if not provided.",
    ),
  date: z
    .string()
    .optional()
    .describe(
      "Date of the transaction (ISO 8601 format, e.g., '2024-01-15'). Defaults to today if not provided.",
    ),
  bankAccountId: z
    .string()
    .optional()
    .describe(
      "ID of the bank account. If not provided, will use the first available account.",
    ),
  bankAccountName: z
    .string()
    .optional()
    .describe(
      "Name of the bank account to use (e.g., 'Main Checking'). Used to find account if bankAccountId not provided.",
    ),
  categorySlug: z
    .string()
    .optional()
    .describe(
      "Category slug for the transaction (e.g., 'office-supplies', 'travel', 'income')",
    ),
  categoryName: z
    .string()
    .optional()
    .describe(
      "Category name to search for (e.g., 'Office Supplies'). Used to find category if categorySlug not provided.",
    ),
  note: z.string().optional().describe("Additional note or memo"),
  internal: z
    .boolean()
    .optional()
    .describe("Whether this is an internal transfer between accounts"),
});

export const createTransactionTool = tool({
  description: `Create a new manual transaction (expense, payment, or income).

IMPORTANT RULES:
- For EXPENSES/PAYMENTS: Use NEGATIVE amounts (e.g., -100 for a $100 expense)
- For INCOME/RECEIPTS: Use POSITIVE amounts (e.g., 500 for $500 received)
- At least one bank account must exist to create transactions
- If no bank account is specified, the first available account will be used`,
  inputSchema: createTransactionSchema,
  execute: async function* (
    {
      name,
      amount,
      currency,
      date,
      bankAccountId,
      bankAccountName,
      categorySlug,
      categoryName,
      note,
      internal,
    },
    executionOptions,
  ) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;

    if (!teamId) {
      yield {
        text: "Unable to create transaction: Team ID not found in context.",
      };
      return;
    }

    try {
      // Get available bank accounts
      const accounts = await getBankAccounts(db, { teamId, enabled: true });

      if (accounts.length === 0) {
        yield {
          text: "Unable to create transaction: No bank accounts found. Please create a bank account first.",
          link: {
            text: "Add bank account",
            url: `${getAppUrl()}/settings/accounts`,
          },
        };
        return;
      }

      // Find the bank account to use
      let finalBankAccountId = bankAccountId;

      if (!finalBankAccountId && bankAccountName) {
        // Search by name
        const matchedAccount = accounts.find(
          (acc) =>
            acc.name?.toLowerCase().includes(bankAccountName.toLowerCase()),
        );
        if (matchedAccount) {
          finalBankAccountId = matchedAccount.id;
        }
      }

      // If still no account, use the first one
      if (!finalBankAccountId) {
        finalBankAccountId = accounts[0]?.id;
      }

      if (!finalBankAccountId) {
        yield {
          text: "Unable to create transaction: Could not determine bank account to use.",
        };
        return;
      }

      // Get the selected account for currency fallback
      const selectedAccount = accounts.find(
        (acc) => acc.id === finalBankAccountId,
      );

      // Find category if categoryName provided but not categorySlug
      let finalCategorySlug = categorySlug;

      if (!finalCategorySlug && categoryName) {
        const categories = await getCategories(db, { teamId });
        // Search in both parent and child categories
        for (const cat of categories) {
          if (cat.name?.toLowerCase().includes(categoryName.toLowerCase())) {
            finalCategorySlug = cat.slug;
            break;
          }
          // Check children
          for (const child of cat.children || []) {
            if (
              child.name?.toLowerCase().includes(categoryName.toLowerCase())
            ) {
              finalCategorySlug = child.slug;
              break;
            }
          }
          if (finalCategorySlug) break;
        }
      }

      // Determine currency (priority: provided > account > team base)
      const finalCurrency =
        currency ||
        selectedAccount?.currency ||
        appContext.baseCurrency ||
        "USD";

      // Determine date (default to today)
      const finalDate = date || new Date().toISOString().split("T")[0];

      // Create the transaction
      const transaction = await createTransaction(db, {
        name,
        amount,
        currency: finalCurrency,
        date: finalDate!,
        bankAccountId: finalBankAccountId,
        teamId,
        categorySlug: finalCategorySlug || null,
        note: note || null,
        internal: internal || false,
      });

      if (!transaction) {
        yield {
          text: "Failed to create transaction. Please try again.",
        };
        return;
      }

      // Trigger embedding for the new transaction (for AI matching)
      // This is optional - if Trigger.dev is not configured, we still want the transaction to be created
      if (transaction.id) {
        try {
          await tasks.trigger("embed-transaction", {
            transactionIds: [transaction.id],
            teamId,
          } satisfies EmbedTransactionPayload);
        } catch {
          // Trigger.dev may not be configured in development - this is fine
        }
      }

      const locale = appContext.locale ?? "en-US";
      const formattedAmount = formatAmount({
        amount: transaction.amount,
        currency: transaction.currency || finalCurrency,
        locale,
      });

      const transactionType = transaction.amount < 0 ? "expense" : "income";

      const response = `Successfully created ${transactionType}:

| Field | Value |
|-------|-------|
| **Name** | ${transaction.name} |
| **Amount** | ${formattedAmount} |
| **Date** | ${formatDate(transaction.date)} |
| **Account** | ${transaction.account?.name || "Unknown"} |
| **Category** | ${transaction.category?.name || "Uncategorized"} |
${transaction.note ? `| **Note** | ${transaction.note} |` : ""}`;

      yield {
        text: response,
        link: {
          text: "View transaction",
          url: `${getAppUrl()}/transactions?id=${transaction.id}`,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to create transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
