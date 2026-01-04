import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createPokerSettlementSchema,
  deletePokerSettlementSchema,
  getPokerSettlementByIdSchema,
  getPokerSettlementsSchema,
  markSettlementPaidSchema,
  updatePokerSettlementStatusSchema,
} from "../../../schemas/poker/settlements";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const pokerSettlementsRouter = createTRPCRouter({
  /**
   * Get poker settlements with pagination and filtering
   */
  get: protectedProcedure
    .input(getPokerSettlementsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const {
        cursor,
        pageSize = 50,
        sort,
        status,
        playerId,
        agentId,
        periodStart,
        periodEnd,
      } = input ?? {};

      // Build query
      let query = supabase
        .from("poker_settlements")
        .select(
          `
          *,
          player:poker_players!poker_settlements_player_id_fkey(id, nickname, memo_name, rakeback_percentage),
          agent:poker_players!poker_settlements_agent_id_fkey(id, nickname, memo_name, rakeback_percentage)
        `,
          { count: "exact" },
        )
        .eq("team_id", teamId);

      // Apply filters
      if (status) {
        query = query.eq("status", status);
      }

      if (playerId) {
        query = query.eq("player_id", playerId);
      }

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      if (periodStart) {
        query = query.gte("period_start", periodStart);
      }

      if (periodEnd) {
        query = query.lte("period_end", periodEnd);
      }

      // Apply sorting
      const sortColumn = sort?.[0] ?? "created_at";
      const sortOrder = sort?.[1] === "asc";
      query = query.order(sortColumn, { ascending: sortOrder });

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

      // Transform snake_case to camelCase
      const transformedData = (data ?? []).map((settlement) => ({
        id: settlement.id,
        createdAt: settlement.created_at,
        updatedAt: settlement.updated_at,
        periodStart: settlement.period_start,
        periodEnd: settlement.period_end,
        status: settlement.status,
        grossAmount: settlement.gross_amount,
        rakebackAmount: settlement.rakeback_amount ?? 0,
        rakebackPercentUsed: settlement.rakeback_percent_used ?? null,
        commissionAmount: settlement.commission_amount ?? 0,
        adjustmentAmount: settlement.adjustment_amount ?? 0,
        netAmount: settlement.net_amount,
        paidAmount: settlement.paid_amount ?? 0,
        paidAt: settlement.paid_at,
        note: settlement.note,
        player: settlement.player
          ? {
              id: settlement.player.id,
              nickname: settlement.player.nickname,
              memoName: settlement.player.memo_name,
              rakebackPercent: settlement.player.rakeback_percentage ?? 0,
            }
          : null,
        agent: settlement.agent
          ? {
              id: settlement.agent.id,
              nickname: settlement.agent.nickname,
              memoName: settlement.agent.memo_name,
              rakebackPercent: settlement.agent.rakeback_percentage ?? 0,
            }
          : null,
      }));

      return {
        meta: {
          cursor: nextCursor,
          hasPreviousPage: currentCursor > 0,
          hasNextPage,
          totalCount: count ?? 0,
        },
        data: transformedData,
      };
    }),

  /**
   * Get a single settlement by ID
   */
  getById: protectedProcedure
    .input(getPokerSettlementByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_settlements")
        .select(
          `
          *,
          player:poker_players!poker_settlements_player_id_fkey(id, nickname, memo_name, pppoker_id, rakeback_percentage),
          agent:poker_players!poker_settlements_agent_id_fkey(id, nickname, memo_name, pppoker_id, rakeback_percentage)
        `,
        )
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Settlement not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return {
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        status: data.status,
        grossAmount: data.gross_amount,
        rakebackAmount: data.rakeback_amount ?? 0,
        rakebackPercentUsed: data.rakeback_percent_used ?? null,
        commissionAmount: data.commission_amount ?? 0,
        adjustmentAmount: data.adjustment_amount ?? 0,
        netAmount: data.net_amount,
        paidAmount: data.paid_amount ?? 0,
        paidAt: data.paid_at,
        note: data.note,
        player: data.player
          ? {
              id: data.player.id,
              nickname: data.player.nickname,
              memoName: data.player.memo_name,
              ppPokerId: data.player.pppoker_id,
              rakebackPercent: data.player.rakeback_percentage ?? 0,
            }
          : null,
        agent: data.agent
          ? {
              id: data.agent.id,
              nickname: data.agent.nickname,
              memoName: data.agent.memo_name,
              ppPokerId: data.agent.pppoker_id,
              rakebackPercent: data.agent.rakeback_percentage ?? 0,
            }
          : null,
      };
    }),

  /**
   * Create a new settlement
   */
  create: protectedProcedure
    .input(createPokerSettlementSchema)
    .mutation(async ({ input, ctx: { teamId, userId } }) => {
      const supabase = await createAdminClient();

      const payload = {
        team_id: teamId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        player_id: input.playerId ?? null,
        agent_id: input.agentId ?? null,
        gross_amount: input.grossAmount,
        rakeback_amount: input.rakebackAmount ?? 0,
        commission_amount: input.commissionAmount ?? 0,
        adjustment_amount: input.adjustmentAmount ?? 0,
        net_amount: input.netAmount,
        created_by_id: userId,
        note: input.note ?? null,
      };

      const { data, error } = await supabase
        .from("poker_settlements")
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { id: data.id };
    }),

  /**
   * Update settlement status
   */
  updateStatus: protectedProcedure
    .input(updatePokerSettlementStatusSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_settlements")
        .update({
          status: input.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { id: data.id, status: data.status };
    }),

  /**
   * Mark settlement as paid
   */
  markPaid: protectedProcedure
    .input(markSettlementPaidSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_settlements")
        .update({
          paid_amount: input.paidAmount,
          paid_at: input.paidAt ?? new Date().toISOString(),
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { id: data.id, status: data.status };
    }),

  /**
   * Delete a settlement
   */
  delete: protectedProcedure
    .input(deletePokerSettlementSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_settlements")
        .delete()
        .eq("id", input.id)
        .eq("team_id", teamId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),

  /**
   * Get settlement statistics
   */
  getStats: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: settlements, error } = await supabase
      .from("poker_settlements")
      .select("status, gross_amount, net_amount, paid_amount")
      .eq("team_id", teamId);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    const stats = {
      total: settlements?.length ?? 0,
      pending: 0,
      completed: 0,
      totalGross: 0,
      totalNet: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    for (const s of settlements ?? []) {
      stats.totalGross += s.gross_amount ?? 0;
      stats.totalNet += s.net_amount ?? 0;
      stats.totalPaid += s.paid_amount ?? 0;

      if (s.status === "pending" || s.status === "partial") {
        stats.pending++;
        stats.totalPending += (s.net_amount ?? 0) - (s.paid_amount ?? 0);
      } else if (s.status === "completed") {
        stats.completed++;
      }
    }

    return stats;
  }),

  /**
   * Close the current week - creates settlements for all players with non-zero balances
   */
  closeWeek: protectedProcedure
    .input(
      z
        .object({
          periodStart: z.string().optional(),
          periodEnd: z.string().optional(),
          note: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ input, ctx: { teamId, userId } }) => {
      const supabase = await createAdminClient();

      // Calculate period (default: last 7 days ending today)
      const now = new Date();
      const periodEnd = input?.periodEnd ?? now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const periodStart =
        input?.periodStart ?? weekAgo.toISOString().split("T")[0];

      // Get all players with non-zero chip balance
      const { data: players, error: playersError } = await supabase
        .from("poker_players")
        .select("id, nickname, chip_balance, agent_id, rakeback_percentage")
        .eq("team_id", teamId)
        .eq("status", "active")
        .neq("chip_balance", 0);

      if (playersError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: playersError.message,
        });
      }

      if (!players || players.length === 0) {
        return {
          success: true,
          settlementsCreated: 0,
          message: "No players with outstanding balances",
        };
      }

      // Create settlements for each player
      const settlements = players.map((player) => {
        const grossAmount = player.chip_balance ?? 0;
        const rakebackAmount =
          grossAmount > 0
            ? (grossAmount * (player.rakeback_percentage ?? 0)) / 100
            : 0;
        const netAmount = grossAmount - rakebackAmount;

        return {
          team_id: teamId,
          period_start: periodStart,
          period_end: periodEnd,
          player_id: player.id,
          agent_id: player.agent_id,
          gross_amount: grossAmount,
          rakeback_amount: rakebackAmount,
          commission_amount: 0,
          adjustment_amount: 0,
          net_amount: netAmount,
          created_by_id: userId,
          note: input?.note ?? `Week closing: ${periodStart} to ${periodEnd}`,
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

      // Reset chip balances to zero for all players with settlements
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

      return {
        success: true,
        settlementsCreated: createdSettlements?.length ?? 0,
        periodStart,
        periodEnd,
      };
    }),
});
