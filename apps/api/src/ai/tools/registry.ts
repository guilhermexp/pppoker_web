import { toJSONSchema } from "zod";
import { createBankAccountTool } from "./create-bank-account";
import { createCustomerTool } from "./create-customer";
import { createTrackerEntryTool } from "./create-tracker-entry";
import { createTransactionTool } from "./create-transaction";
import { deleteTransactionTool } from "./delete-transaction";
import { getAccountBalancesTool } from "./get-account-balances";
import { getBalanceSheetTool } from "./get-balance-sheet";
import { getBankAccountsTool } from "./get-bank-accounts";
import { getBurnRateTool } from "./get-burn-rate";
import { getBusinessHealthScoreTool } from "./get-business-health-score";
import { getCashFlowTool } from "./get-cash-flow";
import { getCashFlowStressTestTool } from "./get-cash-flow-stress-test";
import { getCategoriesTool } from "./get-categories";
import { getCustomersTool } from "./get-customers";
import { getDocumentsTool } from "./get-documents";
import { getExpensesTool } from "./get-expenses";
import { getForecastTool } from "./get-forecast";
import { getGrowthRateTool } from "./get-growth-rate";
import { getInboxTool } from "./get-inbox";
import { getInvoicePaymentAnalysisTool } from "./get-invoice-payment-analysis";
import { getInvoicesTool } from "./get-invoices";
import { getProfitAnalysisTool } from "./get-profit-analysis";
import { getRevenueSummaryTool } from "./get-revenue-summary";
import { getRunwayTool } from "./get-runway";
import { getSpendingTool } from "./get-spending";
import { getTaxSummaryTool } from "./get-tax-summary";
import { getTimerStatusTool } from "./get-timer-status";
import { getTrackerEntriesTool } from "./get-tracker-entries";
import { getTrackerProjectsTool } from "./get-tracker-projects";
import { getTransactionsTool } from "./get-transactions";
import { stopTimerTool } from "./stop-timer";
import { updateInvoiceTool } from "./update-invoice";
import { updateTransactionTool } from "./update-transaction";
import { webSearchTool } from "./web-search";

export const legacyToolRegistry = {
  createBankAccount: createBankAccountTool,
  createCustomer: createCustomerTool,
  createTrackerEntry: createTrackerEntryTool,
  createTransaction: createTransactionTool,
  deleteTransaction: deleteTransactionTool,
  getAccountBalances: getAccountBalancesTool,
  getBalanceSheet: getBalanceSheetTool,
  getBankAccounts: getBankAccountsTool,
  getBurnRate: getBurnRateTool,
  getBusinessHealthScore: getBusinessHealthScoreTool,
  getCashFlowStressTest: getCashFlowStressTestTool,
  getCashFlow: getCashFlowTool,
  getCategories: getCategoriesTool,
  getCustomers: getCustomersTool,
  getDocuments: getDocumentsTool,
  getExpenses: getExpensesTool,
  getForecast: getForecastTool,
  getGrowthRate: getGrowthRateTool,
  getInbox: getInboxTool,
  getInvoicePaymentAnalysis: getInvoicePaymentAnalysisTool,
  getInvoices: getInvoicesTool,
  getProfitAnalysis: getProfitAnalysisTool,
  getRevenueSummary: getRevenueSummaryTool,
  getRunway: getRunwayTool,
  getSpending: getSpendingTool,
  getTaxSummary: getTaxSummaryTool,
  getTimerStatus: getTimerStatusTool,
  getTrackerEntries: getTrackerEntriesTool,
  getTrackerProjects: getTrackerProjectsTool,
  getTransactions: getTransactionsTool,
  stopTimer: stopTimerTool,
  updateInvoice: updateInvoiceTool,
  updateTransaction: updateTransactionTool,
  webSearch: webSearchTool,
} as const;

export type LegacyToolName = keyof typeof legacyToolRegistry;
export type LegacyToolDefinition = (typeof legacyToolRegistry)[LegacyToolName];

export function listLegacyTools() {
  return Object.entries(legacyToolRegistry).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: toJSONSchema(tool.inputSchema as any),
  }));
}

export function getLegacyTool(name: string) {
  return (
    legacyToolRegistry as Record<string, LegacyToolDefinition | undefined>
  )[name];
}
