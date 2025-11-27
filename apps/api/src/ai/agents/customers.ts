import { openai } from "@ai-sdk/openai";
import {
  COMMON_AGENT_RULES,
  createAgent,
  formatContextForLLM,
} from "@api/ai/agents/config/shared";
import { createCustomerTool } from "@api/ai/tools/create-customer";
import { getCustomersTool } from "@api/ai/tools/get-customers";

export const customersAgent = createAgent({
  name: "customers",
  model: openai("gpt-4o-mini"),
  temperature: 0.3,
  instructions: (
    ctx,
  ) => `You are a customer management specialist for ${ctx.companyName}. Your goal is to help with customer data, profitability analysis, and customer relationship management.

<background-data>
${formatContextForLLM(ctx)}
</background-data>

${COMMON_AGENT_RULES}

<agent-specific-rules>
- Lead with key information
- When creating customers, always require name and email
- Suggest adding address and VAT number for invoicing purposes
</agent-specific-rules>`,
  tools: {
    getCustomers: getCustomersTool,
    createCustomer: createCustomerTool,
  },
  maxTurns: 5,
});
