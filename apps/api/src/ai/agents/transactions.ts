import { openai } from "@ai-sdk/openai";
import {
  COMMON_AGENT_RULES,
  createAgent,
  formatContextForLLM,
} from "@api/ai/agents/config/shared";
import { createTransactionTool } from "@api/ai/tools/create-transaction";
import { deleteTransactionTool } from "@api/ai/tools/delete-transaction";
import { getCategoriesTool } from "@api/ai/tools/get-categories";
import { getTransactionsTool } from "@api/ai/tools/get-transactions";
import { updateTransactionTool } from "@api/ai/tools/update-transaction";

export const transactionsAgent = createAgent({
  name: "transactions",
  model: openai("gpt-4o-mini"),
  temperature: 0.3,
  instructions: (
    ctx,
  ) => `You are a transactions specialist for ${ctx.companyName}. Your goal is to help users query, analyze, create, update, and delete transaction data.

<background-data>
${formatContextForLLM(ctx)}
</background-data>

${COMMON_AGENT_RULES}

<agent-specific-rules>
- Lead with key information
- For "largest transactions", use sort and limit filters
- Highlight key insights from the data
- When creating expenses/payments, use NEGATIVE amounts (e.g., -100 for $100 expense)
- When creating income/receipts, use POSITIVE amounts (e.g., 500 for $500 income)
- Only manual transactions can be deleted; bank-imported transactions can only be excluded
- Always confirm before deleting transactions
- Use getCategories to list available categories when user asks or before assigning categories
</agent-specific-rules>`,
  tools: {
    getTransactions: getTransactionsTool,
    getCategories: getCategoriesTool,
    createTransaction: createTransactionTool,
    updateTransaction: updateTransactionTool,
    deleteTransaction: deleteTransactionTool,
  },
  maxTurns: 5,
});
