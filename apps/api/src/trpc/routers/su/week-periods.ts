import { createAdminClient } from "@api/services/supabase";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const suWeekPeriodsRouter = createTRPCRouter({
  /**
   * Get all open week periods for SU
   */
  getOpenPeriods: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("poker_su_week_periods")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "open")
      .order("week_start", { ascending: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch open periods",
      });
    }

    return (
      data?.map((p) => ({
        id: p.id,
        week_start: p.week_start,
        week_end: p.week_end,
        status: p.status as "open" | "closed",
        timezone: p.timezone,
      })) ?? []
    );
  }),

  /**
   * Get current week period for SU (most recent open)
   */
  getCurrent: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("poker_su_week_periods")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "open")
      .order("week_start", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch current period",
      });
    }

    return data
      ? {
          id: data.id,
          week_start: data.week_start,
          week_end: data.week_end,
          status: data.status as "open" | "closed",
          timezone: data.timezone,
        }
      : null;
  }),

  /**
   * Get all data needed for close week preview modal
   */
  getCloseWeekData: protectedProcedure
    .input(z.object({ weekPeriodId: z.string().uuid().optional() }))
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get the week period (either specified or most recent open)
      let weekPeriodQuery = supabase
        .from("poker_su_week_periods")
        .select("*")
        .eq("team_id", teamId);

      if (input.weekPeriodId) {
        weekPeriodQuery = weekPeriodQuery.eq("id", input.weekPeriodId);
      } else {
        weekPeriodQuery = weekPeriodQuery
          .eq("status", "open")
          .order("week_start", { ascending: false })
          .limit(1);
      }

      const { data: weekPeriod, error: weekPeriodError } =
        await weekPeriodQuery.single();

      if (weekPeriodError || !weekPeriod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Week period not found",
        });
      }

      // Fetch completed imports for this period (same approach as dashboard analytics)
      const { data: imports } = await supabase
        .from("poker_su_imports")
        .select("id")
        .eq("team_id", teamId)
        .eq("status", "completed")
        .eq("week_period_id", weekPeriod.id);

      const importIds = imports?.map((i) => i.id) ?? [];

      // Fetch league summaries for this period
      const { data: summaries, error: summariesError } = await supabase
        .from("poker_su_league_summary")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_period_id", weekPeriod.id)
        .order("liga_nome", { ascending: true });

      if (summariesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch league summaries",
        });
      }

      // Fetch games via import_ids (same approach as dashboard to ensure consistency)
      let games: any[] = [];
      if (importIds.length > 0) {
        const { data: gamesData, error: gamesError } = await supabase
          .from("poker_su_games")
          .select("*")
          .eq("team_id", teamId)
          .in("import_id", importIds)
          .order("started_at", { ascending: false })
          .limit(50000);

        if (gamesError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch games",
          });
        }
        games = gamesData ?? [];
      }

      // Fetch existing settlements for this period
      const { data: existingSettlements, error: settlementsError } =
        await supabase
          .from("poker_su_settlements")
          .select("*")
          .eq("team_id", teamId)
          .eq("week_period_id", weekPeriod.id)
          .order("liga_nome", { ascending: true });

      if (settlementsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch settlements",
        });
      }

      // Calculate stats
      const ppstGames = games?.filter((g) => g.game_type === "ppst") ?? [];
      const ppsrGames = games?.filter((g) => g.game_type === "ppsr") ?? [];

      const totalLeagueFee =
        summaries?.reduce(
          (sum, s) =>
            sum +
            Number(s.ppst_ganhos_liga_taxa || 0) +
            Number(s.ppsr_ganhos_liga_taxa || 0),
          0,
        ) ?? 0;

      const totalGapGuaranteed =
        summaries?.reduce(
          (sum, s) => sum + Number(s.ppst_gap_garantido || 0),
          0,
        ) ?? 0;

      const totalPlayerWinnings =
        summaries?.reduce(
          (sum, s) =>
            sum +
            Number(s.ppst_ganhos_jogador || 0) +
            Number(s.ppsr_ganhos_jogador || 0),
          0,
        ) ?? 0;

      // PPST/PPSR breakdown
      const totalTaxaPPST =
        summaries?.reduce(
          (sum, s) => sum + Number(s.ppst_ganhos_liga_taxa || 0),
          0,
        ) ?? 0;

      const totalTaxaPPSR =
        summaries?.reduce(
          (sum, s) => sum + Number(s.ppsr_ganhos_liga_taxa || 0),
          0,
        ) ?? 0;

      const totalPlayerWinningsPPST =
        summaries?.reduce(
          (sum, s) => sum + Number(s.ppst_ganhos_jogador || 0),
          0,
        ) ?? 0;

      const totalPlayerWinningsPPSR =
        summaries?.reduce(
          (sum, s) => sum + Number(s.ppsr_ganhos_jogador || 0),
          0,
        ) ?? 0;

      // Leagues with PPST/PPSR activity
      const leaguesWithPPST = new Set(
        summaries
          ?.filter((s) => Number(s.ppst_ganhos_liga_taxa ?? 0) > 0)
          .map((s) => s.liga_id),
      ).size;

      const leaguesWithPPSR = new Set(
        summaries
          ?.filter((s) => Number(s.ppsr_ganhos_liga_taxa ?? 0) > 0)
          .map((s) => s.liga_id),
      ).size;

      // Overlay calculation from individual PPST games
      let overlayCount = 0;
      let overlayTotal = 0;

      for (const game of ppstGames) {
        const gtd = Number(game.premiacao_garantida ?? 0);
        if (gtd <= 0) continue;
        const buyinLiquido =
          Number(game.total_buyin ?? 0) - Number(game.total_taxa ?? 0);
        const resultado = buyinLiquido - gtd;
        if (resultado < 0) {
          overlayCount++;
          overlayTotal += resultado;
        }
      }

      // Game variant distribution
      const variantCountMap = new Map<
        string,
        { variant: string; type: string; count: number }
      >();
      for (const game of games ?? []) {
        const key = `${game.game_type}:${game.game_variant}`;
        const existing = variantCountMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          variantCountMap.set(key, {
            variant: game.game_variant,
            type: game.game_type,
            count: 1,
          });
        }
      }
      const gameVariantDistribution = Array.from(variantCountMap.values()).sort(
        (a, b) => b.count - a.count,
      );

      // Calculate preview settlements (one per liga)
      const previewSettlements =
        summaries?.map((s) => {
          const ppstLeagueFee = Number(s.ppst_ganhos_liga_taxa || 0);
          const ppsrLeagueFee = Number(s.ppsr_ganhos_liga_taxa || 0);
          const ppstGapGuaranteed = Number(s.ppst_gap_garantido || 0);
          const grossAmount = ppstLeagueFee + ppsrLeagueFee;

          // Check if settlement already exists
          const existing = existingSettlements?.find(
            (es) => es.liga_id === s.liga_id,
          );

          return {
            ligaId: s.liga_id,
            ligaNome: s.liga_nome,
            superUnionId: s.super_union_id,
            ppstLeagueFee,
            ppsrLeagueFee,
            ppstGapGuaranteed,
            grossAmount,
            netAmount: grossAmount, // No adjustments for now
            existingSettlement: existing
              ? {
                  id: existing.id,
                  status: existing.status,
                  paidAmount: Number(existing.paid_amount || 0),
                }
              : null,
          };
        }) ?? [];

      return {
        weekPeriod: {
          id: weekPeriod.id,
          weekStart: weekPeriod.week_start,
          weekEnd: weekPeriod.week_end,
          status: weekPeriod.status,
          timezone: weekPeriod.timezone,
        },
        summaries: summaries ?? [],
        games: games ?? [],
        settlements: previewSettlements,
        existingSettlements: existingSettlements ?? [],
        stats: {
          totalLeagues: summaries?.length ?? 0,
          leaguesWithPPST,
          leaguesWithPPSR,
          totalGamesPPST: ppstGames.length,
          totalGamesPPSR: ppsrGames.length,
          totalPlayersPPST: ppstGames.reduce(
            (sum, g) => sum + (g.player_count ?? 0),
            0,
          ),
          totalPlayersPPSR: ppsrGames.reduce(
            (sum, g) => sum + (g.player_count ?? 0),
            0,
          ),
          totalLeagueFee,
          totalGapGuaranteed,
          overlayCount,
          overlayTotal,
          totalPlayerWinnings,
          totalTaxaPPST,
          totalTaxaPPSR,
          totalPlayerWinningsPPST,
          totalPlayerWinningsPPSR,
          gameVariantDistribution,
        },
        settlementsSummary: {
          count: previewSettlements.length,
          totalGrossAmount: previewSettlements.reduce(
            (sum, s) => sum + s.grossAmount,
            0,
          ),
          totalNetAmount: previewSettlements.reduce(
            (sum, s) => sum + s.netAmount,
            0,
          ),
          alreadySettled:
            existingSettlements?.filter((s) => s.status === "completed")
              .length ?? 0,
        },
      };
    }),

  /**
   * Close week period and create settlements
   */
  close: protectedProcedure
    .input(
      z.object({
        weekPeriodId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const userId = session?.user?.id;
      const supabase = await createAdminClient();

      // Get the week period
      let weekPeriodQuery = supabase
        .from("poker_su_week_periods")
        .select("*")
        .eq("team_id", teamId);

      if (input.weekPeriodId) {
        weekPeriodQuery = weekPeriodQuery.eq("id", input.weekPeriodId);
      } else {
        weekPeriodQuery = weekPeriodQuery
          .eq("status", "open")
          .order("week_start", { ascending: false })
          .limit(1);
      }

      const { data: weekPeriod, error: weekPeriodError } =
        await weekPeriodQuery.single();

      if (weekPeriodError || !weekPeriod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Week period not found",
        });
      }

      if (weekPeriod.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Week period already closed",
        });
      }

      // Get league summaries for this period
      const { data: summaries, error: summariesError } = await supabase
        .from("poker_su_league_summary")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_period_id", weekPeriod.id);

      if (summariesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch league summaries",
        });
      }

      // Get completed imports for this period
      const { data: closeImports } = await supabase
        .from("poker_su_imports")
        .select("id")
        .eq("team_id", teamId)
        .eq("status", "completed")
        .eq("week_period_id", weekPeriod.id);

      const closeImportIds = closeImports?.map((i) => i.id) ?? [];

      // Get games stats via import_ids (consistent with dashboard)
      let games: any[] = [];
      if (closeImportIds.length > 0) {
        const { data: gamesData } = await supabase
          .from("poker_su_games")
          .select("game_type, player_count")
          .eq("team_id", teamId)
          .in("import_id", closeImportIds)
          .limit(50000);
        games = gamesData ?? [];
      }

      const ppstGames = games.filter((g) => g.game_type === "ppst");
      const ppsrGames = games.filter((g) => g.game_type === "ppsr");

      // Create settlements for each liga
      let settlementsCreated = 0;
      let totalGrossAmount = 0;
      let totalNetAmount = 0;

      for (const summary of summaries ?? []) {
        const ppstLeagueFee = Number(summary.ppst_ganhos_liga_taxa || 0);
        const ppsrLeagueFee = Number(summary.ppsr_ganhos_liga_taxa || 0);
        const ppstGapGuaranteed = Number(summary.ppst_gap_garantido || 0);
        const grossAmount = ppstLeagueFee + ppsrLeagueFee;
        const netAmount = grossAmount; // No adjustments for now

        // Count games for this liga
        const { data: ligaGames } = await supabase
          .from("poker_su_game_players")
          .select("game_id")
          .eq("team_id", teamId)
          .eq("liga_id", summary.liga_id);

        const uniqueGameIds = new Set(ligaGames?.map((g) => g.game_id) ?? []);

        // Upsert settlement
        const { error: settlementError } = await supabase
          .from("poker_su_settlements")
          .upsert(
            {
              team_id: teamId,
              period_start: weekPeriod.week_start,
              period_end: weekPeriod.week_end,
              week_period_id: weekPeriod.id,
              su_league_id: summary.su_league_id,
              liga_id: summary.liga_id,
              liga_nome: summary.liga_nome,
              status: "pending",
              ppst_league_fee: ppstLeagueFee,
              ppst_gap_guaranteed: ppstGapGuaranteed,
              ppst_games_count: uniqueGameIds.size, // approximate
              ppsr_league_fee: ppsrLeagueFee,
              ppsr_games_count: 0, // TODO: count properly
              gross_amount: grossAmount,
              net_amount: netAmount,
              created_by_id: userId,
            },
            { onConflict: "team_id,week_period_id,liga_id" },
          );

        if (!settlementError) {
          settlementsCreated++;
          totalGrossAmount += grossAmount;
          totalNetAmount += netAmount;
        }
      }

      // Calculate statistics for week period closure
      const totalLeagueFee =
        summaries?.reduce(
          (sum, s) =>
            sum +
            Number(s.ppst_ganhos_liga_taxa || 0) +
            Number(s.ppsr_ganhos_liga_taxa || 0),
          0,
        ) ?? 0;

      const totalGapGuaranteed =
        summaries?.reduce(
          (sum, s) => sum + Number(s.ppst_gap_garantido || 0),
          0,
        ) ?? 0;

      const totalPlayerWinnings =
        summaries?.reduce(
          (sum, s) =>
            sum +
            Number(s.ppst_ganhos_jogador || 0) +
            Number(s.ppsr_ganhos_jogador || 0),
          0,
        ) ?? 0;

      // Update week period to closed
      const { error: closeError } = await supabase
        .from("poker_su_week_periods")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by_id: userId,
          total_leagues: summaries?.length ?? 0,
          total_games_ppst: ppstGames.length,
          total_games_ppsr: ppsrGames.length,
          total_players_ppst: ppstGames.reduce(
            (sum, g) => sum + (g.player_count ?? 0),
            0,
          ),
          total_players_ppsr: ppsrGames.reduce(
            (sum, g) => sum + (g.player_count ?? 0),
            0,
          ),
          total_league_earnings: totalLeagueFee,
          total_gap_guaranteed: totalGapGuaranteed,
          total_player_winnings: totalPlayerWinnings,
          total_settlements: settlementsCreated,
          settlements_gross_amount: totalGrossAmount,
          settlements_net_amount: totalNetAmount,
        })
        .eq("id", weekPeriod.id);

      if (closeError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to close week period",
        });
      }

      // 🔥 COMMIT ALL IMPORTS FOR THIS WEEK PERIOD 🔥
      // This marks them as finalized and visible in historical reports
      // Imports remain uncommitted during the week (current week view only)
      // After closing, they become committed and visible everywhere
      const { error: commitError } = await supabase
        .from("poker_su_imports")
        .update({
          committed: true,
          committed_at: new Date().toISOString(),
          committed_by_id: userId,
        })
        .eq("team_id", teamId)
        .eq("status", "completed")
        .eq("week_period_id", weekPeriod.id);

      if (commitError) {
        // Log but don't fail - imports can be committed manually if needed
        console.error(
          "[suWeekPeriods.close] Failed to commit imports:",
          commitError.message,
        );
      }

      return {
        success: true,
        settlementsCreated,
        totalGrossAmount,
        totalNetAmount,
        weekPeriodId: weekPeriod.id,
      };
    }),

  /**
   * List all week periods (for history view)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "closed"]).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_su_week_periods")
        .select("*")
        .eq("team_id", teamId)
        .order("week_start", { ascending: false });

      if (input?.status) {
        query = query.eq("status", input.status);
      }

      if (input?.limit) {
        query = query.limit(input.limit);
      }

      if (input?.offset) {
        query = query.range(
          input.offset,
          input.offset + (input.limit ?? 10) - 1,
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch week periods",
        });
      }

      return data ?? [];
    }),
});
