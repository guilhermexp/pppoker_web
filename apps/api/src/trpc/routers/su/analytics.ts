import { z } from "@hono/zod-openapi";
import { createTRPCRouter, protectedProcedure } from "../../init";

const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  viewMode: z.enum(["current_week", "historical"]).optional(),
});

export const suAnalyticsRouter = createTRPCRouter({
  /**
   * Get comprehensive dashboard stats for SU
   */
  getDashboardStats: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      // TODO: Implement actual data fetching from poker_su_* tables
      // For now, return default values to allow the build to succeed
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
        topLeagues: [] as Array<{
          ligaId: number;
          ligaNome: string;
          totalFee: number;
        }>,
        gamesPPSTByType: { nlh: 0, spinup: 0, knockout: 0 },
        gamesPPSRByType: { nlh: 0, plo: 0, other: 0 },
      };
    }),
});
