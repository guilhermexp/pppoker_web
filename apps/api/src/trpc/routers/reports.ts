import {
  getBurnRateSchema,
  getExpensesSchema,
  getProfitSchema,
  getRevenueForecastSchema,
  getRevenueSchema,
  getRunwaySchema,
  getSpendingSchema,
  getTaxSummarySchema,
} from "@api/schemas/reports";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";

export const reportsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  revenue: protectedProcedure
    .input(getRevenueSchema)
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

      // Group by month
      const monthlyData: Record<string, { value: number; currency: string }> =
        {};
      for (const inv of invoices ?? []) {
        const month = inv.issue_date?.substring(0, 7) ?? "unknown";
        if (!monthlyData[month]) {
          monthlyData[month] = {
            value: 0,
            currency: inv.currency || input.currency || "USD",
          };
        }
        monthlyData[month].value += Number(inv.amount) || 0;
      }

      const result = Object.entries(monthlyData).map(([date, data]) => ({
        date,
        value: String(data.value),
        currency: data.currency,
      }));

      return {
        result,
        meta: { from: input.from, to: input.to, currency: input.currency },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  profit: protectedProcedure
    .input(getProfitSchema)
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

      // Calculate monthly profit
      const monthlyData: Record<
        string,
        { revenue: number; expenses: number; currency: string }
      > = {};

      for (const inv of invoices ?? []) {
        const month = inv.issue_date?.substring(0, 7) ?? "unknown";
        if (!monthlyData[month]) {
          monthlyData[month] = {
            revenue: 0,
            expenses: 0,
            currency: inv.currency || input.currency || "USD",
          };
        }
        monthlyData[month].revenue += Number(inv.amount) || 0;
      }

      for (const exp of expenses ?? []) {
        const month = exp.date?.substring(0, 7) ?? "unknown";
        if (!monthlyData[month]) {
          monthlyData[month] = {
            revenue: 0,
            expenses: 0,
            currency: exp.currency || input.currency || "USD",
          };
        }
        monthlyData[month].expenses += Math.abs(Number(exp.amount)) || 0;
      }

      // Format result to match expected structure: { date, current: { value } }
      const result = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          current: {
            value: data.revenue - data.expenses,
          },
          previous: {
            value: 0,
          },
          currency: data.currency,
        }));

      const totalProfit = result.reduce(
        (sum, item) => sum + item.current.value,
        0,
      );
      const currency = input.currency ?? result[0]?.currency ?? "USD";

      return {
        result,
        summary: {
          totalProfit,
          currency,
        },
        meta: { from: input.from, to: input.to, currency },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  burnRate: protectedProcedure
    .input(getBurnRateSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: expenses } = await supabase
        .from("transactions")
        .select("amount, currency, date")
        .eq("team_id", teamId)
        .lt("amount", 0)
        .gte("date", input.from)
        .lte("date", input.to);

      const totalExpenses = Math.abs(
        (expenses ?? []).reduce(
          (sum, exp) => sum + (Number(exp.amount) || 0),
          0,
        ),
      );
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);
      const monthsDiff = Math.max(
        1,
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      const monthlyBurnRate = totalExpenses / monthsDiff;

      return {
        result: {
          monthlyBurnRate,
          totalExpenses,
          currency: input.currency ?? expenses?.[0]?.currency ?? "USD",
        },
        meta: { from: input.from, to: input.to },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  runway: protectedProcedure
    .input(getRunwaySchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get total balance
      const { data: accounts } = await supabase
        .from("bank_accounts")
        .select("balance, currency")
        .eq("team_id", teamId)
        .eq("enabled", true);

      // Get monthly expenses
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
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);
      const monthsDiff = Math.max(
        1,
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      const monthlyBurnRate = totalExpenses / monthsDiff;
      const runwayMonths =
        monthlyBurnRate > 0 ? Math.round(totalBalance / monthlyBurnRate) : 999;

      // Return runwayMonths directly as result (component expects a number, not an object)
      return {
        result: runwayMonths,
        meta: { from: input.from, to: input.to },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  expense: protectedProcedure
    .input(getExpensesSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: expenses } = await supabase
        .from("transactions")
        .select("amount, currency, date, category_slug")
        .eq("team_id", teamId)
        .lt("amount", 0)
        .gte("date", input.from)
        .lte("date", input.to);

      // Group by month
      const monthlyData: Record<string, { value: number; currency: string }> =
        {};
      for (const exp of expenses ?? []) {
        const month = exp.date?.substring(0, 7) ?? "unknown";
        if (!monthlyData[month]) {
          monthlyData[month] = {
            value: 0,
            currency: exp.currency || input.currency || "USD",
          };
        }
        monthlyData[month].value += Math.abs(Number(exp.amount)) || 0;
      }

      const result = Object.entries(monthlyData).map(([date, data]) => ({
        date,
        value: String(data.value),
        currency: data.currency,
      }));

      return {
        result,
        meta: { from: input.from, to: input.to, currency: input.currency },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  spending: protectedProcedure
    .input(getSpendingSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: expenses } = await supabase
        .from("transactions")
        .select("amount, currency, category_slug")
        .eq("team_id", teamId)
        .lt("amount", 0)
        .gte("date", input.from)
        .lte("date", input.to);

      // Group by category
      const categoryData: Record<string, { amount: number; currency: string }> =
        {};
      for (const exp of expenses ?? []) {
        const category = exp.category_slug || "uncategorized";
        if (!categoryData[category]) {
          categoryData[category] = {
            amount: 0,
            currency: exp.currency || input.currency || "USD",
          };
        }
        categoryData[category].amount += Math.abs(Number(exp.amount)) || 0;
      }

      const result = Object.entries(categoryData).map(([slug, data]) => ({
        slug,
        amount: data.amount,
        currency: data.currency,
      }));

      return result;
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  taxSummary: protectedProcedure
    .input(getTaxSummarySchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get transactions with tax data
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, tax_amount, currency")
        .eq("team_id", teamId)
        .gte("date", input.from)
        .lte("date", input.to);

      const totalTax = (transactions ?? []).reduce(
        (sum, tx) => sum + (Number(tx.tax_amount) || 0),
        0,
      );
      const totalAmount = (transactions ?? []).reduce(
        (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
        0,
      );

      return {
        summary: {
          totalTax,
          totalAmount,
          currency: input.currency ?? transactions?.[0]?.currency ?? "USD",
        },
        meta: { from: input.from, to: input.to },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  revenueForecast: protectedProcedure
    .input(getRevenueForecastSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Get historical revenue
      const { data: invoices } = await supabase
        .from("invoices")
        .select("amount, currency, issue_date")
        .eq("team_id", teamId)
        .eq("status", "paid")
        .gte("issue_date", input.from)
        .lte("issue_date", input.to);

      // Calculate monthly average
      const monthlyData: Record<string, number> = {};
      for (const inv of invoices ?? []) {
        const month = inv.issue_date?.substring(0, 7) ?? "unknown";
        monthlyData[month] =
          (monthlyData[month] || 0) + (Number(inv.amount) || 0);
      }

      const months = Object.keys(monthlyData).length;
      const totalRevenue = Object.values(monthlyData).reduce(
        (sum, val) => sum + val,
        0,
      );
      const avgMonthlyRevenue = months > 0 ? totalRevenue / months : 0;

      // Generate forecast
      const forecastMonths = input.forecastMonths ?? 6;
      const lastDate = new Date(input.to);
      const forecast = [];

      for (let i = 1; i <= forecastMonths; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setMonth(forecastDate.getMonth() + i);
        forecast.push({
          date: forecastDate.toISOString().substring(0, 7),
          value: String(avgMonthlyRevenue),
          currency: input.currency ?? invoices?.[0]?.currency ?? "USD",
          isForecast: true,
        });
      }

      const historical = Object.entries(monthlyData).map(([date, value]) => ({
        date,
        value: String(value),
        currency: input.currency ?? invoices?.[0]?.currency ?? "USD",
        isForecast: false,
      }));

      return {
        result: [...historical, ...forecast],
        meta: {
          from: input.from,
          to: input.to,
          forecastMonths,
          avgMonthlyRevenue,
          currency: input.currency,
        },
      };
    }),
});
