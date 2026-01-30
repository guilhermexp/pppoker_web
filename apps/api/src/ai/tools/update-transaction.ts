import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@midpoker/db/client";
import {
  getCategories,
  getTransactionById,
  updateTransaction,
} from "@midpoker/db/queries";
import { getAppUrl } from "@midpoker/utils/envs";
import { formatAmount, formatDate } from "@midpoker/utils/format";
import { tool } from "ai";
import { z } from "zod";

const updateTransactionSchema = z.object({
  id: z.string().uuid().describe("The transaction ID to update"),
  name: z.string().optional().describe("New name/description"),
  amount: z
    .number()
    .optional()
    .describe(
      "New amount (negative for expenses, positive for income). Only works for manual transactions.",
    ),
  currency: z
    .string()
    .length(3)
    .optional()
    .describe("New currency code (ISO 4217)"),
  date: z
    .string()
    .optional()
    .describe("New date (ISO 8601 format, e.g., '2024-01-15')"),
  categorySlug: z
    .string()
    .nullable()
    .optional()
    .describe("New category slug (or null to remove category)"),
  categoryName: z
    .string()
    .optional()
    .describe(
      "Category name to search for. Used to find category if categorySlug not provided.",
    ),
  status: z
    .enum(["pending", "archived", "completed", "posted", "excluded"])
    .optional()
    .describe("New status"),
  note: z
    .string()
    .nullable()
    .optional()
    .describe("New note (or null to clear)"),
  recurring: z.boolean().optional().describe("Mark as recurring transaction"),
  frequency: z
    .enum(["weekly", "monthly", "annually", "irregular"])
    .nullable()
    .optional()
    .describe("Recurring frequency"),
  internal: z.boolean().optional().describe("Mark as internal transfer"),
});

export const updateTransactionTool = tool({
  description: `Update an existing transaction's details.

Use this tool to:
- Change the name, amount, date, or category of a transaction
- Mark a transaction as recurring
- Add or update notes
- Change transaction status (pending, completed, archived, excluded)
- Mark as internal transfer

Note: Amount and currency can only be changed for manual transactions.`,
  inputSchema: updateTransactionSchema,
  execute: async function* (
    {
      id,
      name,
      amount,
      currency,
      date,
      categorySlug,
      categoryName,
      status,
      note,
      recurring,
      frequency,
      internal,
    },
    executionOptions,
  ) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;
    const userId = appContext.userId as string;

    if (!teamId) {
      yield {
        text: "Unable to update transaction: Team ID not found in context.",
      };
      return;
    }

    try {
      // First, verify the transaction exists
      const existingTransaction = await getTransactionById(db, {
        id,
        teamId,
      });

      if (!existingTransaction) {
        yield {
          text: `Transaction not found with ID: ${id}. Please verify the transaction ID is correct.`,
        };
        return;
      }

      // Find category if categoryName provided but not categorySlug
      let finalCategorySlug = categorySlug;

      if (finalCategorySlug === undefined && categoryName) {
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

        if (!finalCategorySlug) {
          yield {
            text: `Category "${categoryName}" not found. The transaction will be updated without changing the category.`,
          };
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        id,
        teamId,
        userId,
      };

      if (name !== undefined) updateData.name = name;
      if (amount !== undefined) updateData.amount = amount;
      if (currency !== undefined) updateData.currency = currency;
      if (date !== undefined) updateData.date = date;
      if (finalCategorySlug !== undefined)
        updateData.categorySlug = finalCategorySlug;
      if (status !== undefined) updateData.status = status;
      if (note !== undefined) updateData.note = note;
      if (recurring !== undefined) updateData.recurring = recurring;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (internal !== undefined) updateData.internal = internal;

      // Update the transaction
      const updatedTransaction = await updateTransaction(
        db,
        updateData as Parameters<typeof updateTransaction>[1],
      );

      if (!updatedTransaction) {
        yield {
          text: "Failed to update transaction. Please try again.",
        };
        return;
      }

      const locale = appContext.locale ?? "en-US";
      const formattedAmount = formatAmount({
        amount: updatedTransaction.amount,
        currency:
          updatedTransaction.currency || appContext.baseCurrency || "USD",
        locale,
      });

      // Build changes summary
      const changes: string[] = [];
      if (name !== undefined) changes.push(`Name: "${name}"`);
      if (amount !== undefined) changes.push(`Amount: ${formattedAmount}`);
      if (currency !== undefined) changes.push(`Currency: ${currency}`);
      if (date !== undefined) changes.push(`Date: ${formatDate(date)}`);
      if (finalCategorySlug !== undefined)
        changes.push(
          `Category: ${updatedTransaction.category?.name || "Uncategorized"}`,
        );
      if (status !== undefined) changes.push(`Status: ${status}`);
      if (note !== undefined) changes.push(`Note: ${note || "(cleared)"}`);
      if (recurring !== undefined)
        changes.push(`Recurring: ${recurring ? "Yes" : "No"}`);
      if (frequency !== undefined)
        changes.push(`Frequency: ${frequency || "(cleared)"}`);
      if (internal !== undefined)
        changes.push(`Internal: ${internal ? "Yes" : "No"}`);

      const response = `Successfully updated transaction:

**${updatedTransaction.name}** | ${formattedAmount} | ${formatDate(updatedTransaction.date)}

**Changes made:**
${changes.map((c) => `- ${c}`).join("\n")}`;

      yield {
        text: response,
        link: {
          text: "View transaction",
          url: `${getAppUrl()}/transactions?id=${updatedTransaction.id}`,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to update transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
