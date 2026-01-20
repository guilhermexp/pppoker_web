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
          gamesWithGap: 0,
          maxGap: 0,
          playerWinningsTotal: 0,
          playerWinningsPPST: 0,
          playerWinningsPPSR: 0,
          totalGTD: 0,
          leaguesWithPPST: 0,
          leaguesWithPPSR: 0,
          topLeagues: [] as Array<{
            ligaId: number;
            ligaNome: string;
            totalFee: number;
          }>,
          gamesPPSTByType: { nlh: 0, spinup: 0, knockout: 0 },
          gamesPPSRByType: { nlh: 0, plo: 0, other: 0 },
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

      // Step 3: Get games for these imports
      const { data: games, error: gamesError } = await supabase
        .from("poker_su_games")
        .select("game_type, game_variant, player_count")
        .eq("team_id", teamId)
        .in("import_id", importIds);

      if (gamesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch games",
        });
      }

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

      // Count games with gap
      const gamesWithGap = summaries?.filter(
        (s) => Number(s.ppst_gap_garantido ?? 0) > 0,
      ).length ?? 0;

      // Find max gap
      const maxGap = summaries?.reduce(
        (max, s) => Math.max(max, Number(s.ppst_gap_garantido ?? 0)),
        0,
      ) ?? 0;

      // Step 5: Calculate game stats
      const gamesPPST = games?.filter((g) => g.game_type === "ppst") ?? [];
      const gamesPPSR = games?.filter((g) => g.game_type === "ppsr") ?? [];

      const totalPlayersPPST = gamesPPST.reduce(
        (sum, g) => sum + (g.player_count ?? 0),
        0,
      );
      const totalPlayersPPSR = gamesPPSR.reduce(
        (sum, g) => sum + (g.player_count ?? 0),
        0,
      );

      // Breakdown by game variant (approximate based on variant names)
      const gamesPPSTByType = {
        nlh: gamesPPST.filter((g) =>
          g.game_variant === "nlh" ||
          g.game_variant === "short" ||
          g.game_variant === "6plus"
        ).length,
        spinup: gamesPPST.filter((g) => g.game_variant === "spinup").length,
        knockout: gamesPPST.filter((g) =>
          g.game_variant === "pko" ||
          g.game_variant === "mko"
        ).length,
      };

      const gamesPPSRByType = {
        nlh: gamesPPSR.filter((g) =>
          g.game_variant === "nlh" ||
          g.game_variant === "short" ||
          g.game_variant === "6plus"
        ).length,
        plo: gamesPPSR.filter((g) =>
          g.game_variant === "plo4" ||
          g.game_variant === "plo5" ||
          g.game_variant === "plo6"
        ).length,
        other: gamesPPSR.filter((g) =>
          g.game_variant !== "nlh" &&
          g.game_variant !== "short" &&
          g.game_variant !== "6plus" &&
          g.game_variant !== "plo4" &&
          g.game_variant !== "plo5" &&
          g.game_variant !== "plo6"
        ).length,
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
        totalGamesPPST: gamesPPST.length,
        totalGamesPPSR: gamesPPSR.length,
        totalPlayersPPST,
        totalPlayersPPSR,
        leagueEarningsTotal: leagueEarningsPPST + leagueEarningsPPSR,
        leagueEarningsPPST,
        leagueEarningsPPSR,
        gapGuaranteedTotal,
        gamesWithGap,
        maxGap,
        playerWinningsTotal: playerWinningsPPST + playerWinningsPPSR,
        playerWinningsPPST,
        playerWinningsPPSR,
        totalGTD: 0, // TODO: Calculate from game guaranteed prizes if available
        leaguesWithPPST,
        leaguesWithPPSR,
        topLeagues,
        gamesPPSTByType,
        gamesPPSRByType,
      };
    }),
});
