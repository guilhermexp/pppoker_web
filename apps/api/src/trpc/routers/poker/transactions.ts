import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import {
  deletePokerTransactionSchema,
  getPokerTransactionByIdSchema,
  getPokerTransactionsSchema,
} from "../../../schemas/poker/transactions";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const pokerTransactionsRouter = createTRPCRouter({
  /**
   * Get poker transactions with pagination and filtering
   */
  get: protectedProcedure
    .input(getPokerTransactionsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const {
        cursor,
        pageSize = 50,
        sort,
        q,
        type,
        playerId,
        sessionId,
        clubId,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
      } = input ?? {};

      // Build query with joins to get player info
      let query = supabase
        .from("poker_chip_transactions")
        .select(
          `
          *,
          sender:poker_players!poker_chip_transactions_sender_player_id_fkey(id, nickname, memo_name, pppoker_id),
          recipient:poker_players!poker_chip_transactions_recipient_player_id_fkey(id, nickname, memo_name, pppoker_id),
          session:poker_sessions!poker_chip_transactions_session_id_fkey(id, table_name, session_type)
        `,
          { count: "exact" }
        )
        .eq("team_id", teamId);

      // Apply filters
      if (q) {
        // Search in sender or recipient nickname/memo
        query = query.or(
          `sender.nickname.ilike.%${q}%,sender.memo_name.ilike.%${q}%,recipient.nickname.ilike.%${q}%,recipient.memo_name.ilike.%${q}%`
        );
      }

      if (type) {
        query = query.eq("type", type);
      }

      if (playerId) {
        query = query.or(
          `sender_player_id.eq.${playerId},recipient_player_id.eq.${playerId}`
        );
      }

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      if (clubId) {
        query = query.eq("sender_club_id", clubId);
      }

      if (dateFrom) {
        query = query.gte("occurred_at", dateFrom);
      }

      if (dateTo) {
        query = query.lte("occurred_at", dateTo);
      }

      if (amountMin !== null && amountMin !== undefined) {
        query = query.gte("amount", amountMin);
      }

      if (amountMax !== null && amountMax !== undefined) {
        query = query.lte("amount", amountMax);
      }

      // Apply sorting
      const sortColumn = sort?.[0] ?? "occurred_at";
      const sortOrder = sort?.[1] === "asc";
      query = query.order(sortColumn, { ascending: sortOrder });

      // Apply pagination
      const currentCursor = cursor ? Number.parseInt(cursor, 10) : 0;
      const offset = currentCursor * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.log("[pokerTransactions.get] Supabase error:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const hasNextPage = offset + pageSize < (count ?? 0);
      const nextCursor = hasNextPage ? String(currentCursor + 1) : null;

      // Transform snake_case to camelCase
      const transformedData = (data ?? []).map((tx) => ({
        id: tx.id,
        createdAt: tx.created_at,
        occurredAt: tx.occurred_at,
        type: tx.type,
        senderClubId: tx.sender_club_id,
        sender: tx.sender
          ? {
              id: tx.sender.id,
              nickname: tx.sender.nickname,
              memoName: tx.sender.memo_name,
              ppPokerId: tx.sender.pppoker_id,
            }
          : null,
        recipient: tx.recipient
          ? {
              id: tx.recipient.id,
              nickname: tx.recipient.nickname,
              memoName: tx.recipient.memo_name,
              ppPokerId: tx.recipient.pppoker_id,
            }
          : null,
        session: tx.session
          ? {
              id: tx.session.id,
              tableName: tx.session.table_name,
              sessionType: tx.session.session_type,
            }
          : null,
        creditSent: tx.credit_sent ?? 0,
        creditRedeemed: tx.credit_redeemed ?? 0,
        creditLeftClub: tx.credit_left_club ?? 0,
        chipsSent: tx.chips_sent ?? 0,
        chipsPpsr: tx.chips_ppsr ?? 0,
        chipsRing: tx.chips_ring ?? 0,
        chipsCustomRing: tx.chips_custom_ring ?? 0,
        chipsMtt: tx.chips_mtt ?? 0,
        chipsRedeemed: tx.chips_redeemed ?? 0,
        amount: tx.amount ?? 0,
        note: tx.note,
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
   * Get a single transaction by ID
   */
  getById: protectedProcedure
    .input(getPokerTransactionByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_chip_transactions")
        .select(
          `
          *,
          sender:poker_players!poker_chip_transactions_sender_player_id_fkey(id, nickname, memo_name, pppoker_id),
          recipient:poker_players!poker_chip_transactions_recipient_player_id_fkey(id, nickname, memo_name, pppoker_id),
          session:poker_sessions!poker_chip_transactions_session_id_fkey(id, table_name, session_type, started_at)
        `
        )
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transaction not found",
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
        occurredAt: data.occurred_at,
        type: data.type,
        senderClubId: data.sender_club_id,
        sender: data.sender
          ? {
              id: data.sender.id,
              nickname: data.sender.nickname,
              memoName: data.sender.memo_name,
              ppPokerId: data.sender.pppoker_id,
            }
          : null,
        recipient: data.recipient
          ? {
              id: data.recipient.id,
              nickname: data.recipient.nickname,
              memoName: data.recipient.memo_name,
              ppPokerId: data.recipient.pppoker_id,
            }
          : null,
        session: data.session
          ? {
              id: data.session.id,
              tableName: data.session.table_name,
              sessionType: data.session.session_type,
              startedAt: data.session.started_at,
            }
          : null,
        creditSent: data.credit_sent ?? 0,
        creditRedeemed: data.credit_redeemed ?? 0,
        creditLeftClub: data.credit_left_club ?? 0,
        chipsSent: data.chips_sent ?? 0,
        chipsPpsr: data.chips_ppsr ?? 0,
        chipsRing: data.chips_ring ?? 0,
        chipsCustomRing: data.chips_custom_ring ?? 0,
        chipsMtt: data.chips_mtt ?? 0,
        chipsRedeemed: data.chips_redeemed ?? 0,
        amount: data.amount ?? 0,
        note: data.note,
        rawData: data.raw_data,
      };
    }),

  /**
   * Get transaction statistics
   */
  getStats: protectedProcedure
    .input(
      getPokerTransactionsSchema
        .pick({ dateFrom: true, dateTo: true, playerId: true })
        .optional()
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_chip_transactions")
        .select("type, credit_sent, credit_redeemed, chips_sent, chips_redeemed, amount")
        .eq("team_id", teamId);

      if (input?.dateFrom) {
        query = query.gte("occurred_at", input.dateFrom);
      }

      if (input?.dateTo) {
        query = query.lte("occurred_at", input.dateTo);
      }

      if (input?.playerId) {
        query = query.or(
          `sender_player_id.eq.${input.playerId},recipient_player_id.eq.${input.playerId}`
        );
      }

      const { data: transactions, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const stats = {
        totalTransactions: transactions?.length ?? 0,
        totalCreditSent: 0,
        totalCreditRedeemed: 0,
        totalChipsSent: 0,
        totalChipsRedeemed: 0,
        netAmount: 0,
        byType: {} as Record<string, { count: number; amount: number }>,
      };

      for (const tx of transactions ?? []) {
        stats.totalCreditSent += tx.credit_sent ?? 0;
        stats.totalCreditRedeemed += tx.credit_redeemed ?? 0;
        stats.totalChipsSent += tx.chips_sent ?? 0;
        stats.totalChipsRedeemed += tx.chips_redeemed ?? 0;
        stats.netAmount += tx.amount ?? 0;

        const type = tx.type ?? "unknown";
        if (!stats.byType[type]) {
          stats.byType[type] = { count: 0, amount: 0 };
        }
        stats.byType[type].count += 1;
        stats.byType[type].amount += tx.amount ?? 0;
      }

      return stats;
    }),

  /**
   * Delete a transaction
   */
  delete: protectedProcedure
    .input(deletePokerTransactionSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_chip_transactions")
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
});
