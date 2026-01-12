import { createAdminClient } from "@api/services/supabase";
import {
  formatDateForDb,
  getCurrentWeekBoundaries,
} from "@api/utils/week-utils";
import { z } from "@hono/zod-openapi";
import {
  POKER_WIDGET_TYPES,
  type PokerWidgetType,
  pokerWidgetPreferencesCache,
} from "@midpoker/cache/poker-widget-preferences-cache";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

const pokerWidgetTypeSchema = z.enum(
  POKER_WIDGET_TYPES as unknown as [string, ...string[]],
) as z.ZodType<PokerWidgetType>;

const updatePokerWidgetPreferencesSchema = z.object({
  primaryWidgets: z.array(pokerWidgetTypeSchema),
});

const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  viewMode: z.enum(["current_week", "historical"]).optional(),
  // When true, includes draft (non-committed) data. Default is false (only committed).
  // Dashboard in current_week mode should pass true to see draft data.
  includeDraft: z.boolean().optional(),
});

/**
 * Helper to get valid import_ids based on committed status
 * Returns null if no filter needed (includeDraft = true)
 * Returns array of import_ids if filtering by committed = true
 */
async function getCommittedImportIds(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  teamId: string,
  includeDraft: boolean,
): Promise<string[] | null> {
  // If including draft, no filter needed
  if (includeDraft) {
    return null;
  }

  // Get only committed imports
  const { data: imports } = await supabase
    .from("poker_imports")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "completed")
    .eq("committed", true);

  return imports?.map((i) => i.id) ?? [];
}

export const pokerAnalyticsRouter = createTRPCRouter({
  /**
   * Get overview stats for the poker dashboard
   */
  getOverview: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Build date filters
      const dateFrom = input?.from;
      const dateTo = input?.to;

      // Get active players from poker_player_summary (players with actual activity)
      // NOT from poker_players (which includes ALL club members)
      let playerSummaryQuery = supabase
        .from("poker_player_summary")
        .select("player_id")
        .eq("team_id", teamId)
        .limit(50000);

      if (dateFrom) {
        playerSummaryQuery = playerSummaryQuery.gte("period_start", dateFrom);
      }
      if (dateTo) {
        playerSummaryQuery = playerSummaryQuery.lte("period_end", dateTo);
      }

      const { data: playerSummaryData } = await playerSummaryQuery;
      const activePlayerIds = new Set(
        playerSummaryData?.map((p) => p.player_id) ?? [],
      );
      const totalPlayers = activePlayerIds.size;

      // Agents count (agents always come from Geral sheet, not from "Detalhes do usuário")
      const { count: totalAgents } = await supabase
        .from("poker_players")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("type", "agent")
        .eq("status", "active");

      // Get pending settlements count
      const { count: pendingSettlements } = await supabase
        .from("poker_settlements")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "pending");

      // Get total chip balance (for active players only)
      let totalChipBalance = 0;
      if (activePlayerIds.size > 0) {
        const { data: balanceData } = await supabase
          .from("poker_players")
          .select("chip_balance")
          .eq("team_id", teamId)
          .in("id", Array.from(activePlayerIds))
          .limit(50000);

        totalChipBalance =
          balanceData?.reduce((sum, p) => sum + (p.chip_balance || 0), 0) ?? 0;
      }

      // Total club members (from "Detalhes do usuário" - for reference)
      const { count: totalClubMembers } = await supabase
        .from("poker_players")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("type", "player");

      return {
        totalPlayers: totalPlayers, // Players with activity
        totalAgents: totalAgents ?? 0,
        activePlayers: totalPlayers, // Same as totalPlayers now
        totalClubMembers: totalClubMembers ?? 0, // All registered members
        pendingSettlements: pendingSettlements ?? 0,
        totalChipBalance,
      };
    }),

  /**
   * Get comprehensive dashboard stats
   */
  getDashboardStats: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Build date filters based on viewMode
      let dateFrom = input?.from;
      let dateTo = input?.to;

      // If viewMode is current_week, calculate current week boundaries
      if (input?.viewMode === "current_week") {
        const { weekStart, weekEnd } = getCurrentWeekBoundaries();
        dateFrom = formatDateForDb(weekStart);
        dateTo = formatDateForDb(weekEnd);
      }

      // Get committed import IDs for filtering
      // includeDraft defaults to false (only show committed data)
      // Dashboard in current_week mode passes true to see draft data
      const includeDraft = input?.includeDraft ?? false;
      const committedImportIds = await getCommittedImportIds(
        supabase,
        teamId!,
        includeDraft,
      );

      // If no committed imports and not including draft, return zeros
      if (committedImportIds !== null && committedImportIds.length === 0) {
        return {
          viewMode: input?.viewMode ?? "historical",
          periodFrom: dateFrom ?? null,
          periodTo: dateTo ?? null,
          totalSessions: 0,
          totalPlayers: 0,
          activeAgents: 0,
          rakeTotal: 0,
          rakePpst: 0,
          rakePpsr: 0,
          totalRakeback: 0,
          rakebackBreakdown: { ppst: 0, ppsr: 0 },
          generalResult: 0,
          bankResult: 0,
          playerResults: 0,
          bankBreakdown: {
            chipsSent: 0,
            chipsRedeemed: 0,
            creditsSent: 0,
            creditsRedeemed: 0,
          },
          sessionsByType: [],
          gameTypeBreakdown: [],
          playersByRegion: [],
          playersBreakdown: { withAgent: 0, withoutAgent: 0 },
          agentsBreakdown: { regular: 0, super: 0 },
          resultsBreakdown: { winners: 0, losers: 0 },
        };
      }

      // ============================================
      // Get player counts from poker_player_summary (players with actual activity)
      // NOT from poker_players (which includes ALL club members from "Detalhes do usuário")
      // ============================================
      let playerSummaryQuery = supabase
        .from("poker_player_summary")
        .select("player_id")
        .eq("team_id", teamId)
        .limit(50000);

      // Filter by committed imports if needed
      if (committedImportIds !== null) {
        playerSummaryQuery = playerSummaryQuery.in(
          "import_id",
          committedImportIds,
        );
      }

      if (dateFrom) {
        playerSummaryQuery = playerSummaryQuery.gte("period_start", dateFrom);
      }
      if (dateTo) {
        playerSummaryQuery = playerSummaryQuery.lte("period_end", dateTo);
      }

      const { data: playerSummaryData } = await playerSummaryQuery;

      // Unique players with activity in the period
      const activePlayerIds = new Set(
        playerSummaryData?.map((p) => p.player_id) ?? [],
      );
      const totalPlayers = activePlayerIds.size;

      // Get players with/without agent (only for active players)
      let playersWithAgent = 0;
      if (activePlayerIds.size > 0) {
        const { data: playersAgentData } = await supabase
          .from("poker_players")
          .select("id, agent_id")
          .eq("team_id", teamId)
          .eq("type", "player")
          .in("id", Array.from(activePlayerIds))
          .limit(50000);

        playersWithAgent =
          playersAgentData?.filter((p) => p.agent_id !== null).length ?? 0;
      }

      const playersWithoutAgent = totalPlayers - playersWithAgent;

      // Get agents counts using count queries
      const { count: activeAgents } = await supabase
        .from("poker_players")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("type", "agent")
        .eq("status", "active");

      const { count: superAgents } = await supabase
        .from("poker_players")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("type", "agent")
        .eq("status", "active")
        .is("super_agent_id", null);

      const regularAgents = (activeAgents ?? 0) - (superAgents ?? 0);

      // Get total sessions count with date filter
      let sessionsQuery = supabase
        .from("poker_sessions")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId);

      // Filter by committed imports if needed
      if (committedImportIds !== null) {
        sessionsQuery = sessionsQuery.in("import_id", committedImportIds);
      }

      if (dateFrom) {
        sessionsQuery = sessionsQuery.gte("started_at", dateFrom);
      }
      if (dateTo) {
        sessionsQuery = sessionsQuery.lte("started_at", dateTo);
      }

      const { count: totalSessions } = await sessionsQuery;

      // Get rake breakdown and player results from poker_player_summary
      let rakeQuery = supabase
        .from("poker_player_summary")
        .select("rake_total, rake_ppst, rake_ppsr, winnings_total")
        .eq("team_id", teamId)
        .limit(50000); // Avoid 1000 row limit

      // Filter by committed imports if needed
      if (committedImportIds !== null) {
        rakeQuery = rakeQuery.in("import_id", committedImportIds);
      }

      if (dateFrom) {
        rakeQuery = rakeQuery.gte("period_start", dateFrom);
      }
      if (dateTo) {
        rakeQuery = rakeQuery.lte("period_end", dateTo);
      }

      const { data: rakeData } = await rakeQuery;

      const rakeTotal =
        rakeData?.reduce((sum, r) => sum + Number(r.rake_total || 0), 0) ?? 0;
      const rakePpst =
        rakeData?.reduce((sum, r) => sum + Number(r.rake_ppst || 0), 0) ?? 0;
      const rakePpsr =
        rakeData?.reduce((sum, r) => sum + Number(r.rake_ppsr || 0), 0) ?? 0;
      // Player results (winnings/losses) - column J from Geral tab
      const playerResults =
        rakeData?.reduce((sum, r) => sum + Number(r.winnings_total || 0), 0) ??
        0;

      // Winners vs Losers breakdown
      const winners =
        rakeData?.filter((r) => Number(r.winnings_total || 0) > 0).length ?? 0;
      const losers =
        rakeData?.filter((r) => Number(r.winnings_total || 0) < 0).length ?? 0;

      // Get bank result breakdown
      let bankQuery = supabase
        .from("poker_chip_transactions")
        .select("chips_sent, chips_redeemed, credit_sent, credit_redeemed")
        .eq("team_id", teamId)
        .limit(50000); // Avoid 1000 row limit

      if (dateFrom) {
        bankQuery = bankQuery.gte("occurred_at", dateFrom);
      }
      if (dateTo) {
        bankQuery = bankQuery.lte("occurred_at", dateTo);
      }

      const { data: bankData } = await bankQuery;

      const chipsSent =
        bankData?.reduce((sum, t) => sum + Number(t.chips_sent || 0), 0) ?? 0;
      const chipsRedeemed =
        bankData?.reduce((sum, t) => sum + Number(t.chips_redeemed || 0), 0) ??
        0;
      const creditsSent =
        bankData?.reduce((sum, t) => sum + Number(t.credit_sent || 0), 0) ?? 0;
      const creditsRedeemed =
        bankData?.reduce((sum, t) => sum + Number(t.credit_redeemed || 0), 0) ??
        0;

      const bankResult =
        chipsSent - chipsRedeemed + creditsSent - creditsRedeemed;

      // Get sessions by type distribution
      let sessionsTypeQuery = supabase
        .from("poker_sessions")
        .select("session_type, game_variant")
        .eq("team_id", teamId)
        .limit(50000); // Avoid 1000 row limit

      // Filter by committed imports if needed
      if (committedImportIds !== null) {
        sessionsTypeQuery = sessionsTypeQuery.in("import_id", committedImportIds);
      }

      if (dateFrom) {
        sessionsTypeQuery = sessionsTypeQuery.gte("started_at", dateFrom);
      }
      if (dateTo) {
        sessionsTypeQuery = sessionsTypeQuery.lte("started_at", dateTo);
      }

      const { data: sessionsData } = await sessionsTypeQuery;

      const sessionCounts: Record<string, number> = {};
      const gameVariantCounts: Record<string, number> = {};
      for (const session of sessionsData ?? []) {
        const type = session.session_type || "cash_game";
        sessionCounts[type] = (sessionCounts[type] || 0) + 1;

        // Count game variants
        const variant = session.game_variant || "nlh";
        gameVariantCounts[variant] = (gameVariantCounts[variant] || 0) + 1;
      }

      const totalSessionCount = sessionsData?.length ?? 0;
      const sessionsByType = Object.entries(sessionCounts)
        .map(([type, count]) => ({
          type,
          count,
          percentage:
            totalSessionCount > 0
              ? Math.round((count / totalSessionCount) * 100)
              : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Game types distribution
      const gameTypeBreakdown = Object.entries(gameVariantCounts)
        .map(([variant, count]) => ({
          variant,
          count,
          percentage:
            totalSessionCount > 0
              ? Math.round((count / totalSessionCount) * 100)
              : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Get players by region (only for active players - those in summary)
      // Note: includes both players and agents since agents also play
      let playersRegionData: { country: string | null }[] = [];
      if (activePlayerIds.size > 0) {
        const { data } = await supabase
          .from("poker_players")
          .select("country")
          .eq("team_id", teamId)
          .in("id", Array.from(activePlayerIds))
          .limit(50000);
        playersRegionData = data ?? [];
      }

      const regionCounts: Record<string, number> = {};
      for (const player of playersRegionData) {
        const region = player.country || "Desconhecido";
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }

      const totalPlayersForRegion = playersRegionData.length;
      const playersByRegion = Object.entries(regionCounts)
        .map(([region, count]) => ({
          region,
          count,
          percentage:
            totalPlayersForRegion > 0
              ? Math.round((count / totalPlayersForRegion) * 100)
              : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate total rakeback based on each agent's rake * their rakeback percentage
      // Step 1: Get all agents with their rakeback percent
      const { data: agentsData } = await supabase
        .from("poker_players")
        .select("id, rakeback_percent")
        .eq("team_id", teamId)
        .eq("type", "agent")
        .limit(10000);

      // Step 2: Get all players and their agent assignments
      const { data: playersAgentMapping } = await supabase
        .from("poker_players")
        .select("id, agent_id")
        .eq("team_id", teamId)
        .not("agent_id", "is", null)
        .limit(50000);

      // Build map of player -> agent
      const playerToAgentMap = new Map<string, string>();
      for (const player of playersAgentMapping ?? []) {
        if (player.agent_id) {
          playerToAgentMap.set(player.id, player.agent_id);
        }
      }

      // Step 3: Get rake data per player from summary with date filter (including PPST/PPSR breakdown)
      let playerRakeQuery = supabase
        .from("poker_player_summary")
        .select("player_id, rake_total, rake_ppst, rake_ppsr")
        .eq("team_id", teamId)
        .limit(50000);

      // Filter by committed imports if needed
      if (committedImportIds !== null) {
        playerRakeQuery = playerRakeQuery.in("import_id", committedImportIds);
      }

      if (dateFrom) {
        playerRakeQuery = playerRakeQuery.gte("period_start", dateFrom);
      }
      if (dateTo) {
        playerRakeQuery = playerRakeQuery.lte("period_end", dateTo);
      }

      const { data: playerRakeData } = await playerRakeQuery;

      // Step 4: Aggregate rake per agent (total, ppst, ppsr)
      const agentRakeMap = new Map<
        string,
        { total: number; ppst: number; ppsr: number }
      >();
      for (const playerRake of playerRakeData ?? []) {
        const agentId = playerToAgentMap.get(playerRake.player_id);
        if (agentId) {
          const current = agentRakeMap.get(agentId) ?? {
            total: 0,
            ppst: 0,
            ppsr: 0,
          };
          current.total += Number(playerRake.rake_total || 0);
          current.ppst += Number(playerRake.rake_ppst || 0);
          current.ppsr += Number(playerRake.rake_ppsr || 0);
          agentRakeMap.set(agentId, current);
        }
      }

      // Step 5: Calculate rakeback by type = sum of (agent_rake_type * agent_rakeback_percent / 100)
      let totalRakeback = 0;
      let rakebackPpst = 0;
      let rakebackPpsr = 0;
      for (const agent of agentsData ?? []) {
        const agentRake = agentRakeMap.get(agent.id) ?? {
          total: 0,
          ppst: 0,
          ppsr: 0,
        };
        const rakebackPercent = agent.rakeback_percent ?? 0;
        totalRakeback += agentRake.total * (rakebackPercent / 100);
        rakebackPpst += agentRake.ppst * (rakebackPercent / 100);
        rakebackPpsr += agentRake.ppsr * (rakebackPercent / 100);
      }

      // General Result = Player Winnings (column J: Ganhos + Eventos) - Fee Total
      // playerResults already contains the sum of winnings_total
      const generalResult = playerResults - rakeTotal;

      return {
        // Period info
        viewMode: input?.viewMode ?? "historical",
        periodFrom: dateFrom ?? null,
        periodTo: dateTo ?? null,

        // Volume
        totalSessions: totalSessions ?? 0,
        totalPlayers: totalPlayers ?? 0,
        activeAgents: activeAgents ?? 0,

        // Rake breakdown
        rakeTotal,
        rakePpst,
        rakePpsr,

        // Financial
        totalRakeback,
        rakebackBreakdown: {
          ppst: rakebackPpst,
          ppsr: rakebackPpsr,
        },
        generalResult,
        bankResult,
        playerResults,

        // Bank breakdown details
        bankBreakdown: {
          chipsSent,
          chipsRedeemed,
          creditsSent,
          creditsRedeemed,
        },

        // Distribution
        sessionsByType,
        gameTypeBreakdown,
        playersByRegion,

        // Detailed breakdowns for widgets
        playersBreakdown: {
          withAgent: playersWithAgent ?? 0,
          withoutAgent: playersWithoutAgent,
        },
        agentsBreakdown: {
          regular: regularAgents,
          super: superAgents ?? 0,
        },
        resultsBreakdown: {
          winners,
          losers,
        },
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
        currency: "USD",
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
        return {
          bankResult: 0,
          currency: "USD",
          breakdown: {
            chipsSent: 0,
            chipsRedeemed: 0,
            creditsSent: 0,
            creditsRedeemed: 0,
          },
        };
      }

      // Calculate individual totals
      const chipsSent =
        data?.reduce((sum, t) => sum + Number(t.chips_sent || 0), 0) ?? 0;
      const chipsRedeemed =
        data?.reduce((sum, t) => sum + Number(t.chips_redeemed || 0), 0) ?? 0;
      const creditsSent =
        data?.reduce((sum, t) => sum + Number(t.credit_sent || 0), 0) ?? 0;
      const creditsRedeemed =
        data?.reduce((sum, t) => sum + Number(t.credit_redeemed || 0), 0) ?? 0;

      // Bank result = chips sent - chips redeemed + credits sent - credits redeemed
      const bankResult =
        chipsSent - chipsRedeemed + creditsSent - creditsRedeemed;

      return {
        bankResult,
        currency: "USD",
        breakdown: {
          chipsSent,
          chipsRedeemed,
          creditsSent,
          creditsRedeemed,
        },
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
        .optional(),
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
            { type: "cash_game", count: 0, percentage: 0 },
            { type: "mtt", count: 0, percentage: 0 },
            { type: "sit_n_go", count: 0, percentage: 0 },
            { type: "spin", count: 0, percentage: 0 },
          ],
        };
      }

      const counts: Record<string, number> = {};
      for (const session of data) {
        const type = session.session_type || "cash_game";
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
        .optional(),
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

  /**
   * Get sessions breakdown by type (for pie chart)
   */
  getSessionsByType: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_sessions")
        .select("session_type")
        .eq("team_id", teamId);

      if (error || !data) {
        return {
          breakdown: [],
          total: 0,
        };
      }

      const counts: Record<string, number> = {};
      for (const session of data) {
        const type = session.session_type || "cash_game";
        counts[type] = (counts[type] || 0) + 1;
      }

      const total = data.length;
      const breakdown = Object.entries(counts)
        .map(([type, count]) => ({
          type,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return { breakdown, total };
    }),

  /**
   * Get rake trend over the last N weeks
   */
  getRakeTrend: protectedProcedure
    .input(
      z
        .object({
          weeks: z.number().min(1).max(12).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const weeks = input?.weeks ?? 4;

      const now = new Date();
      const startDate = new Date();
      startDate.setDate(now.getDate() - weeks * 7);

      const { data, error } = await supabase
        .from("poker_session_players")
        .select("rake, poker_sessions!inner(team_id, started_at)")
        .eq("poker_sessions.team_id", teamId)
        .gte("poker_sessions.started_at", startDate.toISOString());

      if (error || !data) {
        return { trend: [] };
      }

      // Group by week
      const weeklyRake: Record<string, number> = {};
      for (const record of data) {
        const session = record.poker_sessions as any;
        const date = new Date(session.started_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        weeklyRake[weekKey] = (weeklyRake[weekKey] || 0) + (record.rake || 0);
      }

      // Convert to array sorted by date
      const trend = Object.entries(weeklyRake)
        .map(([week, rake]) => ({
          week,
          rake,
        }))
        .sort((a, b) => a.week.localeCompare(b.week));

      return { trend };
    }),

  /**
   * Get poker widget preferences
   */
  getWidgetPreferences: protectedProcedure.query(
    async ({ ctx: { teamId, session } }) => {
      const preferences =
        await pokerWidgetPreferencesCache.getPokerWidgetPreferences(
          teamId!,
          session.user.id,
        );
      return preferences;
    },
  ),

  /**
   * Update poker widget preferences
   */
  updateWidgetPreferences: protectedProcedure
    .input(updatePokerWidgetPreferencesSchema)
    .mutation(async ({ ctx: { teamId, session }, input }) => {
      const preferences =
        await pokerWidgetPreferencesCache.updatePrimaryWidgets(
          teamId!,
          session.user.id,
          input.primaryWidgets,
        );
      return preferences;
    }),

  /**
   * Get players overview stats for the players page header
   * Returns: total players, players without rake, total rake, total winnings/losses
   */
  getPlayersOverview: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get committed import IDs
      const includeDraft = input?.includeDraft ?? false;
      const committedImportIds = await getCommittedImportIds(
        supabase,
        teamId!,
        includeDraft,
      );

      // If no committed imports and not including draft, return zeros
      if (committedImportIds !== null && committedImportIds.length === 0) {
        return {
          totalPlayers: 0,
          playersWithRake: 0,
          playersWithoutRake: 0,
          totalRake: 0,
          totalWinnings: 0,
          totalLosses: 0,
          netResult: 0,
        };
      }

      // Get all players (type = 'player')
      let playersQuery = supabase
        .from("poker_players")
        .select("id", { count: "exact" })
        .eq("team_id", teamId)
        .eq("type", "player");

      if (committedImportIds !== null) {
        playersQuery = playersQuery.in("import_id", committedImportIds);
      }

      const { count: totalPlayersCount } = await playersQuery;

      // Get player summary data for rake and winnings
      let summaryQuery = supabase
        .from("poker_player_summary")
        .select("player_id, rake_total, winnings_total")
        .eq("team_id", teamId)
        .limit(50000);

      if (committedImportIds !== null) {
        summaryQuery = summaryQuery.in("import_id", committedImportIds);
      }

      // Apply date filters if provided
      if (input?.from) {
        summaryQuery = summaryQuery.gte("period_start", input.from);
      }
      if (input?.to) {
        summaryQuery = summaryQuery.lte("period_end", input.to);
      }

      const { data: summaryData } = await summaryQuery;

      // Aggregate stats per player
      const playerStats = new Map<string, { rake: number; winnings: number }>();
      for (const row of summaryData ?? []) {
        const current = playerStats.get(row.player_id) ?? { rake: 0, winnings: 0 };
        current.rake += Number(row.rake_total || 0);
        current.winnings += Number(row.winnings_total || 0);
        playerStats.set(row.player_id, current);
      }

      // Calculate totals
      let totalRake = 0;
      let totalWinnings = 0;
      let totalLosses = 0;
      let playersWithRake = 0;

      for (const [, stats] of playerStats) {
        totalRake += stats.rake;
        if (stats.winnings > 0) {
          totalWinnings += stats.winnings;
        } else {
          totalLosses += Math.abs(stats.winnings);
        }
        if (stats.rake > 0) {
          playersWithRake++;
        }
      }

      const totalPlayers = totalPlayersCount ?? 0;
      const playersWithoutRake = totalPlayers - playersWithRake;
      const netResult = totalWinnings - totalLosses;

      return {
        totalPlayers,
        playersWithRake,
        playersWithoutRake,
        totalRake,
        totalWinnings,
        totalLosses,
        netResult,
      };
    }),
});
