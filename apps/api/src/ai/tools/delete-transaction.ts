import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@midpoker/db/client";
import { deleteTransactions, getTransactionById } from "@midpoker/db/queries";
import { getAppUrl } from "@midpoker/utils/envs";
import { formatAmount } from "@midpoker/utils/format";
import { tool } from "ai";
import { z } from "zod";

const deleteTransactionSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1)
    .max(50)
    .describe("Array of transaction IDs to delete (1-50 transactions)"),
  confirm: z
    .boolean()
    .describe(
      "Must be true to confirm deletion. This action cannot be undone.",
    ),
});

export const deleteTransactionTool = tool({
  description: `Delete one or more manual transactions.

IMPORTANT RESTRICTIONS:
- Only MANUAL transactions can be deleted (transactions created manually, not imported from bank)
- This action is PERMANENT and cannot be undone
- The 'confirm' parameter must be true to proceed with deletion
- Bank-imported transactions cannot be deleted, only excluded (use update with status='excluded')`,
  inputSchema: deleteTransactionSchema,
  execute: async function* ({ ids, confirm }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;

    if (!teamId) {
      yield {
        text: "Unable to delete transactions: Team ID not found in context.",
      };
      return;
    }

    if (!confirm) {
      yield {
        text: "Deletion not confirmed. Set 'confirm' to true to proceed with deleting the transactions. This action cannot be undone.",
      };
      return;
    }

    try {
      // Verify transactions exist and get their details before deletion
      const transactionDetails = await Promise.all(
        ids.map(async (id) => {
          const transaction = await getTransactionById(db, { id, teamId });
          return transaction;
        }),
      );

      const existingTransactions = transactionDetails.filter(
        (t) => t !== null,
      );

      if (existingTransactions.length === 0) {
        yield {
          text: "No valid transactions found with the provided IDs.",
        };
        return;
      }

      // Check which transactions are manual (can be deleted)
      const manualTransactions = existingTransactions.filter((t) => t.manual);
      const nonManualTransactions = existingTransactions.filter(
        (t) => !t.manual,
      );

      if (manualTransactions.length === 0) {
        yield {
          text: `Cannot delete the specified transactions. Only manual transactions can be deleted.

The following ${nonManualTransactions.length} transaction(s) are bank-imported and cannot be deleted:
${nonManualTransactions.map((t) => `- ${t.name}`).join("\n")}

**Tip:** You can exclude bank-imported transactions instead by setting their status to 'excluded'.`,
        };
        return;
      }

      // Delete the manual transactions
      const manualIds = manualTransactions.map((t) => t.id);
      const deletedTransactions = await deleteTransactions(db, {
        ids: manualIds,
        teamId,
      });

      const locale = appContext.locale ?? "en-US";
      const baseCurrency = appContext.baseCurrency ?? "USD";

      // Build response
      let response = `Successfully deleted ${deletedTransactions.length} transaction(s):

| Name | Amount |
|------|--------|
${manualTransactions
  .map((t) => {
    const formattedAmount = formatAmount({
      amount: t.amount,
      currency: t.currency || baseCurrency,
      locale,
    });
    return `| ${t.name} | ${formattedAmount} |`;
  })
  .join("\n")}`;

      // Warn about non-manual transactions that couldn't be deleted
      if (nonManualTransactions.length > 0) {
        response += `

**Note:** ${nonManualTransactions.length} transaction(s) could not be deleted because they are bank-imported:
${nonManualTransactions.map((t) => `- ${t.name}`).join("\n")}

Use status='excluded' to hide these transactions instead.`;
      }

      yield {
        text: response,
        link: {
          text: "View transactions",
          url: `${getAppUrl()}/transactions`,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to delete transactions: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
