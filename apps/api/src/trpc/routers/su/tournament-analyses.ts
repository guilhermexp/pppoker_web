import { createAdminClient } from "@api/services/supabase";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

// =============================================================================
// Schemas
// =============================================================================

const saveSchema = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
  // JSONB data
  scheduleData: z.unknown().optional(),
  realizedData: z.unknown().optional(),
  saOverlayData: z.unknown().optional(),
  // Summary metrics
  scheduleTournamentCount: z.number().int().default(0),
  scheduleTotalGtdUsd: z.number().default(0),
  overlayCount: z.number().int().default(0),
  overlayTotalBrl: z.number().default(0),
  saPpstUsd: z.number().default(0),
  saTotalUsd: z.number().default(0),
  crossMatchCount: z.number().int().default(0),
  note: z.string().optional(),
});

const getByWeekSchema = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
});

const listSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(52),
  })
  .optional();

const deleteSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// Router
// =============================================================================

export const suTournamentAnalysesRouter = createTRPCRouter({
  // ===========================================================================
  // Save (upsert by team + week)
  // ===========================================================================

  save: protectedProcedure
    .input(saveSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();
      const userId = session?.user?.id;

      const row = {
        team_id: teamId,
        week_year: input.weekYear,
        week_number: input.weekNumber,
        week_start: input.weekStart ?? null,
        week_end: input.weekEnd ?? null,
        schedule_data: input.scheduleData ?? null,
        realized_data: input.realizedData ?? null,
        sa_overlay_data: input.saOverlayData ?? null,
        schedule_tournament_count: input.scheduleTournamentCount,
        schedule_total_gtd_usd: input.scheduleTotalGtdUsd,
        overlay_count: input.overlayCount,
        overlay_total_brl: input.overlayTotalBrl,
        sa_ppst_usd: input.saPpstUsd,
        sa_total_usd: input.saTotalUsd,
        cross_match_count: input.crossMatchCount,
        note: input.note ?? null,
        saved_by_id: userId,
      };

      const { data, error } = await supabase
        .from("poker_su_tournament_analyses")
        .upsert(row, {
          onConflict: "team_id,week_year,week_number",
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save tournament analysis",
        });
      }

      return data;
    }),

  // ===========================================================================
  // Get by week (full data with JSONB)
  // ===========================================================================

  getByWeek: protectedProcedure
    .input(getByWeekSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_su_tournament_analyses")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_year", input.weekYear)
        .eq("week_number", input.weekNumber)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tournament analysis",
        });
      }

      return data ?? null;
    }),

  // ===========================================================================
  // List saved weeks (no JSONB, only metrics)
  // ===========================================================================

  list: protectedProcedure
    .input(listSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const limit = input?.limit ?? 52;

      const { data, error } = await supabase
        .from("poker_su_tournament_analyses")
        .select(
          "id, week_year, week_number, week_start, week_end, schedule_tournament_count, schedule_total_gtd_usd, overlay_count, overlay_total_brl, sa_ppst_usd, sa_total_usd, cross_match_count, note, saved_by_id, created_at, updated_at",
        )
        .eq("team_id", teamId)
        .order("week_year", { ascending: false })
        .order("week_number", { ascending: false })
        .limit(limit);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list tournament analyses",
        });
      }

      return data ?? [];
    }),

  // ===========================================================================
  // Delete
  // ===========================================================================

  delete: protectedProcedure
    .input(deleteSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_su_tournament_analyses")
        .delete()
        .eq("team_id", teamId)
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete tournament analysis",
        });
      }

      return { success: true };
    }),
});
