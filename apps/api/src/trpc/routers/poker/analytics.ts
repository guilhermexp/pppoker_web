import { createAdminClient } from "@api/services/supabase";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const pokerAnalyticsRouter = createTRPCRouter({
  /**
   * Get overview stats for the poker dashboard
   */
  getOverview: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get player counts
      const { count: totalPlayers } = await supabase
        .from("poker_players")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("type", "player");

      const { count: totalAgents } = await supabase
        .from("poker_players")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("type", "agent");

      const { count: activePlayers } = await supabase
        .from("poker_players")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "active");

      // Get pending settlements count
      const { count: pendingSettlements } = await supabase
        .from("poker_settlements")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "pending");

      // Get total chip balance
      const { data: balanceData } = await supabase
        .from("poker_players")
        .select("chip_balance")
        .eq("team_id", teamId);

      const totalChipBalance =
        balanceData?.reduce((sum, p) => sum + (p.chip_balance || 0), 0) ?? 0;

      return {
        totalPlayers: totalPlayers ?? 0,
        totalAgents: totalAgents ?? 0,
        activePlayers: activePlayers ?? 0,
        pendingSettlements: pendingSettlements ?? 0,
        totalChipBalance,
      };
    }),

  /**
   * Get gross rake for period (widget)
   */
  getGrossRake: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_session_players")
        .select("rake, poker_sessions!inner(team_id)")
        .eq("poker_sessions.team_id", teamId);

      if (input?.from) {
        query = query.gte("poker_sessions.started_at", input.from);
      }
      if (input?.to) {
        query = query.lte("poker_sessions.started_at", input.to);
      }

      const { data, error } = await query;

      if (error) {
        // If the table doesn't exist yet, return 0
        return { grossRake: 0, currency: "USD" };
      }

      const grossRake = data?.reduce((sum, p) => sum + (p.rake || 0), 0) ?? 0;

      return {
        grossRake,
        currency: "USD", // TODO: Get from team settings
      };
    }),

  /**
   * Get bank result for period (chips in - chips out)
   */
  getBankResult: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_chip_transactions")
        .select("chips_sent, chips_redeemed, credit_sent, credit_redeemed")
        .eq("team_id", teamId);

      if (input?.from) {
        query = query.gte("occurred_at", input.from);
      }
      if (input?.to) {
        query = query.lte("occurred_at", input.to);
      }

      const { data, error } = await query;

      if (error) {
        return { bankResult: 0, currency: "USD" };
      }

      // Bank result = chips sent - chips redeemed + credits sent - credits redeemed
      const bankResult =
        data?.reduce(
          (sum, t) =>
            sum +
            (t.chips_sent || 0) -
            (t.chips_redeemed || 0) +
            (t.credit_sent || 0) -
            (t.credit_redeemed || 0),
          0
        ) ?? 0;

      return {
        bankResult,
        currency: "USD",
      };
    }),

  /**
   * Get weekly netting summary
   */
  getWeeklyNetting: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get settlements from the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("poker_settlements")
        .select("gross_amount, net_amount, paid_amount")
        .eq("team_id", teamId)
        .gte("period_start", oneWeekAgo.toISOString());

      if (error) {
        return {
          grossTotal: 0,
          netTotal: 0,
          paidTotal: 0,
          currency: "USD",
        };
      }

      const grossTotal =
        data?.reduce((sum, s) => sum + (s.gross_amount || 0), 0) ?? 0;
      const netTotal =
        data?.reduce((sum, s) => sum + (s.net_amount || 0), 0) ?? 0;
      const paidTotal =
        data?.reduce((sum, s) => sum + (s.paid_amount || 0), 0) ?? 0;

      return {
        grossTotal,
        netTotal,
        paidTotal,
        currency: "USD",
      };
    }),

  /**
   * Get top players by rake contribution
   */
  getTopPlayers: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(20).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const limit = input?.limit ?? 5;

      // Get players with their total rake contribution
      const { data, error } = await supabase
        .from("poker_players")
        .select("id, nickname, pppoker_id, chip_balance")
        .eq("team_id", teamId)
        .eq("type", "player")
        .order("chip_balance", { ascending: false })
        .limit(limit);

      if (error) {
        return { players: [] };
      }

      return {
        players:
          data?.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            ppPokerId: p.pppoker_id,
            chipBalance: p.chip_balance ?? 0,
          })) ?? [],
      };
    }),

  /**
   * Get revenue breakdown by game type
   */
  getRevenueByGameType: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get session counts by type
      const { data, error } = await supabase
        .from("poker_sessions")
        .select("session_type")
        .eq("team_id", teamId);

      if (error || !data) {
        return {
          breakdown: [
            { type: "ring", count: 0, percentage: 0 },
            { type: "mtt", count: 0, percentage: 0 },
            { type: "sit_n_go", count: 0, percentage: 0 },
            { type: "spin", count: 0, percentage: 0 },
          ],
        };
      }

      const counts: Record<string, number> = {};
      for (const session of data) {
        const type = session.session_type || "ring";
        counts[type] = (counts[type] || 0) + 1;
      }

      const total = data.length || 1;
      const breakdown = Object.entries(counts).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / total) * 100),
      }));

      return { breakdown };
    }),

  /**
   * Get debtors (players with negative balance)
   */
  getDebtors: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const limit = input?.limit ?? 10;

      const { data, error } = await supabase
        .from("poker_players")
        .select("id, nickname, pppoker_id, chip_balance")
        .eq("team_id", teamId)
        .lt("chip_balance", 0)
        .order("chip_balance", { ascending: true })
        .limit(limit);

      if (error) {
        return { debtors: [], totalDebt: 0 };
      }

      const totalDebt =
        data?.reduce((sum, p) => sum + Math.abs(p.chip_balance || 0), 0) ?? 0;

      return {
        debtors:
          data?.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            ppPokerId: p.pppoker_id,
            debt: Math.abs(p.chip_balance ?? 0),
          })) ?? [],
        totalDebt,
      };
    }),
});
