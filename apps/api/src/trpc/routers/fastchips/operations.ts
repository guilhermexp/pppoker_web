import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import {
  getFastchipsOperationByIdSchema,
  getFastchipsOperationsSchema,
  getFastchipsOperationStatsSchema,
} from "../../../schemas/fastchips/operations";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const fastchipsOperationsRouter = createTRPCRouter({
  /**
   * Get operations with pagination and filters
   */
  list: protectedProcedure
    .input(getFastchipsOperationsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const {
        cursor,
        pageSize = 20,
        operationType,
        purpose,
        memberId,
        dateFrom,
        dateTo,
        search,
      } = input ?? {};

      let query = supabase
        .from("fastchips_operations")
        .select(
          `
          *,
          member:fastchips_members!fastchips_operations_member_id_fkey(id, name, pppoker_id)
        `,
          { count: "exact" },
        )
        .eq("team_id", teamId)
        .order("occurred_at", { ascending: false });

      // Map UI operation type to database enum
      if (operationType) {
        const dbOperationType =
          operationType === "Entrada" ? "entrada" : "saida";
        query = query.eq("operation_type", dbOperationType);
      }

      // Map UI purpose to database enum
      if (purpose) {
        const purposeMapping: Record<string, string> = {
          Recebimento: "recebimento",
          Pagamento: "pagamento",
          Saque: "saque",
          Serviço: "servico",
        };
        query = query.eq("purpose", purposeMapping[purpose] ?? purpose);
      }

      if (memberId) {
        query = query.eq("member_id", memberId);
      }

      if (dateFrom) {
        query = query.gte("occurred_at", dateFrom);
      }

      if (dateTo) {
        query = query.lte("occurred_at", dateTo);
      }

      if (search) {
        query = query.or(
          `member_name.ilike.%${search}%,pppoker_id.ilike.%${search}%,external_id.ilike.%${search}%`,
        );
      }

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

      return {
        meta: {
          cursor: hasNextPage ? String(currentCursor + 1) : null,
          hasPreviousPage: currentCursor > 0,
          hasNextPage,
          totalCount: count ?? 0,
        },
        data: (data ?? []).map((op) => ({
          id: op.id,
          createdAt: op.created_at,
          externalId: op.external_id,
          paymentId: op.payment_id,
          occurredAt: op.occurred_at,
          operationType: op.operation_type === "entrada" ? "Entrada" : "Saída",
          purpose: {
            recebimento: "Recebimento",
            pagamento: "Pagamento",
            saque: "Saque",
            servico: "Serviço",
          }[op.purpose as string],
          memberId: op.member_id,
          memberName: op.member_name,
          ppPokerId: op.pppoker_id,
          grossAmount: op.gross_amount,
          netAmount: op.net_amount,
          feeRate: op.fee_rate,
          feeAmount: op.fee_amount,
          member: op.member,
        })),
      };
    }),

  /**
   * Get a single operation by ID
   */
  getById: protectedProcedure
    .input(getFastchipsOperationByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("fastchips_operations")
        .select(
          `
          *,
          member:fastchips_members!fastchips_operations_member_id_fkey(id, name, pppoker_id, status),
          import:fastchips_imports!fastchips_operations_import_id_fkey(id, file_name, created_at)
        `,
        )
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Operation not found",
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
        externalId: data.external_id,
        paymentId: data.payment_id,
        occurredAt: data.occurred_at,
        operationType: data.operation_type === "entrada" ? "Entrada" : "Saída",
        purpose: {
          recebimento: "Recebimento",
          pagamento: "Pagamento",
          saque: "Saque",
          servico: "Serviço",
        }[data.purpose as string],
        memberId: data.member_id,
        memberName: data.member_name,
        ppPokerId: data.pppoker_id,
        grossAmount: data.gross_amount,
        netAmount: data.net_amount,
        feeRate: data.fee_rate,
        feeAmount: data.fee_amount,
        member: data.member,
        import: data.import,
      };
    }),

  /**
   * Get aggregated statistics for operations
   */
  getStats: protectedProcedure
    .input(getFastchipsOperationStatsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { dateFrom, dateTo, memberId } = input ?? {};

      let query = supabase
        .from("fastchips_operations")
        .select("operation_type, purpose, gross_amount, net_amount, fee_amount")
        .eq("team_id", teamId);

      if (memberId) {
        query = query.eq("member_id", memberId);
      }

      if (dateFrom) {
        query = query.gte("occurred_at", dateFrom);
      }

      if (dateTo) {
        query = query.lte("occurred_at", dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const operations = data ?? [];

      // Calculate totals
      const entries = operations.filter(
        (op) => op.operation_type === "entrada",
      );
      const exits = operations.filter((op) => op.operation_type === "saida");

      const totalEntries = entries.length;
      const totalExits = exits.length;

      const grossEntryTotal = entries.reduce(
        (sum, op) => sum + Number(op.gross_amount ?? 0),
        0,
      );
      const grossExitTotal = exits.reduce(
        (sum, op) => sum + Number(op.gross_amount ?? 0),
        0,
      );
      const netEntryTotal = entries.reduce(
        (sum, op) => sum + Number(op.net_amount ?? 0),
        0,
      );
      const netExitTotal = exits.reduce(
        (sum, op) => sum + Number(op.net_amount ?? 0),
        0,
      );
      const totalFees = operations.reduce(
        (sum, op) => sum + Number(op.fee_amount ?? 0),
        0,
      );

      // Calculate by purpose
      const byPurpose = {
        recebimento: {
          count: operations.filter((op) => op.purpose === "recebimento").length,
          grossTotal: operations
            .filter((op) => op.purpose === "recebimento")
            .reduce((sum, op) => sum + Number(op.gross_amount ?? 0), 0),
        },
        pagamento: {
          count: operations.filter((op) => op.purpose === "pagamento").length,
          grossTotal: operations
            .filter((op) => op.purpose === "pagamento")
            .reduce((sum, op) => sum + Number(op.gross_amount ?? 0), 0),
        },
        saque: {
          count: operations.filter((op) => op.purpose === "saque").length,
          grossTotal: operations
            .filter((op) => op.purpose === "saque")
            .reduce((sum, op) => sum + Number(op.gross_amount ?? 0), 0),
        },
        servico: {
          count: operations.filter((op) => op.purpose === "servico").length,
          grossTotal: operations
            .filter((op) => op.purpose === "servico")
            .reduce((sum, op) => sum + Number(op.gross_amount ?? 0), 0),
        },
      };

      return {
        totalOperations: operations.length,
        totalEntries,
        totalExits,
        grossEntryTotal,
        grossExitTotal,
        netEntryTotal,
        netExitTotal,
        totalFees,
        balance: grossEntryTotal - grossExitTotal,
        netBalance: netEntryTotal - netExitTotal,
        byPurpose,
      };
    }),
});
