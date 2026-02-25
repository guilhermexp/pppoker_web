import { createAdminClient } from "@api/services/supabase";
import {
  getPaymentOrdersSchema,
  updatePaymentOrderStatusSchema,
} from "../../../schemas/fastchips/payment-orders";
import { createTRPCRouter, protectedProcedure } from "../../init";
import { TRPCError } from "@trpc/server";

export const fastchipsPaymentOrdersRouter = createTRPCRouter({
  /**
   * Lista pedidos de pagamento com paginação e filtros
   */
  list: protectedProcedure
    .input(getPaymentOrdersSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const {
        cursor,
        pageSize = 20,
        status,
        search,
        dateFrom,
        dateTo,
      } = input ?? {};

      let query = supabase
        .from("fastchips_payment_orders")
        .select("*", { count: "exact" })
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(
          `player_nome.ilike.%${search}%,order_nsu.ilike.%${search}%`,
        );
      }

      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
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
        data: (data ?? []).map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          orderNsu: row.order_nsu,
          status: row.status,
          playerUid: row.player_uid,
          playerNome: row.player_nome,
          playerEmail: row.player_email,
          playerTelefone: row.player_telefone,
          fichas: row.fichas,
          valorReais: Number(row.valor_reais),
          checkoutUrl: row.checkout_url,
          slug: row.slug,
          transactionNsu: row.transaction_nsu,
          captureMethod: row.capture_method,
          paidAmount: row.paid_amount ? Number(row.paid_amount) : null,
          installments: row.installments,
          paidAt: row.paid_at,
          fichasEnviadasAt: row.fichas_enviadas_at,
          errorMessage: row.error_message,
        })),
      };
    }),

  /**
   * Estatísticas por status para os cards do dashboard
   */
  getStats: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    // Fetch all fields needed for stats
    const { data: allOrders, error } = await supabase
      .from("fastchips_payment_orders")
      .select(
        "status, valor_reais, fichas, created_at, paid_at, fichas_enviadas_at",
      )
      .eq("team_id", teamId);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    const orders = allOrders ?? [];

    // Use Brazil timezone (UTC-3) for "today" to match user's local date
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    }); // "YYYY-MM-DD"

    function isToday(dateStr: string | null): boolean {
      if (!dateStr) return false;
      // Convert the UTC timestamp to Brazil date
      const d = new Date(dateStr);
      const brDate = d.toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });
      return brDate === today;
    }

    const linkGerado = orders.filter(
      (o) => o.status === "link_gerado",
    ).length;
    const pago = orders.filter((o) => o.status === "pago").length;
    const fichasEnviadas = orders.filter(
      (o) => o.status === "fichas_enviadas",
    ).length;

    // "Concluídos Hoje" = fichas enviadas onde fichas_enviadas_at é hoje
    const fichasEnviadasHoje = orders.filter(
      (o) =>
        o.status === "fichas_enviadas" && isToday(o.fichas_enviadas_at),
    ).length;

    const erro = orders.filter((o) => o.status === "erro").length;
    const cancelado = orders.filter((o) => o.status === "cancelado").length;

    // "Total Vendido Hoje" = soma do valor de pedidos pagos/concluídos hoje (por paid_at)
    const totalVendidoHoje = orders
      .filter(
        (o) =>
          ["pago", "fichas_enviadas"].includes(o.status) &&
          isToday(o.paid_at),
      )
      .reduce((sum, o) => sum + Number(o.valor_reais ?? 0), 0);

    return {
      linkGerado,
      pago,
      fichasEnviadas,
      fichasEnviadasHoje,
      erro,
      cancelado,
      totalVendidoHoje,
      total: orders.length,
    };
  }),

  /**
   * Atualizar status de um pedido manualmente
   */
  updateStatus: protectedProcedure
    .input(updatePaymentOrderStatusSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const updateData: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };

      if (input.status === "fichas_enviadas") {
        updateData.fichas_enviadas_at = new Date().toISOString();
      }

      if (input.errorMessage !== undefined) {
        updateData.error_message = input.errorMessage;
      }

      const { error } = await supabase
        .from("fastchips_payment_orders")
        .update(updateData)
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
});
