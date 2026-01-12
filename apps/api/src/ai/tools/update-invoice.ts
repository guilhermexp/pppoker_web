import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@midpoker/db/client";
import { getInvoiceById, updateInvoice } from "@midpoker/db/queries";
import { getAppUrl } from "@midpoker/utils/envs";
import { formatAmount, formatDate } from "@midpoker/utils/format";
import { tool } from "ai";
import { z } from "zod";

const updateInvoiceSchema = z.object({
  id: z.string().uuid().describe("The invoice ID to update"),
  status: z
    .enum(["paid", "canceled", "unpaid", "draft"])
    .optional()
    .describe("New status for the invoice"),
  paidAt: z
    .string()
    .optional()
    .describe(
      "Date when the invoice was paid (ISO 8601 format). Required when setting status to 'paid'.",
    ),
  internalNote: z
    .string()
    .nullable()
    .optional()
    .describe("Internal note about the invoice (not visible to customer)"),
});

export const updateInvoiceTool = tool({
  description: `Update an invoice's status or add internal notes.

Use this tool to:
- Mark an invoice as PAID (include paidAt date)
- Mark an invoice as CANCELED
- Mark an invoice back to UNPAID
- Add internal notes to an invoice

Common actions:
- "Mark invoice #123 as paid" → status: "paid", paidAt: "2024-01-15"
- "Cancel invoice #456" → status: "canceled"
- "Add note to invoice" → internalNote: "Payment via bank transfer"`,
  inputSchema: updateInvoiceSchema,
  execute: async function* (
    { id, status, paidAt, internalNote },
    executionOptions,
  ) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;
    const userId = appContext.userId as string;

    if (!teamId) {
      yield {
        text: "Unable to update invoice: Team ID not found in context.",
      };
      return;
    }

    try {
      // First verify the invoice exists
      const existingInvoice = await getInvoiceById(db, { id, teamId });

      if (!existingInvoice) {
        yield {
          text: `Invoice not found with ID: ${id}. Please verify the invoice ID is correct.`,
        };
        return;
      }

      // If setting to paid, require paidAt or use today
      let finalPaidAt = paidAt;
      if (status === "paid" && !finalPaidAt) {
        finalPaidAt = new Date().toISOString();
      }

      // Build update data
      const updateData: Parameters<typeof updateInvoice>[1] = {
        id,
        teamId,
        userId,
      };

      if (status !== undefined) updateData.status = status;
      if (finalPaidAt !== undefined) updateData.paidAt = finalPaidAt;
      if (internalNote !== undefined) updateData.internalNote = internalNote;

      // Update the invoice
      const updatedInvoice = await updateInvoice(db, updateData);

      if (!updatedInvoice) {
        yield {
          text: "Failed to update invoice. Please try again.",
        };
        return;
      }

      const locale = appContext.locale ?? "en-US";
      const formattedAmount = formatAmount({
        amount: updatedInvoice.amount || 0,
        currency: updatedInvoice.currency || appContext.baseCurrency || "USD",
        locale,
      });

      // Build response
      const changes: string[] = [];
      if (status !== undefined) changes.push(`Status: **${status}**`);
      if (finalPaidAt !== undefined)
        changes.push(`Paid at: ${formatDate(finalPaidAt)}`);
      if (internalNote !== undefined)
        changes.push(`Internal note: ${internalNote || "(cleared)"}`);

      const statusEmoji =
        status === "paid"
          ? ""
          : status === "canceled"
            ? ""
            : status === "unpaid"
              ? ""
              : "";

      const response = `${statusEmoji} Successfully updated invoice:

**Invoice #${updatedInvoice.invoiceNumber}** | ${formattedAmount}
**Customer:** ${updatedInvoice.customerName || "Unknown"}
**Status:** ${updatedInvoice.status}

**Changes made:**
${changes.map((c) => `- ${c}`).join("\n")}`;

      yield {
        text: response,
        link: {
          text: "View invoice",
          url: `${getAppUrl()}/invoices/${updatedInvoice.id}`,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to update invoice: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
