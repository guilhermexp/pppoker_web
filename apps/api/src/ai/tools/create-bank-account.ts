import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@midday/db/client";
import { createBankAccount } from "@midday/db/queries";
import { getAppUrl } from "@midday/utils/envs";
import { tool } from "ai";
import { z } from "zod";

const createBankAccountSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Name of the bank account (e.g., 'Main Checking', 'Business Savings', 'Nubank')",
    ),
  currency: z
    .string()
    .length(3)
    .optional()
    .describe(
      "Currency code (ISO 4217, e.g., 'USD', 'BRL', 'EUR'). Defaults to team's base currency.",
    ),
});

export const createBankAccountTool = tool({
  description: `Create a new manual bank account.

Use this tool to:
- Add a new bank account for tracking transactions
- Set up accounts for different currencies
- Create accounts like checking, savings, credit cards, etc.

Note: This creates a MANUAL account (not connected to a bank).
Transactions must be added manually or imported via CSV.`,
  inputSchema: createBankAccountSchema,
  execute: async function* ({ name, currency }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;
    const userId = appContext.userId as string;

    if (!teamId) {
      yield {
        text: "Unable to create bank account: Team ID not found in context.",
      };
      return;
    }

    if (!userId) {
      yield {
        text: "Unable to create bank account: User ID not found in context.",
      };
      return;
    }

    try {
      // Use team's base currency if not specified
      const finalCurrency = currency || appContext.baseCurrency || "USD";

      const account = await createBankAccount(db, {
        name,
        currency: finalCurrency,
        teamId,
        userId,
        manual: true,
      });

      if (!account) {
        yield {
          text: "Failed to create bank account. Please try again.",
        };
        return;
      }

      const response = `Successfully created bank account:

| Field | Value |
|-------|-------|
| **Name** | ${account.name} |
| **Currency** | ${account.currency} |
| **Type** | Manual |
| **Status** | Enabled |

**Account ID:** \`${account.id}\`

You can now create transactions in this account.`;

      yield {
        text: response,
        link: {
          text: "Manage accounts",
          url: `${getAppUrl()}/settings/accounts`,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to create bank account: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
