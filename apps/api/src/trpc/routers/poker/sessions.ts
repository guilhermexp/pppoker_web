import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import {
  deletePokerSessionSchema,
  getPokerSessionByIdSchema,
  getPokerSessionsSchema,
  upsertPokerSessionSchema,
} from "../../../schemas/poker/sessions";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const pokerSessionsRouter = createTRPCRouter({
  /**
   * Get poker sessions with pagination and filtering
   */
  get: protectedProcedure
    .input(getPokerSessionsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const {
        cursor,
        pageSize = 50,
        sort,
        q,
        sessionType,
        gameVariant,
        dateFrom,
        dateTo,
      } = input ?? {};

      // Build query
      let query = supabase
        .from("poker_sessions")
        .select(
          `
          *,
          created_by:poker_players!poker_sessions_created_by_id_fkey(id, nickname, memo_name)
        `,
          { count: "exact" },
        )
        .eq("team_id", teamId);

      // Apply filters
      if (q) {
        query = query.or(
          `table_name.ilike.%${q}%,external_id.ilike.%${q}%`,
        );
      }

      if (sessionType) {
        query = query.eq("session_type", sessionType);
      }

      if (gameVariant) {
        query = query.eq("game_variant", gameVariant);
      }

      if (dateFrom) {
        query = query.gte("started_at", dateFrom);
      }

      if (dateTo) {
        query = query.lte("started_at", dateTo);
      }

      // Apply sorting
      const sortColumn = sort?.[0] ?? "started_at";
      const sortOrder = sort?.[1] === "asc";
      query = query.order(sortColumn, { ascending: sortOrder });

      // Apply pagination
      const currentCursor = cursor ? Number.parseInt(cursor, 10) : 0;
      const offset = currentCursor * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.log("[pokerSessions.get] Supabase error:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const hasNextPage = offset + pageSize < (count ?? 0);
      const nextCursor = hasNextPage ? String(currentCursor + 1) : null;

      // Transform snake_case to camelCase
      const transformedData = (data ?? []).map((session) => ({
        id: session.id,
        createdAt: session.created_at,
        externalId: session.external_id,
        tableName: session.table_name,
        sessionType: session.session_type,
        gameVariant: session.game_variant,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        blinds: session.blinds,
        buyInAmount: session.buy_in_amount,
        guaranteedPrize: session.guaranteed_prize,
        totalRake: session.total_rake ?? 0,
        totalBuyIn: session.total_buy_in ?? 0,
        totalCashOut: session.total_cash_out ?? 0,
        playerCount: session.player_count ?? 0,
        handsPlayed: session.hands_played ?? 0,
        createdBy: session.created_by
          ? {
              id: session.created_by.id,
              nickname: session.created_by.nickname,
              memoName: session.created_by.memo_name,
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
   * Get a single poker session by ID
   */
  getById: protectedProcedure
    .input(getPokerSessionByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_sessions")
        .select(
          `
          *,
          created_by:poker_players!poker_sessions_created_by_id_fkey(id, nickname, memo_name),
          session_players:poker_session_players(
            id,
            player:poker_players(id, nickname, memo_name, pppoker_id),
            ranking,
            buy_in_chips,
            buy_in_ticket,
            cash_out,
            winnings,
            rake,
            rake_ppst,
            rake_ppsr
          )
        `,
        )
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
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
        tableName: data.table_name,
        sessionType: data.session_type,
        gameVariant: data.game_variant,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        blinds: data.blinds,
        buyInAmount: data.buy_in_amount,
        guaranteedPrize: data.guaranteed_prize,
        totalRake: data.total_rake ?? 0,
        totalBuyIn: data.total_buy_in ?? 0,
        totalCashOut: data.total_cash_out ?? 0,
        playerCount: data.player_count ?? 0,
        handsPlayed: data.hands_played ?? 0,
        rawData: data.raw_data,
        createdBy: data.created_by
          ? {
              id: data.created_by.id,
              nickname: data.created_by.nickname,
              memoName: data.created_by.memo_name,
            }
          : null,
        sessionPlayers: (data.session_players ?? []).map((sp: any) => ({
          id: sp.id,
          player: sp.player
            ? {
                id: sp.player.id,
                nickname: sp.player.nickname,
                memoName: sp.player.memo_name,
                ppPokerId: sp.player.pppoker_id,
              }
            : null,
          ranking: sp.ranking,
          buyInChips: sp.buy_in_chips ?? 0,
          buyInTicket: sp.buy_in_ticket ?? 0,
          cashOut: sp.cash_out ?? 0,
          winnings: sp.winnings ?? 0,
          rake: sp.rake ?? 0,
          rakePpst: sp.rake_ppst ?? 0,
          rakePpsr: sp.rake_ppsr ?? 0,
        })),
      };
    }),

  /**
   * Create or update a poker session
   */
  upsert: protectedProcedure
    .input(upsertPokerSessionSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const payload = {
        team_id: teamId,
        external_id: input.externalId ?? null,
        table_name: input.tableName ?? null,
        session_type: input.sessionType ?? "cash_game",
        game_variant: input.gameVariant ?? "nlh",
        started_at: input.startedAt,
        ended_at: input.endedAt ?? null,
        blinds: input.blinds ?? null,
        buy_in_amount: input.buyInAmount ?? null,
        guaranteed_prize: input.guaranteedPrize ?? null,
        total_rake: input.totalRake ?? 0,
        total_buy_in: input.totalBuyIn ?? 0,
        total_cash_out: input.totalCashOut ?? 0,
        player_count: input.playerCount ?? 0,
        hands_played: input.handsPlayed ?? 0,
        created_by_id: input.createdById ?? null,
        raw_data: input.rawData ?? null,
      };

      if (input.id) {
        // Update existing session
        const { data, error } = await supabase
          .from("poker_sessions")
          .update(payload)
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

        return { id: data.id };
      }

      // Create new session
      const { data, error } = await supabase
        .from("poker_sessions")
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A session with this external ID already exists",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { id: data.id };
    }),

  /**
   * Delete a poker session
   */
  delete: protectedProcedure
    .input(deletePokerSessionSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_sessions")
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
   * Get session statistics (for dashboard widgets)
   */
  getStats: protectedProcedure
    .input(
      getPokerSessionsSchema
        .pick({ dateFrom: true, dateTo: true, sessionType: true, gameVariant: true })
        .optional()
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_sessions")
        .select("session_type, game_variant, total_rake, total_buy_in, player_count, hands_played, guaranteed_prize, raw_data")
        .eq("team_id", teamId);

      if (input?.dateFrom) {
        query = query.gte("started_at", input.dateFrom);
      }

      if (input?.dateTo) {
        query = query.lte("started_at", input.dateTo);
      }

      if (input?.sessionType) {
        query = query.eq("session_type", input.sessionType);
      }

      if (input?.gameVariant) {
        query = query.eq("game_variant", input.gameVariant);
      }

      const { data: sessions, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const stats = {
        totalSessions: sessions?.length ?? 0,
        totalRake: 0,
        totalBuyIn: 0,
        totalPlayers: 0,
        totalHandsPlayed: 0,
        totalGtd: 0,
        byType: {} as Record<string, { count: number; rake: number; buyIn: number }>,
        byVariant: {} as Record<string, { count: number; rake: number }>,
        byOrganizer: {} as Record<string, { count: number; rake: number }>,
      };

      for (const session of sessions ?? []) {
        stats.totalRake += session.total_rake ?? 0;
        stats.totalBuyIn += session.total_buy_in ?? 0;
        stats.totalPlayers += session.player_count ?? 0;
        stats.totalHandsPlayed += session.hands_played ?? 0;
        stats.totalGtd += session.guaranteed_prize ?? 0;

        const type = session.session_type ?? "unknown";
        if (!stats.byType[type]) {
          stats.byType[type] = { count: 0, rake: 0, buyIn: 0 };
        }
        stats.byType[type].count++;
        stats.byType[type].rake += session.total_rake ?? 0;
        stats.byType[type].buyIn += session.total_buy_in ?? 0;

        const variant = session.game_variant ?? "unknown";
        if (!stats.byVariant[variant]) {
          stats.byVariant[variant] = { count: 0, rake: 0 };
        }
        stats.byVariant[variant].count++;
        stats.byVariant[variant].rake += session.total_rake ?? 0;

        // Extract organizer from raw_data if available
        const rawData = session.raw_data as any;
        const organizer = rawData?.organizer ?? "unknown";
        if (!stats.byOrganizer[organizer]) {
          stats.byOrganizer[organizer] = { count: 0, rake: 0 };
        }
        stats.byOrganizer[organizer].count++;
        stats.byOrganizer[organizer].rake += session.total_rake ?? 0;
      }

      // Get unique player count
      const { data: uniquePlayers } = await supabase
        .from("poker_session_players")
        .select("player_id")
        .eq("team_id", teamId);

      const uniquePlayerIds = new Set((uniquePlayers ?? []).map((p) => p.player_id));
      const uniquePlayerCount = uniquePlayerIds.size;

      return {
        ...stats,
        uniquePlayerCount,
      };
    }),
});
