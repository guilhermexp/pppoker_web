import {
  getSettlementByIdInput,
  getSettlementStatsInput,
  getSettlementsByPeriodInput,
  listSettlementsInput,
  markSettlementCompletedInput,
  updateSettlementInput,
} from "@api/schemas/su/settlements";
import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const suSettlementsRouter = createTRPCRouter({
  /**
   * List all settlements for the team
   */
  list: protectedProcedure
    .input(listSettlementsInput)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_su_settlements")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (input?.status) {
        query = query.eq("status", input.status);
      }

      if (input?.weekPeriodId) {
        query = query.eq("week_period_id", input.weekPeriodId);
      }

      if (input?.ligaId) {
        query = query.eq("liga_id", input.ligaId);
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
          message: "Erro ao buscar acertos",
        });
      }

      return data ?? [];
    }),

  /**
   * Get a specific settlement by ID
   */
  getById: protectedProcedure
    .input(getSettlementByIdInput)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_su_settlements")
        .select("*")
        .eq("team_id", teamId)
        .eq("id", input.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Acerto nao encontrado",
        });
      }

      return data;
    }),

  /**
   * Get settlements by week period
   */
  getByPeriod: protectedProcedure
    .input(getSettlementsByPeriodInput)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_su_settlements")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_period_id", input.weekPeriodId)
        .order("liga_nome", { ascending: true });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar acertos",
        });
      }

      return data ?? [];
    }),

  /**
   * Get pending settlements count and amount
   */
  getPendingSummary: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("poker_su_settlements")
      .select("id, net_amount, paid_amount")
      .eq("team_id", teamId)
      .in("status", ["pending", "partial"]);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar acertos pendentes",
      });
    }

    const count = data?.length ?? 0;
    const totalAmount =
      data?.reduce((sum, s) => sum + Number(s.net_amount || 0), 0) ?? 0;
    const paidAmount =
      data?.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0) ?? 0;
    const remainingAmount = totalAmount - paidAmount;

    return {
      count,
      totalAmount,
      paidAmount,
      remainingAmount,
    };
  }),

  /**
   * Update a settlement
   */
  update: protectedProcedure
    .input(updateSettlementInput)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get current settlement
      const { data: current, error: currentError } = await supabase
        .from("poker_su_settlements")
        .select("*")
        .eq("team_id", teamId)
        .eq("id", input.id)
        .single();

      if (currentError || !current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Acerto nao encontrado",
        });
      }

      // Calculate new net_amount if adjustment changed
      let netAmount = current.net_amount;
      if (input.adjustmentAmount !== undefined) {
        netAmount = Number(current.gross_amount) + input.adjustmentAmount;
      }

      // Determine status based on paid amount
      let newStatus = input.status ?? current.status;
      if (input.paidAmount !== undefined) {
        if (input.paidAmount >= netAmount) {
          newStatus = "completed";
        } else if (input.paidAmount > 0) {
          newStatus = "partial";
        }
      }

      const { data, error } = await supabase
        .from("poker_su_settlements")
        .update({
          adjustment_amount:
            input.adjustmentAmount ?? current.adjustment_amount,
          net_amount: netAmount,
          paid_amount: input.paidAmount ?? current.paid_amount,
          paid_at:
            input.paidAmount !== undefined && input.paidAmount > 0
              ? new Date().toISOString()
              : current.paid_at,
          status: newStatus,
          note: input.note ?? current.note,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar acerto",
        });
      }

      return data;
    }),

  /**
   * Mark a settlement as completed (fully paid)
   */
  markAsCompleted: protectedProcedure
    .input(markSettlementCompletedInput)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data: current, error: currentError } = await supabase
        .from("poker_su_settlements")
        .select("net_amount")
        .eq("team_id", teamId)
        .eq("id", input.id)
        .single();

      if (currentError || !current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Acerto nao encontrado",
        });
      }

      const { data, error } = await supabase
        .from("poker_su_settlements")
        .update({
          status: "completed",
          paid_amount: current.net_amount,
          paid_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao marcar acerto como concluido",
        });
      }

      return data;
    }),

  /**
   * Get settlement statistics for dashboard
   */
  getStats: protectedProcedure
    .input(getSettlementStatsInput)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_su_settlements")
        .select("*")
        .eq("team_id", teamId);

      if (input?.from) {
        query = query.gte("period_start", input.from);
      }
      if (input?.to) {
        query = query.lte("period_end", input.to);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar estatisticas de acertos",
        });
      }

      const settlements = data ?? [];

      const pending = settlements.filter((s) => s.status === "pending");
      const partial = settlements.filter((s) => s.status === "partial");
      const completed = settlements.filter((s) => s.status === "completed");

      return {
        total: settlements.length,
        pendingCount: pending.length,
        partialCount: partial.length,
        completedCount: completed.length,
        totalGrossAmount: settlements.reduce(
          (sum, s) => sum + Number(s.gross_amount || 0),
          0,
        ),
        totalNetAmount: settlements.reduce(
          (sum, s) => sum + Number(s.net_amount || 0),
          0,
        ),
        totalPaidAmount: settlements.reduce(
          (sum, s) => sum + Number(s.paid_amount || 0),
          0,
        ),
        pendingAmount: pending.reduce(
          (sum, s) =>
            sum + Number(s.net_amount || 0) - Number(s.paid_amount || 0),
          0,
        ),
      };
    }),
});
