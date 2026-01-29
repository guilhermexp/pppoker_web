import { createAdminClient } from "@api/services/supabase";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  viewMode: z.enum(["current_week", "historical"]).optional(),
});

export const suAnalyticsRouter = createTRPCRouter({
  /**
   * Get comprehensive dashboard stats for SU
   * Filters data by committed status based on viewMode:
   * - current_week: Shows data from open week (any committed status)
   * - historical: Shows only committed data (closed weeks)
   */
  getDashboardStats: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const viewMode = input?.viewMode ?? "current_week";

      // Step 1: Get import IDs based on viewMode and committed status
      let importIds: string[] = [];

      if (viewMode === "current_week") {
        // Current week: get most recent open period's imports (any committed status)
        const { data: openPeriod } = await supabase
          .from("poker_su_week_periods")
          .select("id, week_start, week_end")
          .eq("team_id", teamId)
          .eq("status", "open")
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openPeriod) {
          const { data: imports } = await supabase
            .from("poker_su_imports")
            .select("id")
            .eq("team_id", teamId)
            .eq("status", "completed")
            .eq("week_period_id", openPeriod.id);

          importIds = imports?.map((i) => i.id) ?? [];
        }
      } else {
        // Historical: get only committed imports in date range
        let query = supabase
          .from("poker_su_imports")
          .select("id")
          .eq("team_id", teamId)
          .eq("status", "completed")
          .eq("committed", true);

        if (input?.from) {
          query = query.gte("period_start", input.from);
        }
        if (input?.to) {
          query = query.lte("period_end", input.to);
        }

        const { data: imports } = await query;
        importIds = imports?.map((i) => i.id) ?? [];
      }

      // If no imports, return empty stats
      if (importIds.length === 0) {
        return {
          totalLeagues: 0,
          totalGamesPPST: 0,
          totalGamesPPSR: 0,
          totalPlayersPPST: 0,
          totalPlayersPPSR: 0,
          leagueEarningsTotal: 0,
          leagueEarningsPPST: 0,
          leagueEarningsPPSR: 0,
          gapGuaranteedTotal: 0,
          overlayCount: 0,
          overlayTotal: 0,
          gamesWithGTD: 0,
          playerWinningsTotal: 0,
          playerWinningsPPST: 0,
          playerWinningsPPSR: 0,
          leaguesWithPPST: 0,
          leaguesWithPPSR: 0,
          topLeagues: [] as Array<{
            ligaId: number;
            ligaNome: string;
            totalFee: number;
          }>,
          gamesPPSTByType: { nlh: 0, spinup: 0, pko: 0, mko: 0, sat: 0 },
          gamesPPSRByType: { nlh: 0, plo4: 0, plo5: 0, plo6: 0, ofc: 0, other: 0 },
        };
      }

      // Step 2: Get league summaries for these imports
      const { data: summaries, error: summariesError } = await supabase
        .from("poker_su_league_summary")
        .select("*")
        .eq("team_id", teamId)
        .in("import_id", importIds);

      if (summariesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch league summaries",
        });
      }

      // Step 3: Get game counts and breakdowns (parallel queries to avoid 1000-row default limit)
      const [
        { count: countPPST },
        { count: countPPSR },
        { data: ppstVariants },
        { data: ppsrVariants },
        { data: ppstPlayerData },
        { data: ppsrPlayerData },
        { data: gtdGames },
      ] = await Promise.all([
        // Total PPST count
        supabase
          .from("poker_su_games")
          .select("*", { count: "exact", head: true })
          .eq("team_id", teamId)
          .eq("game_type", "ppst")
          .in("import_id", importIds),
        // Total PPSR count
        supabase
          .from("poker_su_games")
          .select("*", { count: "exact", head: true })
          .eq("team_id", teamId)
          .eq("game_type", "ppsr")
          .in("import_id", importIds),
        // PPST variant breakdown
        supabase
          .from("poker_su_games")
          .select("game_variant")
          .eq("team_id", teamId)
          .eq("game_type", "ppst")
          .in("import_id", importIds)
          .limit(50000),
        // PPSR variant breakdown
        supabase
          .from("poker_su_games")
          .select("game_variant")
          .eq("team_id", teamId)
          .eq("game_type", "ppsr")
          .in("import_id", importIds)
          .limit(50000),
        // PPST player counts
        supabase
          .from("poker_su_games")
          .select("player_count")
          .eq("team_id", teamId)
          .eq("game_type", "ppst")
          .in("import_id", importIds)
          .limit(50000),
        // PPSR player counts
        supabase
          .from("poker_su_games")
          .select("player_count")
          .eq("team_id", teamId)
          .eq("game_type", "ppsr")
          .in("import_id", importIds)
          .limit(50000),
        // PPST games with GTD (for overlay/gap calculation)
        supabase
          .from("poker_su_games")
          .select("premiacao_garantida, total_buyin, total_taxa, total_gap_garantido")
          .eq("team_id", teamId)
          .eq("game_type", "ppst")
          .gt("premiacao_garantida", 0)
          .in("import_id", importIds)
          .limit(50000),
      ]);

      const totalGamesPPST = countPPST ?? 0;
      const totalGamesPPSR = countPPSR ?? 0;

      // Step 4: Calculate stats from summaries
      const totalLeagues = new Set(summaries?.map((s) => s.liga_id)).size;

      const leagueEarningsPPST = summaries?.reduce(
        (sum, s) => sum + Number(s.ppst_ganhos_liga_taxa ?? 0),
        0,
      ) ?? 0;

      const leagueEarningsPPSR = summaries?.reduce(
        (sum, s) => sum + Number(s.ppsr_ganhos_liga_taxa ?? 0),
        0,
      ) ?? 0;

      const gapGuaranteedTotal = summaries?.reduce(
        (sum, s) => sum + Number(s.ppst_gap_garantido ?? 0),
        0,
      ) ?? 0;

      const playerWinningsPPST = summaries?.reduce(
        (sum, s) => sum + Number(s.ppst_ganhos_jogador ?? 0),
        0,
      ) ?? 0;

      const playerWinningsPPSR = summaries?.reduce(
        (sum, s) => sum + Number(s.ppsr_ganhos_jogador ?? 0),
        0,
      ) ?? 0;

      // Count leagues with PPST/PPSR
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

      // Step 5: Calculate overlay and gap from individual PPST games with GTD
      let overlayCount = 0;
      let overlayTotal = 0;
      let totalGapFromGames = 0;
      let gamesWithGTD = 0;

      for (const game of gtdGames ?? []) {
        gamesWithGTD++;
        const buyinLiquido = Number(game.total_buyin ?? 0) - Number(game.total_taxa ?? 0);
        const gtd = Number(game.premiacao_garantida ?? 0);
        const resultado = buyinLiquido - gtd;

        // Overlay = when net buy-in is less than GTD
        if (resultado < 0) {
          overlayCount++;
          overlayTotal += resultado; // negative value
        }

        totalGapFromGames += Number(game.total_gap_garantido ?? 0);
      }

      // Step 6: Calculate game stats from parallel query results
      const totalPlayersPPST = (ppstPlayerData ?? []).reduce(
        (sum, g) => sum + (g.player_count ?? 0),
        0,
      );
      const totalPlayersPPSR = (ppsrPlayerData ?? []).reduce(
        (sum, g) => sum + (g.player_count ?? 0),
        0,
      );

      // PPST breakdown by variant
      const ppstVariantCounts: Record<string, number> = {};
      for (const g of ppstVariants ?? []) {
        ppstVariantCounts[g.game_variant] = (ppstVariantCounts[g.game_variant] ?? 0) + 1;
      }
      const gamesPPSTByType = {
        nlh: (ppstVariantCounts.nlh ?? 0) + (ppstVariantCounts.short ?? 0) + (ppstVariantCounts["6plus"] ?? 0),
        spinup: ppstVariantCounts.spinup ?? 0,
        pko: ppstVariantCounts.pko ?? 0,
        mko: ppstVariantCounts.mko ?? 0,
        sat: ppstVariantCounts.sat ?? 0,
      };

      // PPSR breakdown by variant
      const ppsrVariantCounts: Record<string, number> = {};
      for (const g of ppsrVariants ?? []) {
        ppsrVariantCounts[g.game_variant] = (ppsrVariantCounts[g.game_variant] ?? 0) + 1;
      }
      const gamesPPSRByType = {
        nlh: (ppsrVariantCounts.nlh ?? 0) + (ppsrVariantCounts.short ?? 0) + (ppsrVariantCounts["6plus"] ?? 0),
        plo4: ppsrVariantCounts.plo4 ?? 0,
        plo5: ppsrVariantCounts.plo5 ?? 0,
        plo6: ppsrVariantCounts.plo6 ?? 0,
        ofc: ppsrVariantCounts.ofc ?? 0,
        other: Object.entries(ppsrVariantCounts)
          .filter(([k]) => !["nlh", "short", "6plus", "plo4", "plo5", "plo6", "ofc"].includes(k))
          .reduce((sum, [, v]) => sum + v, 0),
      };

      // Step 6: Top leagues by total fee
      const leagueFeesMap = new Map<
        number,
        { ligaNome: string; totalFee: number }
      >();

      for (const summary of summaries ?? []) {
        const ligaId = summary.liga_id;
        const totalFee =
          Number(summary.ppst_ganhos_liga_taxa ?? 0) +
          Number(summary.ppsr_ganhos_liga_taxa ?? 0);

        if (leagueFeesMap.has(ligaId)) {
          const current = leagueFeesMap.get(ligaId)!;
          current.totalFee += totalFee;
        } else {
          leagueFeesMap.set(ligaId, {
            ligaNome: summary.liga_nome,
            totalFee,
          });
        }
      }

      const topLeagues = Array.from(leagueFeesMap.entries())
        .map(([ligaId, data]) => ({
          ligaId,
          ligaNome: data.ligaNome,
          totalFee: data.totalFee,
        }))
        .sort((a, b) => b.totalFee - a.totalFee)
        .slice(0, 10);

      // Return all stats
      return {
        totalLeagues,
        totalGamesPPST,
        totalGamesPPSR,
        totalPlayersPPST,
        totalPlayersPPSR,
        leagueEarningsTotal: leagueEarningsPPST + leagueEarningsPPSR,
        leagueEarningsPPST,
        leagueEarningsPPSR,
        gapGuaranteedTotal,
        overlayCount,
        overlayTotal,
        gamesWithGTD,
        playerWinningsTotal: playerWinningsPPST + playerWinningsPPSR,
        playerWinningsPPST,
        playerWinningsPPSR,
        leaguesWithPPST,
        leaguesWithPPSR,
        topLeagues,
        gamesPPSTByType,
        gamesPPSRByType,
      };
    }),
});
