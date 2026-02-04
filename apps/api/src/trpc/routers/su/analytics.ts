import { createAdminClient } from "@api/services/supabase";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  viewMode: z.enum(["current_week", "historical"]).optional(),
});

// Helper: resolve import IDs for open week period
async function resolveOpenWeekImportIds(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  teamId: string,
): Promise<string[]> {
  const { data: openPeriod } = await supabase
    .from("poker_su_week_periods")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "open")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openPeriod) return [];

  const { data: imports } = await supabase
    .from("poker_su_imports")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "completed")
    .eq("week_period_id", openPeriod.id);

  return imports?.map((i) => i.id) ?? [];
}

// Map game_variant enum values to uppercase game type strings
function variantToGameType(variant: string | null): string {
  if (!variant) return "NLH";
  switch (variant) {
    case "nlh":
    case "short":
    case "6plus":
      return "NLH";
    case "plo4":
    case "plo5":
    case "plo6":
      return "PLO";
    case "spinup":
      return "SPINUP";
    case "pko":
      return "PKO";
    case "mko":
      return "MKO";
    case "sat":
      return "SAT";
    case "ofc":
      return "OFC";
    default:
      return variant.toUpperCase();
  }
}

// Convert UTC timestamp to day-of-week string (MONDAY, TUESDAY, etc.)
function timestampToDayOfWeek(ts: string): string {
  const d = new Date(ts);
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[d.getUTCDay()] || "MONDAY";
}

// Format timestamp as HH:MM in UTC-3 (Brasília)
function timestampToTimeUtc3(ts: string): string {
  const d = new Date(ts);
  // UTC-3 offset
  const utc3 = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const hh = String(utc3.getUTCHours()).padStart(2, "0");
  const mm = String(utc3.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Format timestamp as YYYY/MM/DD in UTC-3
function timestampToDateStr(ts: string): string {
  const d = new Date(ts);
  const utc3 = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const y = utc3.getUTCFullYear();
  const m = String(utc3.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc3.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

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
          gamesPPSRByType: {
            nlh: 0,
            plo4: 0,
            plo5: 0,
            plo6: 0,
            ofc: 0,
            other: 0,
          },
        };
      }

      // Step 2: Get league summaries for these imports
      const { data: summaries, error: summariesError } = await supabase
        .from("poker_su_league_summary")
        .select("*")
        .eq("team_id", teamId)
        .in("import_id", importIds)
        .limit(1000000);

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
        { data: gameStatsRows },
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
          .select(
            "premiacao_garantida, total_buyin, total_taxa, total_gap_garantido",
          )
          .eq("team_id", teamId)
          .eq("game_type", "ppst")
          .gt("premiacao_garantida", 0)
          .in("import_id", importIds)
          .limit(50000),
        // Aggregated taxa + ganhos via SQL function (no row limit)
        supabase.rpc("get_game_stats_by_imports", {
          p_team_id: teamId,
          p_import_ids: importIds,
        }),
      ]);

      const gameStats = gameStatsRows?.[0] ?? null;

      const totalGamesPPST = countPPST ?? 0;
      const totalGamesPPSR = countPPSR ?? 0;

      // Step 4: Calculate stats
      const totalLeagues = new Set(summaries?.map((s) => s.liga_id)).size;

      // Taxa e ganhos agregados direto no banco (sem limite de linhas)
      const leagueEarningsPPST = Number(gameStats?.ppst_total_taxa ?? 0);
      const leagueEarningsPPSR = Number(gameStats?.ppsr_total_taxa ?? 0);
      const playerWinningsPPST = Number(
        gameStats?.ppst_total_ganhos_jogador ?? 0,
      );
      const playerWinningsPPSR = Number(
        gameStats?.ppsr_total_ganhos_jogador ?? 0,
      );

      const gapGuaranteedTotal =
        summaries?.reduce(
          (sum, s) => sum + Number(s.ppst_gap_garantido ?? 0),
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
        const buyinLiquido =
          Number(game.total_buyin ?? 0) - Number(game.total_taxa ?? 0);
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
        ppstVariantCounts[g.game_variant] =
          (ppstVariantCounts[g.game_variant] ?? 0) + 1;
      }
      const gamesPPSTByType = {
        nlh:
          (ppstVariantCounts.nlh ?? 0) +
          (ppstVariantCounts.short ?? 0) +
          (ppstVariantCounts["6plus"] ?? 0),
        spinup: ppstVariantCounts.spinup ?? 0,
        pko: ppstVariantCounts.pko ?? 0,
        mko: ppstVariantCounts.mko ?? 0,
        sat: ppstVariantCounts.sat ?? 0,
      };

      // PPSR breakdown by variant
      const ppsrVariantCounts: Record<string, number> = {};
      for (const g of ppsrVariants ?? []) {
        ppsrVariantCounts[g.game_variant] =
          (ppsrVariantCounts[g.game_variant] ?? 0) + 1;
      }
      const gamesPPSRByType = {
        nlh:
          (ppsrVariantCounts.nlh ?? 0) +
          (ppsrVariantCounts.short ?? 0) +
          (ppsrVariantCounts["6plus"] ?? 0),
        plo4: ppsrVariantCounts.plo4 ?? 0,
        plo5: ppsrVariantCounts.plo5 ?? 0,
        plo6: ppsrVariantCounts.plo6 ?? 0,
        ofc: ppsrVariantCounts.ofc ?? 0,
        other: Object.entries(ppsrVariantCounts)
          .filter(
            ([k]) =>
              ![
                "nlh",
                "short",
                "6plus",
                "plo4",
                "plo5",
                "plo6",
                "ofc",
              ].includes(k),
          )
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

  /**
   * Get realized tournaments from the database.
   * Replaces localStorage key "ppst-realized-tournaments".
   * Returns PPST games with premiacao_garantida > 0 in the same shape
   * as StoredRealizedData used by the frontend tabs.
   */
  getRealizedTournaments: protectedProcedure
    .input(
      z
        .object({
          weekNumber: z.number().optional(),
          weekYear: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Resolve import IDs from the open week period
      const importIds = await resolveOpenWeekImportIds(supabase, teamId);

      if (importIds.length === 0) {
        return null;
      }

      // Get the period dates from import metadata
      const { data: importMeta } = await supabase
        .from("poker_su_imports")
        .select("period_start, period_end")
        .in("id", importIds)
        .limit(1)
        .maybeSingle();

      // Fetch PPST games with GTD > 0
      const { data: games, error } = await supabase
        .from("poker_su_games")
        .select(
          "table_name, started_at, game_variant, premiacao_garantida, buyin_base, buyin_bounty, buyin_taxa, player_count, total_buyin, total_taxa",
        )
        .eq("team_id", teamId)
        .eq("game_type", "ppst")
        .gt("premiacao_garantida", 0)
        .in("import_id", importIds)
        .limit(50000);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch realized tournaments",
        });
      }

      const tournaments = (games ?? []).map((g) => {
        const gtd = Number(g.premiacao_garantida ?? 0);
        const totalBuyin = Number(g.total_buyin ?? 0);
        const totalTaxa = Number(g.total_taxa ?? 0);
        // overlay = (total buyin - taxa) - gtd   (negative = overlay)
        const overlay = totalBuyin - totalTaxa - gtd;

        return {
          name: (g.table_name ?? "").trim().toUpperCase(),
          date: timestampToDateStr(g.started_at),
          day: timestampToDayOfWeek(g.started_at),
          time: timestampToTimeUtc3(g.started_at),
          gtdFichas: gtd,
          gameType: variantToGameType(g.game_variant),
          buyIn:
            Number(g.buyin_base ?? 0) +
            Number(g.buyin_bounty ?? 0) +
            Number(g.buyin_taxa ?? 0),
          entries: g.player_count ?? 0,
          overlay,
        };
      });

      return {
        weekNumber: input?.weekNumber ?? 0,
        period: {
          start: importMeta?.period_start ?? "",
          end: importMeta?.period_end ?? "",
        },
        savedAt: new Date().toISOString(),
        tournaments,
        totalGTDFichas: tournaments.reduce((s, t) => s + t.gtdFichas, 0),
        totalCount: tournaments.length,
      };
    }),

  /**
   * Get per-club overlay aggregation from the database.
   * Replaces localStorage key "ppst-overlay-clubs".
   * Returns clubs with buyin/taxa/liquido for games that have overlay,
   * in the same shape as the ArrecadacaoSection expects.
   */
  getOverlayClubs: protectedProcedure
    .input(
      z
        .object({
          weekNumber: z.number().optional(),
          weekYear: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const importIds = await resolveOpenWeekImportIds(supabase, teamId);

      if (importIds.length === 0) {
        return null;
      }

      // Get period from imports
      const { data: importMeta } = await supabase
        .from("poker_su_imports")
        .select("period_start, period_end")
        .in("id", importIds)
        .limit(1)
        .maybeSingle();

      // Get PPST games with GTD > 0 that have overlay (buyin - taxa < gtd)
      const { data: gtdGames, error: gamesError } = await supabase
        .from("poker_su_games")
        .select("id, premiacao_garantida, total_buyin, total_taxa")
        .eq("team_id", teamId)
        .eq("game_type", "ppst")
        .gt("premiacao_garantida", 0)
        .in("import_id", importIds)
        .limit(50000);

      if (gamesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch games for overlay clubs",
        });
      }

      // Filter to only games with overlay
      const overlayGameIds: string[] = [];
      let totalOverlayAmount = 0;

      for (const g of gtdGames ?? []) {
        const buyinLiquido =
          Number(g.total_buyin ?? 0) - Number(g.total_taxa ?? 0);
        const gtd = Number(g.premiacao_garantida ?? 0);
        const overlay = buyinLiquido - gtd;
        if (overlay < 0) {
          overlayGameIds.push(g.id);
          totalOverlayAmount += overlay;
        }
      }

      if (overlayGameIds.length === 0) {
        return {
          clubs: [],
          summary: {
            totalOverlayGames: 0,
            totalOverlayAmount: 0,
            totalBuyin: 0,
            totalTaxa: 0,
            totalLiquido: 0,
            totalClubs: 0,
          },
          weekNumber: input?.weekNumber ?? 0,
          period: {
            start: importMeta?.period_start ?? "",
            end: importMeta?.period_end ?? "",
          },
          savedAt: new Date().toISOString(),
        };
      }

      // Fetch players from overlay games, aggregated by club
      const { data: players, error: playersError } = await supabase
        .from("poker_su_game_players")
        .select(
          "game_id, clube_id, clube_nome, liga_id, super_union_id, buyin_fichas, taxa",
        )
        .eq("team_id", teamId)
        .in("game_id", overlayGameIds)
        .limit(50000);

      if (playersError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch game players for overlay clubs",
        });
      }

      // Aggregate per club
      const clubMap = new Map<
        string,
        {
          clubeId: number;
          clubeNome: string;
          ligaId: number;
          superUnionId: number | null;
          totalBuyin: number;
          totalTaxa: number;
          gameIds: Set<string>;
        }
      >();

      for (const p of players ?? []) {
        const key = `${p.liga_id}-${p.clube_id}`;
        let entry = clubMap.get(key);
        if (!entry) {
          entry = {
            clubeId: p.clube_id,
            clubeNome: p.clube_nome ?? "",
            ligaId: p.liga_id,
            superUnionId: p.super_union_id,
            totalBuyin: 0,
            totalTaxa: 0,
            gameIds: new Set(),
          };
          clubMap.set(key, entry);
        }
        entry.totalBuyin += Number(p.buyin_fichas ?? 0);
        entry.totalTaxa += Number(p.taxa ?? 0);
        entry.gameIds.add(p.game_id);
      }

      const clubs = Array.from(clubMap.values())
        .map((c) => ({
          clubeId: c.clubeId,
          clubeNome: c.clubeNome,
          ligaId: c.ligaId,
          superUnionId: c.superUnionId,
          totalBuyin: c.totalBuyin,
          totalTaxa: c.totalTaxa,
          liquido: c.totalBuyin - c.totalTaxa,
          overlayGameCount: c.gameIds.size,
        }))
        .sort((a, b) => b.liquido - a.liquido);

      const summaryBuyin = clubs.reduce((s, c) => s + c.totalBuyin, 0);
      const summaryTaxa = clubs.reduce((s, c) => s + c.totalTaxa, 0);

      return {
        clubs,
        summary: {
          totalOverlayGames: overlayGameIds.length,
          totalOverlayAmount,
          totalBuyin: summaryBuyin,
          totalTaxa: summaryTaxa,
          totalLiquido: summaryBuyin - summaryTaxa,
          totalClubs: clubs.length,
        },
        weekNumber: input?.weekNumber ?? 0,
        period: {
          start: importMeta?.period_start ?? "",
          end: importMeta?.period_end ?? "",
        },
        savedAt: new Date().toISOString(),
      };
    }),
});
