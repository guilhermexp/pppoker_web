import { createAdminClient } from "@api/services/supabase";
import {
  formatDateForDb,
  getCurrentWeekBoundaries,
} from "@api/utils/week-utils";
import { TRPCError } from "@trpc/server";
import {
  closeWeekSchema,
  getPokerWeekPeriodByIdSchema,
  getPokerWeekPeriodsSchema,
  previewCloseWeekSchema,
} from "../../../schemas/poker/week-periods";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const pokerWeekPeriodsRouter = createTRPCRouter({
  /**
   * Get the current week period (creates if doesn't exist)
   */
  getCurrent: protectedProcedure.query(async ({ ctx: { teamId, session } }) => {
    const supabase = await createAdminClient();

    // Fetch user's week_starts_on_monday preference
    const { data: userSettings } = await supabase
      .from("users")
      .select("week_starts_on_monday")
      .eq("id", session.user.id)
      .single();

    const weekStartsOnMonday = userSettings?.week_starts_on_monday ?? true;

    // Get current week boundaries based on user preference
    const { weekStart, weekEnd } = getCurrentWeekBoundaries(weekStartsOnMonday);
    const weekStartStr = formatDateForDb(weekStart);
    const weekEndStr = formatDateForDb(weekEnd);

    // Try to find existing week period
    let { data: weekPeriod, error } = await supabase
      .from("poker_week_periods")
      .select(
        `
        *,
        closed_by:users!poker_week_periods_closed_by_id_fkey(id, full_name)
      `,
      )
      .eq("team_id", teamId)
      .eq("week_start", weekStartStr)
      .maybeSingle();

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    // Create if doesn't exist
    if (!weekPeriod) {
      const { data: newPeriod, error: createError } = await supabase
        .from("poker_week_periods")
        .insert({
          team_id: teamId,
          week_start: weekStartStr,
          week_end: weekEndStr,
          status: "open",
        })
        .select(
          `
          *,
          closed_by:users!poker_week_periods_closed_by_id_fkey(id, full_name)
        `,
        )
        .single();

      if (createError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: createError.message,
        });
      }

      weekPeriod = newPeriod;
    }

    return transformWeekPeriod(weekPeriod);
  }),

  /**
   * Get all week periods with pagination
   */
  getAll: protectedProcedure
    .input(getPokerWeekPeriodsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { cursor, pageSize = 20, status } = input ?? {};

      let query = supabase
        .from("poker_week_periods")
        .select(
          `
          *,
          closed_by:users!poker_week_periods_closed_by_id_fkey(id, full_name)
        `,
          { count: "exact" },
        )
        .eq("team_id", teamId)
        .order("week_start", { ascending: false });

      // Apply status filter
      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      // Apply pagination
      const currentCursor = cursor ? Number.parseInt(cursor, 10) : 0;
      const offset = currentCursor * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const hasNextPage = offset + pageSize < (count ?? 0);
      const nextCursor = hasNextPage ? String(currentCursor + 1) : null;

      return {
        meta: {
          cursor: nextCursor,
          hasPreviousPage: currentCursor > 0,
          hasNextPage,
          totalCount: count ?? 0,
        },
        data: (data ?? []).map(transformWeekPeriod),
      };
    }),

  /**
   * Get all open week periods (for warning display)
   */
  getOpenPeriods: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("poker_week_periods")
      .select(
        `
        *,
        closed_by:users!poker_week_periods_closed_by_id_fkey(id, full_name)
      `,
      )
      .eq("team_id", teamId)
      .eq("status", "open")
      .order("week_start", { ascending: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    return (data ?? []).map(transformWeekPeriod);
  }),

  /**
   * Get a single week period by ID
   */
  getById: protectedProcedure
    .input(getPokerWeekPeriodByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_week_periods")
        .select(
          `
          *,
          closed_by:users!poker_week_periods_closed_by_id_fkey(id, full_name)
        `,
        )
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Week period not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return transformWeekPeriod(data);
    }),

  /**
   * Get all data needed for the close week modal (rich UI)
   */
  getCloseWeekData: protectedProcedure
    .input(previewCloseWeekSchema.optional())
    .query(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      // Get week period (current week if not specified)
      let weekPeriod: any;
      let periodStart: string;
      let periodEnd: string;

      if (input?.weekPeriodId) {
        const { data, error } = await supabase
          .from("poker_week_periods")
          .select("*")
          .eq("id", input.weekPeriodId)
          .eq("team_id", teamId)
          .single();

        if (error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Week period not found",
          });
        }
        weekPeriod = data;
        periodStart = data.week_start;
        periodEnd = data.week_end;
      } else {
        // Fetch user's week_starts_on_monday preference
        const { data: userSettings } = await supabase
          .from("users")
          .select("week_starts_on_monday")
          .eq("id", session.user.id)
          .single();

        const weekStartsOnMonday = userSettings?.week_starts_on_monday ?? true;

        // Get or create current week
        const { weekStart, weekEnd } =
          getCurrentWeekBoundaries(weekStartsOnMonday);
        periodStart = formatDateForDb(weekStart);
        periodEnd = formatDateForDb(weekEnd);

        const { data } = await supabase
          .from("poker_week_periods")
          .select("*")
          .eq("team_id", teamId)
          .eq("week_start", periodStart)
          .maybeSingle();

        weekPeriod = data || {
          id: null,
          week_start: periodStart,
          week_end: periodEnd,
          status: "open",
          total_sessions: 0,
          total_players: 0,
          total_rake: 0,
          total_settlements: 0,
          settlements_gross_amount: 0,
          settlements_net_amount: 0,
        };
      }

      // Get imports for this week period (to filter data by import_id)
      // Use overlap logic: import overlaps with week if:
      //   import.period_start <= week.period_end AND import.period_end >= week.period_start
      const { data: imports } = await supabase
        .from("poker_imports")
        .select("id")
        .eq("team_id", teamId)
        .eq("status", "completed")
        .lte("period_start", periodEnd)
        .gte("period_end", periodStart);

      const importIds = imports?.map((i) => i.id) ?? [];

      console.log("[getCloseWeekData] Period:", { periodStart, periodEnd });
      console.log(
        "[getCloseWeekData] Found imports:",
        importIds.length,
        importIds,
      );

      // 1. Get sessions with players
      let sessions: any[] = [];
      if (importIds.length > 0) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("poker_sessions")
          .select(
            `
            id,
            external_id,
            table_name,
            session_type,
            game_variant,
            started_at,
            ended_at,
            blinds,
            total_rake,
            total_buy_in,
            total_cash_out,
            player_count,
            hands_played,
            guaranteed_prize,
            poker_session_players (
              id,
              player_id,
              nickname,
              memo_name,
              ranking,
              buy_in_chips,
              buy_in_ticket,
              cash_out,
              winnings,
              rake,
              hands,
              prize,
              winnings_opponents,
              winnings_jackpot,
              winnings_ev_split,
              club_winnings_general,
              club_winnings_jackpot_fee,
              club_winnings_jackpot_prize,
              club_winnings_ev_split
            )
          `,
          )
          .eq("team_id", teamId)
          .in("import_id", importIds)
          .order("started_at", { ascending: false });

        if (sessionsError) {
          console.error(
            "[getCloseWeekData] Error fetching sessions:",
            sessionsError,
          );
        }
        console.log(
          "[getCloseWeekData] Sessions found:",
          sessionsData?.length ?? 0,
        );

        sessions = (sessionsData ?? []).map((s) => ({
          externalId: s.external_id,
          tableName: s.table_name,
          sessionType: s.session_type,
          gameVariant: s.game_variant,
          startedAt: s.started_at,
          endedAt: s.ended_at,
          blinds: s.blinds,
          totalRake: Number(s.total_rake ?? 0),
          totalBuyIn: Number(s.total_buy_in ?? 0),
          totalCashOut: Number(s.total_cash_out ?? 0),
          playerCount: s.player_count ?? 0,
          handsPlayed: s.hands_played ?? 0,
          guaranteedPrize: Number(s.guaranteed_prize ?? 0),
          players: (s.poker_session_players ?? []).map((p: any) => ({
            playerId: p.player_id,
            ppPokerId: p.player_id, // Not available directly, using player_id
            nickname: p.nickname,
            memoName: p.memo_name,
            ranking: p.ranking,
            buyIn: Number(p.buy_in_chips ?? 0),
            buyInChips: Number(p.buy_in_chips ?? 0),
            buyInTicket: Number(p.buy_in_ticket ?? 0),
            cashOut: Number(p.cash_out ?? 0),
            winnings: Number(p.winnings ?? 0),
            rake: Number(p.rake ?? 0),
            hands: p.hands ?? 0,
            prize: Number(p.prize ?? 0),
            winningsGeneral: Number(p.winnings ?? 0),
            winningsOpponents: Number(p.winnings_opponents ?? 0),
            winningsJackpot: Number(p.winnings_jackpot ?? 0),
            winningsEvSplit: Number(p.winnings_ev_split ?? 0),
            clubWinningsGeneral: Number(p.club_winnings_general ?? 0),
            clubWinningsFee: Number(p.rake ?? 0),
            clubWinningsJackpotFee: Number(p.club_winnings_jackpot_fee ?? 0),
            clubWinningsJackpotPrize: Number(
              p.club_winnings_jackpot_prize ?? 0,
            ),
            clubWinningsEvSplit: Number(p.club_winnings_ev_split ?? 0),
          })),
        }));
      }

      // 2. Get player summaries (aba Geral) with player info
      let summaries: any[] = [];
      if (importIds.length > 0) {
        // First get summaries with basic player info
        const { data: summariesData, error: summariesError } = await supabase
          .from("poker_player_summary")
          .select(
            `
            *,
            player:poker_players!poker_player_summary_player_id_fkey (
              id,
              pppoker_id,
              nickname,
              memo_name,
              country,
              agent_id,
              super_agent_id
            )
          `,
          )
          .eq("team_id", teamId)
          .in("import_id", importIds);

        if (summariesError) {
          console.error(
            "[getCloseWeekData] Error fetching player summaries:",
            summariesError,
          );
        }
        console.log(
          "[getCloseWeekData] Summaries found:",
          summariesData?.length ?? 0,
        );

        // Get agent/super_agent info separately if needed
        const playerIds = (summariesData ?? [])
          .map((s) => s.player?.agent_id)
          .filter(Boolean);
        const superAgentIds = (summariesData ?? [])
          .map((s) => s.player?.super_agent_id)
          .filter(Boolean);

        const allAgentIds = [...new Set([...playerIds, ...superAgentIds])];

        let agentMap: Record<string, { pppoker_id: string; nickname: string }> =
          {};
        if (allAgentIds.length > 0) {
          const { data: agentsData } = await supabase
            .from("poker_players")
            .select("id, pppoker_id, nickname")
            .in("id", allAgentIds);

          agentMap = (agentsData ?? []).reduce(
            (acc, a) => {
              acc[a.id] = { pppoker_id: a.pppoker_id, nickname: a.nickname };
              return acc;
            },
            {} as Record<string, { pppoker_id: string; nickname: string }>,
          );
        }

        summaries = (summariesData ?? []).map((s) => {
          const agent = s.player?.agent_id ? agentMap[s.player.agent_id] : null;
          const superAgent = s.player?.super_agent_id
            ? agentMap[s.player.super_agent_id]
            : null;

          return {
            ppPokerId: s.player?.pppoker_id ?? "",
            nickname: s.player?.nickname ?? "Unknown",
            memoName: s.player?.memo_name,
            country: s.player?.country,
            agentPpPokerId: agent?.pppoker_id ?? null,
            agentNickname: agent?.nickname ?? null,
            superAgentPpPokerId: superAgent?.pppoker_id ?? null,
            superAgentNickname: superAgent?.nickname ?? null,
            playerWinningsTotal: Number(s.winnings_total ?? 0),
            generalTotal: Number(s.winnings_general ?? 0),
            ringGamesTotal: Number(s.winnings_ring ?? 0),
            mttTotal: Number(s.winnings_mtt_sitgo ?? 0),
            spinUpTotal: Number(s.winnings_spinup ?? 0),
            caribbeanTotal: Number(s.winnings_caribbean ?? 0),
            fee: Number(s.rake_total ?? 0),
            clubEarningsGeneral: Number(s.club_earnings_general ?? 0),
            rakeTotal: Number(s.rake_total ?? 0),
            rakePpst: Number(s.rake_ppst ?? 0),
            rakePpsr: Number(s.rake_ppsr ?? 0),
          };
        });
      }

      // 3. Get rakeback data (aba Retorno de Taxa)
      let rakebacks: any[] = [];
      if (importIds.length > 0) {
        const { data: rakebacksData, error: rakebacksError } = await supabase
          .from("poker_agent_rakeback")
          .select("*")
          .eq("team_id", teamId)
          .in("import_id", importIds);

        if (rakebacksError) {
          console.error(
            "[getCloseWeekData] Error fetching rakebacks:",
            rakebacksError,
          );
        }
        console.log(
          "[getCloseWeekData] Rakebacks found:",
          rakebacksData?.length ?? 0,
        );

        rakebacks = (rakebacksData ?? []).map((r) => ({
          agentPpPokerId: r.agent_pppoker_id,
          agentNickname: r.agent_nickname,
          superAgentPpPokerId: r.super_agent_pppoker_id,
          country: r.country,
          memoName: r.memo_name,
          averageRakebackPercent: Number(r.average_rakeback_percent ?? 0),
          totalRt: Number(r.total_rt ?? 0),
        }));
      }

      // 3.1 Get rake by agent AND super agent from poker_player_detailed (has agent info from spreadsheet)
      // This is more accurate than using poker_player_summary which depends on poker_players.agent_id
      const rakeByAgentFromSpreadsheet: Record<
        string,
        { rake: number; playerCount: number }
      > = {};
      if (importIds.length > 0) {
        const { data: detailedData, error: detailedError } = await supabase
          .from("poker_player_detailed")
          .select("agent_pppoker_id, super_agent_pppoker_id, fee_total")
          .eq("team_id", teamId)
          .in("import_id", importIds);

        if (detailedError) {
          console.error(
            "[getCloseWeekData] Error fetching detailed for rake by agent:",
            detailedError,
          );
        }

        // Aggregate rake by agent AND super agent
        for (const row of detailedData ?? []) {
          const agentId = row.agent_pppoker_id;
          const superAgentId = row.super_agent_pppoker_id;
          const feeTotal = Number(row.fee_total ?? 0);

          // Aggregate by agent
          if (agentId) {
            if (!rakeByAgentFromSpreadsheet[agentId]) {
              rakeByAgentFromSpreadsheet[agentId] = { rake: 0, playerCount: 0 };
            }
            rakeByAgentFromSpreadsheet[agentId].rake += feeTotal;
            rakeByAgentFromSpreadsheet[agentId].playerCount += 1;
          }

          // Also aggregate by super agent (they earn from all players under their agents)
          if (
            superAgentId &&
            superAgentId !== "(none)" &&
            superAgentId !== "none"
          ) {
            if (!rakeByAgentFromSpreadsheet[superAgentId]) {
              rakeByAgentFromSpreadsheet[superAgentId] = {
                rake: 0,
                playerCount: 0,
              };
            }
            rakeByAgentFromSpreadsheet[superAgentId].rake += feeTotal;
            rakeByAgentFromSpreadsheet[superAgentId].playerCount += 1;
          }
        }

        console.log(
          "[getCloseWeekData] Rake by agent/super_agent from spreadsheet:",
          Object.keys(rakeByAgentFromSpreadsheet).length,
          "entries",
        );
      }

      // 3.5 Get agents from app (poker_players) for comparison
      // Include agents AND super agents from rakebacks, summaries, AND detailed spreadsheet data
      const agentIdsFromRakebacks = rakebacks
        .map((r) => r.agentPpPokerId)
        .filter(Boolean);
      const superAgentIdsFromRakebacks = rakebacks
        .map((r) => r.superAgentPpPokerId)
        .filter(
          (id): id is string => Boolean(id) && id !== "(none)" && id !== "none",
        );
      const agentIdsFromSummaries = summaries
        .map((s) => s.agentPpPokerId)
        .filter(Boolean);
      const superAgentIdsFromSummaries = summaries
        .map((s) => s.superAgentPpPokerId)
        .filter(
          (id): id is string => Boolean(id) && id !== "(none)" && id !== "none",
        );
      const agentIdsFromDetailed = Object.keys(rakeByAgentFromSpreadsheet);
      const uniqueAgentPppokerIds = [
        ...new Set([
          ...agentIdsFromRakebacks,
          ...superAgentIdsFromRakebacks,
          ...agentIdsFromSummaries,
          ...superAgentIdsFromSummaries,
          ...agentIdsFromDetailed,
        ]),
      ];

      let agentsFromApp: Array<{
        id: string;
        ppPokerId: string;
        nickname: string;
        memoName: string | null;
        type: string;
        rakebackPercent: number;
        spreadsheetPercent: number | null;
        rakeGenerated: number;
        playerCount: number;
      }> = [];

      if (uniqueAgentPppokerIds.length > 0) {
        const { data: agentsData, error: agentsError } = await supabase
          .from("poker_players")
          .select("id, pppoker_id, nickname, memo_name, type, rakeback_percent")
          .eq("team_id", teamId)
          .in("pppoker_id", uniqueAgentPppokerIds)
          .in("type", ["agent", "super_agent"]);

        if (agentsError) {
          console.error(
            "[getCloseWeekData] Error fetching agents from app:",
            agentsError,
          );
        }
        console.log(
          "[getCloseWeekData] Agents from app found:",
          agentsData?.length ?? 0,
          "from unique IDs:",
          uniqueAgentPppokerIds.length,
          "(agents from rakebacks:",
          agentIdsFromRakebacks.length,
          ", super_agents from rakebacks:",
          superAgentIdsFromRakebacks.length,
          ", agents from summaries:",
          agentIdsFromSummaries.length,
          ", super_agents from summaries:",
          superAgentIdsFromSummaries.length,
          ")",
        );

        // Map agents with their spreadsheet percent and rake for comparison
        agentsFromApp = (agentsData ?? []).map((a) => {
          // Find the matching rakeback from spreadsheet to show comparison
          const spreadsheetRakeback = rakebacks.find(
            (r) => r.agentPpPokerId === a.pppoker_id,
          );
          // Get rake generated from detailed spreadsheet data
          const rakeData = rakeByAgentFromSpreadsheet[a.pppoker_id];
          return {
            id: a.id,
            ppPokerId: a.pppoker_id,
            nickname: a.nickname,
            memoName: a.memo_name,
            type: a.type,
            rakebackPercent: Number(a.rakeback_percent ?? 0),
            spreadsheetPercent:
              spreadsheetRakeback?.averageRakebackPercent ?? null,
            rakeGenerated: rakeData?.rake ?? 0,
            playerCount: rakeData?.playerCount ?? 0,
          };
        });
      }

      // 4. Get settlements preview (same logic as previewClose)
      const { data: players } = await supabase
        .from("poker_players")
        .select(
          `
          id,
          nickname,
          memo_name,
          type,
          chip_balance,
          rakeback_percent,
          agent_id,
          agent:poker_players!poker_players_agent_id_fkey(id, nickname, memo_name)
        `,
        )
        .eq("team_id", teamId)
        .eq("status", "active")
        .neq("chip_balance", 0)
        .order("chip_balance", { ascending: false });

      const settlements = (players ?? []).map((player) => {
        const grossAmount = player.chip_balance ?? 0;
        const rakebackPercent = player.rakeback_percent ?? 0;
        const rakebackAmount =
          grossAmount > 0 ? (grossAmount * rakebackPercent) / 100 : 0;
        const netAmount = grossAmount - rakebackAmount;

        return {
          playerId: player.id,
          playerNickname: player.nickname,
          playerMemoName: player.memo_name,
          playerType: player.type,
          agentId: player.agent_id,
          agentNickname: player.agent?.nickname ?? null,
          chipBalance: grossAmount,
          rakebackPercent,
          grossAmount,
          rakebackAmount,
          netAmount,
        };
      });

      // 5. Calculate stats
      const uniqueAgents = new Set(
        summaries.map((s) => s.agentPpPokerId).filter(Boolean),
      );
      const uniqueSuperAgents = new Set(
        summaries.map((s) => s.superAgentPpPokerId).filter(Boolean),
      );
      const playersWithAgent = summaries.filter((s) => s.agentPpPokerId).length;

      const cashGames = sessions.filter(
        (s) => s.sessionType === "cash_game",
      ).length;
      const mttGames = sessions.filter((s) => s.sessionType === "mtt").length;
      const sitngGames = sessions.filter(
        (s) => s.sessionType === "sit_and_go",
      ).length;
      const spinGames = sessions.filter((s) => s.sessionType === "spin").length;

      const totalWinnings = summaries.reduce(
        (sum, s) => sum + s.playerWinningsTotal,
        0,
      );
      const totalRake = summaries.reduce((sum, s) => sum + s.rakeTotal, 0);
      const winners = summaries.filter((s) => s.playerWinningsTotal > 0).length;
      const losers = summaries.filter((s) => s.playerWinningsTotal < 0).length;

      const stats = {
        totalPlayers: summaries.length,
        totalAgents: uniqueAgents.size,
        totalSuperAgents: uniqueSuperAgents.size,
        playersWithAgent,
        playersWithoutAgent: summaries.length - playersWithAgent,
        totalSessions: sessions.length,
        cashGames,
        mttGames,
        sitngGames,
        spinGames,
        totalRake,
        totalWinnings,
        winners,
        losers,
      };

      // Calculate settlements summary
      const settlementsSummary = {
        totalSettlements: settlements.length,
        totalGross: settlements.reduce((sum, s) => sum + s.grossAmount, 0),
        totalRakeback: settlements.reduce(
          (sum, s) => sum + s.rakebackAmount,
          0,
        ),
        totalNet: settlements.reduce((sum, s) => sum + s.netAmount, 0),
        playersWithPositiveBalance: settlements.filter((s) => s.grossAmount > 0)
          .length,
        playersWithNegativeBalance: settlements.filter((s) => s.grossAmount < 0)
          .length,
      };

      return {
        weekPeriod: transformWeekPeriod(weekPeriod),
        sessions,
        summaries,
        rakebacks,
        agentsFromApp,
        settlements,
        settlementsSummary,
        stats,
      };
    }),

  /**
   * Preview settlements for closing a week (doesn't persist)
   */
  previewClose: protectedProcedure
    .input(previewCloseWeekSchema.optional())
    .query(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      // Get week period (current week if not specified)
      let weekPeriod: any;

      if (input?.weekPeriodId) {
        const { data, error } = await supabase
          .from("poker_week_periods")
          .select("*")
          .eq("id", input.weekPeriodId)
          .eq("team_id", teamId)
          .single();

        if (error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Week period not found",
          });
        }
        weekPeriod = data;
      } else {
        // Fetch user's week_starts_on_monday preference
        const { data: userSettings } = await supabase
          .from("users")
          .select("week_starts_on_monday")
          .eq("id", session.user.id)
          .single();

        const weekStartsOnMonday = userSettings?.week_starts_on_monday ?? true;

        // Get or create current week
        const { weekStart, weekEnd } =
          getCurrentWeekBoundaries(weekStartsOnMonday);
        const weekStartStr = formatDateForDb(weekStart);
        const weekEndStr = formatDateForDb(weekEnd);

        const { data } = await supabase
          .from("poker_week_periods")
          .select("*")
          .eq("team_id", teamId)
          .eq("week_start", weekStartStr)
          .maybeSingle();

        weekPeriod = data || {
          id: null,
          week_start: weekStartStr,
          week_end: weekEndStr,
          status: "open",
          total_sessions: 0,
          total_players: 0,
          total_rake: 0,
          total_settlements: 0,
          settlements_gross_amount: 0,
          settlements_net_amount: 0,
        };
      }

      // Get all players with non-zero chip balance
      const { data: players, error: playersError } = await supabase
        .from("poker_players")
        .select(
          `
          id,
          nickname,
          memo_name,
          type,
          chip_balance,
          rakeback_percent,
          agent_id,
          agent:poker_players!poker_players_agent_id_fkey(id, nickname, memo_name)
        `,
        )
        .eq("team_id", teamId)
        .eq("status", "active")
        .neq("chip_balance", 0)
        .order("chip_balance", { ascending: false });

      if (playersError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: playersError.message,
        });
      }

      // Calculate settlement preview for each player
      const settlements = (players ?? []).map((player) => {
        const grossAmount = player.chip_balance ?? 0;
        const rakebackPercent = player.rakeback_percent ?? 0;
        const rakebackAmount =
          grossAmount > 0 ? (grossAmount * rakebackPercent) / 100 : 0;
        const netAmount = grossAmount - rakebackAmount;

        return {
          playerId: player.id,
          playerNickname: player.nickname,
          playerMemoName: player.memo_name,
          playerType: player.type,
          agentId: player.agent_id,
          agentNickname: player.agent?.nickname ?? null,
          chipBalance: grossAmount,
          rakebackPercent,
          grossAmount,
          rakebackAmount,
          netAmount,
        };
      });

      // Calculate summary
      const summary = {
        totalSettlements: settlements.length,
        totalGross: settlements.reduce((sum, s) => sum + s.grossAmount, 0),
        totalRakeback: settlements.reduce(
          (sum, s) => sum + s.rakebackAmount,
          0,
        ),
        totalNet: settlements.reduce((sum, s) => sum + s.netAmount, 0),
        playersWithPositiveBalance: settlements.filter((s) => s.grossAmount > 0)
          .length,
        playersWithNegativeBalance: settlements.filter((s) => s.grossAmount < 0)
          .length,
      };

      return {
        weekPeriod: transformWeekPeriod(weekPeriod),
        settlements,
        summary,
      };
    }),

  /**
   * Close a week period - creates settlements and marks as closed
   */
  close: protectedProcedure
    .input(closeWeekSchema.optional())
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();
      const userId = session.user.id;

      // Fetch user's week_starts_on_monday preference
      const { data: userSettings } = await supabase
        .from("users")
        .select("week_starts_on_monday")
        .eq("id", userId)
        .single();

      const weekStartsOnMonday = userSettings?.week_starts_on_monday ?? true;

      // Get or create week period
      const { weekStart, weekEnd } =
        getCurrentWeekBoundaries(weekStartsOnMonday);
      const weekStartStr = formatDateForDb(weekStart);
      const weekEndStr = formatDateForDb(weekEnd);

      let weekPeriodId = input?.weekPeriodId;

      if (!weekPeriodId) {
        // Get or create current week
        const { data: existingPeriod } = await supabase
          .from("poker_week_periods")
          .select("id, status")
          .eq("team_id", teamId)
          .eq("week_start", weekStartStr)
          .maybeSingle();

        if (!existingPeriod) {
          const { data: newPeriod, error: createError } = await supabase
            .from("poker_week_periods")
            .insert({
              team_id: teamId,
              week_start: weekStartStr,
              week_end: weekEndStr,
              status: "open",
            })
            .select("id")
            .single();

          if (createError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: createError.message,
            });
          }
          weekPeriodId = newPeriod.id;
        } else {
          if (existingPeriod.status === "closed") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "This week is already closed",
            });
          }
          weekPeriodId = existingPeriod.id;
        }
      }

      // Get week period details
      const { data: weekPeriod, error: periodError } = await supabase
        .from("poker_week_periods")
        .select("*")
        .eq("id", weekPeriodId)
        .eq("team_id", teamId)
        .single();

      if (periodError || !weekPeriod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Week period not found",
        });
      }

      if (weekPeriod.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This week is already closed",
        });
      }

      // Get all players with non-zero chip balance
      const { data: players, error: playersError } = await supabase
        .from("poker_players")
        .select("id, nickname, chip_balance, agent_id, rakeback_percent")
        .eq("team_id", teamId)
        .eq("status", "active")
        .neq("chip_balance", 0);

      if (playersError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: playersError.message,
        });
      }

      let settlementsCreated = 0;
      let totalGross = 0;
      let totalNet = 0;

      if (players && players.length > 0) {
        // Get rakeback overrides from input (temporary % for specific agents)
        const rakebackOverrides = input?.rakebackOverrides ?? [];

        // Create settlements
        const settlements = players.map((player) => {
          const grossAmount = player.chip_balance ?? 0;

          // Check if there's an override for this player's agent
          const agentOverride = player.agent_id
            ? rakebackOverrides.find((o) => o.agentId === player.agent_id)
            : null;

          // Use override % if exists, otherwise use player's configured %
          const rakebackPercent =
            agentOverride?.rakebackPercent ?? player.rakeback_percent ?? 0;

          const rakebackAmount =
            grossAmount > 0 ? (grossAmount * rakebackPercent) / 100 : 0;
          const netAmount = grossAmount - rakebackAmount;

          totalGross += grossAmount;
          totalNet += netAmount;

          return {
            team_id: teamId,
            period_start: weekPeriod.week_start,
            period_end: weekPeriod.week_end,
            week_period_id: weekPeriodId,
            player_id: player.id,
            agent_id: player.agent_id,
            gross_amount: grossAmount,
            rakeback_amount: rakebackAmount,
            rakeback_percent_used: rakebackPercent, // Track the % used for history
            commission_amount: 0,
            adjustment_amount: 0,
            net_amount: netAmount,
            created_by_id: userId,
            note:
              input?.note ??
              `Fechamento semana: ${weekPeriod.week_start} a ${weekPeriod.week_end}`,
            status: "pending",
          };
        });

        const { data: createdSettlements, error: insertError } = await supabase
          .from("poker_settlements")
          .insert(settlements)
          .select("id");

        if (insertError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: insertError.message,
          });
        }

        settlementsCreated = createdSettlements?.length ?? 0;

        // Reset chip balances to zero
        const playerIds = players.map((p) => p.id);
        const { error: updateError } = await supabase
          .from("poker_players")
          .update({
            chip_balance: 0,
            updated_at: new Date().toISOString(),
          })
          .in("id", playerIds)
          .eq("team_id", teamId);

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: updateError.message,
          });
        }
      }

      // Get session stats for the week
      const { data: sessionStats } = await supabase
        .from("poker_sessions")
        .select("id, player_results")
        .eq("team_id", teamId)
        .gte("session_date", weekPeriod.week_start)
        .lte("session_date", weekPeriod.week_end);

      const totalSessions = sessionStats?.length ?? 0;
      const totalRake = (sessionStats ?? []).reduce((sum, s) => {
        // Sum absolute value of negative player results as rake approximation
        return sum + Math.abs(Math.min(0, s.player_results ?? 0));
      }, 0);

      // Update week period as closed with stats
      const { error: closeError } = await supabase
        .from("poker_week_periods")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by_id: userId,
          total_sessions: totalSessions,
          total_players: players?.length ?? 0,
          total_rake: totalRake,
          total_settlements: settlementsCreated,
          settlements_gross_amount: totalGross,
          settlements_net_amount: totalNet,
          note: input?.note,
          updated_at: new Date().toISOString(),
        })
        .eq("id", weekPeriodId)
        .eq("team_id", teamId);

      if (closeError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: closeError.message,
        });
      }

      // Commit all imports for this week period
      // This marks them as finalized and visible in historical reports
      const { error: commitError } = await supabase
        .from("poker_imports")
        .update({
          committed: true,
          committed_at: new Date().toISOString(),
          committed_by_id: userId,
        })
        .eq("team_id", teamId)
        .eq("status", "completed")
        .gte("period_start", weekPeriod.week_start)
        .lte("period_end", weekPeriod.week_end);

      if (commitError) {
        // Log but don't fail - imports can be committed manually if needed
        console.error("Failed to commit imports:", commitError.message);
      }

      return {
        success: true,
        weekPeriodId,
        settlementsCreated,
        periodStart: weekPeriod.week_start,
        periodEnd: weekPeriod.week_end,
      };
    }),
});

// Helper function to transform DB record to camelCase
function transformWeekPeriod(data: any) {
  return {
    id: data.id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    weekStart: data.week_start,
    weekEnd: data.week_end,
    status: data.status,
    closedAt: data.closed_at,
    closedBy: data.closed_by
      ? {
          id: data.closed_by.id,
          fullName: data.closed_by.full_name,
        }
      : null,
    totalSessions: data.total_sessions ?? 0,
    totalPlayers: data.total_players ?? 0,
    totalRake: Number(data.total_rake ?? 0),
    totalSettlements: data.total_settlements ?? 0,
    settlementsGrossAmount: Number(data.settlements_gross_amount ?? 0),
    settlementsNetAmount: Number(data.settlements_net_amount ?? 0),
    note: data.note,
  };
}
