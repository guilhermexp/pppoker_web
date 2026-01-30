import {
  getAccountBalancesSchema,
  getBillableHoursSchema,
  getCashFlowSchema,
  getCategoryExpensesSchema,
  getCustomerLifetimeValueSchema,
  getGrowthRateSchema,
  getInboxStatsSchema,
  getMonthlySpendingSchema,
  getOutstandingInvoicesSchema,
  getOverdueInvoicesAlertSchema,
  getProfitMarginSchema,
  getRecurringExpensesSchema,
  getRevenueSummarySchema,
  getRunwaySchema,
  getTaxSummarySchema,
  getTrackedTimeSchema,
  getVaultActivitySchema,
  updateWidgetConfigSchema,
  updateWidgetPreferencesSchema,
} from "@api/schemas/widgets";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { widgetPreferencesCache } from "@midpoker/cache/widget-preferences-cache";
import {
  getBillableHours,
  getInboxStats,
  getOutstandingInvoices,
  getOverdueInvoicesAlert,
  getRecentDocuments,
  getRecurringExpenses,
  getSpending,
  getSpendingForPeriod,
  getTaxSummary,
  getTrackedTime,
} from "@midpoker/db/queries";

export const widgetsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getRunway: protectedProcedure
    .input(getRunwaySchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get total balance from bank accounts
      const { data: accounts } = await supabase
        .from("bank_accounts")
        .select("balance, currency")
        .eq("team_id", teamId)
        .eq("enabled", true);

      // Get monthly expenses (negative transactions)
      const { data: expenses } = await supabase
        .from("transactions")
        .select("amount, currency")
        .eq("team_id", teamId)
        .lt("amount", 0)
        .gte("date", input.from)
        .lte("date", input.to);

      const totalBalance = (accounts ?? []).reduce(
        (sum, acc) => sum + (Number(acc.balance) || 0),
        0,
      );
      const totalExpenses = Math.abs(
        (expenses ?? []).reduce(
          (sum, exp) => sum + (Number(exp.amount) || 0),
          0,
        ),
      );

      // Calculate monthly burn rate
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);
      const monthsDiff = Math.max(
        1,
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      const monthlyBurnRate = totalExpenses / monthsDiff;

      // Calculate runway in months
      const runwayMonths =
        monthlyBurnRate > 0 ? Math.round(totalBalance / monthlyBurnRate) : 999;

      // Return runwayMonths directly as result (component expects a number)
      return {
        result: runwayMonths,
        toolCall: {
          toolName: "getBurnRateAnalysis",
          toolParams: {
            from: input.from,
            to: input.to,
            currency: input.currency,
          },
        },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getTopCustomer: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: invoices } = await supabase
      .from("invoices")
      .select("customer_id, customer_name, amount, currency")
      .eq("team_id", teamId)
      .eq("status", "paid")
      .not("customer_id", "is", null);

    if (!invoices?.length) {
      return { result: null };
    }

    // Calculate revenue per customer
    const customerRevenue: Record<
      string,
      { name: string; total: number; currency: string }
    > = {};
    for (const inv of invoices) {
      const id = inv.customer_id;
      if (!customerRevenue[id]) {
        customerRevenue[id] = {
          name: inv.customer_name || "Unknown",
          total: 0,
          currency: inv.currency || "USD",
        };
      }
      customerRevenue[id].total += Number(inv.amount) || 0;
    }

    // Find top customer
    let topCustomer = null;
    let maxRevenue = 0;
    for (const [id, data] of Object.entries(customerRevenue)) {
      if (data.total > maxRevenue) {
        maxRevenue = data.total;
        topCustomer = {
          id,
          name: data.name,
          totalRevenue: data.total,
          currency: data.currency,
        };
      }
    }

    return { result: topCustomer };
  }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getRevenueSummary: protectedProcedure
    .input(getRevenueSummarySchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get paid invoices for revenue
      const { data: invoices } = await supabase
        .from("invoices")
        .select("amount, currency, issue_date")
        .eq("team_id", teamId)
        .eq("status", "paid")
        .gte("issue_date", input.from)
        .lte("issue_date", input.to);

      const totalRevenue = (invoices ?? []).reduce(
        (sum, inv) => sum + (Number(inv.amount) || 0),
        0,
      );

      return {
        result: {
          totalRevenue,
          currency: invoices?.[0]?.currency ?? input.currency ?? "USD",
          revenueType: input.revenueType,
          monthCount: invoices?.length ?? 0,
        },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getGrowthRate: protectedProcedure
    .input(getGrowthRateSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get current period data
      const { data: currentData } = await supabase
        .from(input.type === "revenue" ? "invoices" : "transactions")
        .select("amount, currency")
        .eq("team_id", teamId)
        .gte(input.type === "revenue" ? "issue_date" : "date", input.from)
        .lte(input.type === "revenue" ? "issue_date" : "date", input.to);

      // Calculate previous period
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);
      const periodLength = toDate.getTime() - fromDate.getTime();
      const prevFrom = new Date(fromDate.getTime() - periodLength)
        .toISOString()
        .split("T")[0];
      const prevTo = new Date(fromDate.getTime() - 1)
        .toISOString()
        .split("T")[0];

      const { data: prevData } = await supabase
        .from(input.type === "revenue" ? "invoices" : "transactions")
        .select("amount, currency")
        .eq("team_id", teamId)
        .gte(input.type === "revenue" ? "issue_date" : "date", prevFrom)
        .lte(input.type === "revenue" ? "issue_date" : "date", prevTo);

      const currentTotal = (currentData ?? []).reduce(
        (sum, item) => sum + Math.abs(Number(item.amount) || 0),
        0,
      );
      const prevTotal = (prevData ?? []).reduce(
        (sum, item) => sum + Math.abs(Number(item.amount) || 0),
        0,
      );
      const growthRate =
        prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

      return {
        result: {
          currentTotal,
          prevTotal,
          growthRate: Math.round(growthRate * 100) / 100,
          quarterlyGrowthRate: growthRate,
          currency: input.currency ?? currentData?.[0]?.currency ?? "USD",
          type: input.type,
          revenueType: input.revenueType,
          period: input.period,
          trend: growthRate >= 0 ? "up" : "down",
          meta: { from: input.from, to: input.to },
        },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getProfitMargin: protectedProcedure
    .input(getProfitMarginSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get revenue (paid invoices)
      const { data: invoices } = await supabase
        .from("invoices")
        .select("amount, currency, issue_date")
        .eq("team_id", teamId)
        .eq("status", "paid")
        .gte("issue_date", input.from)
        .lte("issue_date", input.to);

      // Get expenses (negative transactions)
      const { data: expenses } = await supabase
        .from("transactions")
        .select("amount, currency, date")
        .eq("team_id", teamId)
        .lt("amount", 0)
        .gte("date", input.from)
        .lte("date", input.to);

      const totalRevenue = (invoices ?? []).reduce(
        (sum, inv) => sum + (Number(inv.amount) || 0),
        0,
      );
      const totalExpenses = Math.abs(
        (expenses ?? []).reduce(
          (sum, exp) => sum + (Number(exp.amount) || 0),
          0,
        ),
      );
      const totalProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Calculate monthly data
      const monthlyData: Record<string, { revenue: number; expenses: number }> =
        {};
      for (const inv of invoices ?? []) {
        const month = inv.issue_date?.substring(0, 7) ?? "unknown";
        if (!monthlyData[month])
          monthlyData[month] = { revenue: 0, expenses: 0 };
        monthlyData[month].revenue += Number(inv.amount) || 0;
      }
      for (const exp of expenses ?? []) {
        const month = exp.date?.substring(0, 7) ?? "unknown";
        if (!monthlyData[month])
          monthlyData[month] = { revenue: 0, expenses: 0 };
        monthlyData[month].expenses += Math.abs(Number(exp.amount)) || 0;
      }

      const monthlyResults = Object.entries(monthlyData).map(
        ([date, data]) => ({
          date,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
          margin:
            data.revenue > 0
              ? ((data.revenue - data.expenses) / data.revenue) * 100
              : 0,
        }),
      );

      const monthCount = monthlyResults.length;
      const averageMargin =
        monthCount > 0
          ? monthlyResults.reduce((sum, m) => sum + m.margin, 0) / monthCount
          : 0;

      return {
        result: {
          totalRevenue,
          totalProfit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          averageMargin: Math.round(averageMargin * 100) / 100,
          currency: input.currency ?? invoices?.[0]?.currency ?? "USD",
          revenueType: input.revenueType,
          trend: profitMargin >= 0 ? "up" : "down",
          monthCount,
          monthlyData: monthlyResults,
          meta: { from: input.from, to: input.to },
        },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getCashFlow: protectedProcedure
    .input(getCashFlowSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get all transactions in the period
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, currency, date")
        .eq("team_id", teamId)
        .gte("date", input.from)
        .lte("date", input.to);

      // Calculate inflows and outflows
      let inflow = 0;
      let outflow = 0;
      for (const tx of transactions ?? []) {
        const amount = Number(tx.amount) || 0;
        if (amount > 0) {
          inflow += amount;
        } else {
          outflow += Math.abs(amount);
        }
      }

      const netCashFlow = inflow - outflow;

      return {
        result: {
          netCashFlow,
          inflow,
          outflow,
          currency: input.currency ?? transactions?.[0]?.currency ?? "USD",
          period: input.period,
          meta: { from: input.from, to: input.to },
        },
      };
    }),

  getOutstandingInvoices: protectedProcedure
    .input(getOutstandingInvoicesSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const invoicesData = await getOutstandingInvoices(db, {
        teamId: teamId!,
        currency: input.currency,
        status: input.status,
      });

      return {
        result: {
          count: invoicesData.summary.count,
          totalAmount: invoicesData.summary.totalAmount,
          currency: invoicesData.summary.currency,
          status: invoicesData.summary.status,
          meta: invoicesData.meta,
        },
      };
    }),

  getInboxStats: protectedProcedure
    .input(getInboxStatsSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const inboxStats = await getInboxStats(db, {
        teamId: teamId!,
        from: input.from,
        to: input.to,
        currency: input.currency,
      });

      return {
        result: inboxStats.result,
      };
    }),

  getTrackedTime: protectedProcedure
    .input(getTrackedTimeSchema)
    .query(async ({ ctx: { db, teamId, session }, input }) => {
      const trackedTime = await getTrackedTime(db, {
        teamId: teamId!,
        assignedId: input.assignedId ?? session.user.id,
        from: input.from,
        to: input.to,
      });

      return {
        result: trackedTime,
      };
    }),

  getVaultActivity: protectedProcedure
    .input(getVaultActivitySchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const vaultActivity = await getRecentDocuments(db, {
        teamId: teamId!,
        limit: input.limit,
      });

      return {
        result: vaultActivity,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getAccountBalances: protectedProcedure
    .input(getAccountBalancesSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: accounts } = await supabase
        .from("bank_accounts")
        .select("id, name, balance, currency, type, enabled")
        .eq("team_id", teamId)
        .eq("enabled", true);

      const totalBalance = (accounts ?? []).reduce(
        (sum, acc) => sum + (Number(acc.balance) || 0),
        0,
      );

      return {
        result: {
          accounts: (accounts ?? []).map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            balance: Number(acc.balance) || 0,
            currency: acc.currency,
            type: acc.type,
          })),
          totalBalance,
          currency: input.currency ?? accounts?.[0]?.currency ?? "USD",
        },
      };
    }),

  getMonthlySpending: protectedProcedure
    .input(getMonthlySpendingSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const spending = await getSpendingForPeriod(db, {
        teamId: teamId!,
        from: input.from,
        to: input.to,
        currency: input.currency,
      });

      return {
        result: spending,
        toolCall: {
          toolName: "getSpendingAnalysis",
          toolParams: {
            from: input.from,
            to: input.to,
            currency: input.currency,
          },
        },
      };
    }),

  getRecurringExpenses: protectedProcedure
    .input(getRecurringExpensesSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const recurringExpenses = await getRecurringExpenses(db, {
        teamId: teamId!,
        from: input.from,
        to: input.to,
        currency: input.currency,
      });

      return {
        result: recurringExpenses,
      };
    }),

  getTaxSummary: protectedProcedure
    .input(getTaxSummarySchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      // Get both paid and collected taxes
      const [paidTaxes, collectedTaxes] = await Promise.all([
        getTaxSummary(db, {
          teamId: teamId!,
          type: "paid",
          from: input.from,
          to: input.to,
          currency: input.currency,
        }),
        getTaxSummary(db, {
          teamId: teamId!,
          type: "collected",
          from: input.from,
          to: input.to,
          currency: input.currency,
        }),
      ]);

      return {
        result: {
          paid: paidTaxes.summary,
          collected: collectedTaxes.summary,
          currency: paidTaxes.summary.currency || input.currency || "USD",
        },
      };
    }),

  getCategoryExpenses: protectedProcedure
    .input(getCategoryExpensesSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const categoryExpenses = await getSpending(db, {
        teamId: teamId!,
        from: input.from,
        to: input.to,
        currency: input.currency,
      });

      // Get top N categories by amount
      const topCategories = categoryExpenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, input.limit || 5);

      const totalAmount = topCategories.reduce(
        (sum, cat) => sum + cat.amount,
        0,
      );

      return {
        result: {
          categories: topCategories,
          totalAmount,
          currency: topCategories[0]?.currency || input.currency || "USD",
          totalCategories: categoryExpenses.length,
        },
      };
    }),

  getOverdueInvoicesAlert: protectedProcedure
    .input(getOverdueInvoicesAlertSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const overdueData = await getOverdueInvoicesAlert(db, {
        teamId: teamId!,
        currency: input?.currency,
      });

      return {
        result: overdueData.summary,
      };
    }),

  getBillableHours: protectedProcedure
    .input(getBillableHoursSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      return getBillableHours(db, {
        teamId: teamId!,
        date: input.date,
        view: input.view,
        weekStartsOnMonday: input.weekStartsOnMonday,
      });
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getCustomerLifetimeValue: protectedProcedure
    .input(getCustomerLifetimeValueSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get all paid invoices with customer info
      const { data: invoices } = await supabase
        .from("invoices")
        .select("customer_id, amount, currency")
        .eq("team_id", teamId)
        .eq("status", "paid")
        .not("customer_id", "is", null);

      // Get customer count
      const { count: customerCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId);

      const totalRevenue = (invoices ?? []).reduce(
        (sum, inv) => sum + (Number(inv.amount) || 0),
        0,
      );
      const uniqueCustomers = new Set(
        (invoices ?? []).map((inv) => inv.customer_id),
      ).size;
      const averageLTV =
        uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

      return {
        result: {
          averageLTV,
          totalRevenue,
          customerCount: customerCount ?? 0,
          uniquePayingCustomers: uniqueCustomers,
          currency: input.currency ?? invoices?.[0]?.currency ?? "USD",
        },
        toolCall: {
          toolName: "getCustomerLifetimeValue",
          toolParams: {
            currency: input.currency,
          },
        },
      };
    }),

  getWidgetPreferences: protectedProcedure.query(
    async ({ ctx: { teamId, session } }) => {
      const preferences = await widgetPreferencesCache.getWidgetPreferences(
        teamId!,
        session.user.id,
      );
      return preferences;
    },
  ),

  updateWidgetPreferences: protectedProcedure
    .input(updateWidgetPreferencesSchema)
    .mutation(async ({ ctx: { teamId, session }, input }) => {
      const preferences = await widgetPreferencesCache.updatePrimaryWidgets(
        teamId!,
        session.user.id,
        input.primaryWidgets,
      );
      return preferences;
    }),

  updateWidgetConfig: protectedProcedure
    .input(updateWidgetConfigSchema)
    .mutation(async ({ ctx: { teamId, session }, input }) => {
      const preferences = await widgetPreferencesCache.updateWidgetConfig(
        teamId!,
        session.user.id,
        input.widgetType,
        input.config,
      );
      return preferences;
    }),
});
