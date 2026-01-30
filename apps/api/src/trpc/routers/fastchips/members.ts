import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import {
  getFastchipsMemberByIdSchema,
  getFastchipsMembersSchema,
  linkToPokerPlayerSchema,
  unlinkFromPokerPlayerSchema,
} from "../../../schemas/fastchips/members";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const fastchipsMembersRouter = createTRPCRouter({
  /**
   * Get members with pagination and filters
   */
  list: protectedProcedure
    .input(getFastchipsMembersSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { cursor, pageSize = 20, status, search } = input ?? {};

      let query = supabase
        .from("fastchips_members")
        .select(
          `
          *,
          pokerPlayer:poker_players!fastchips_members_poker_player_id_fkey(id, nickname, pppoker_id)
        `,
          { count: "exact" },
        )
        .eq("team_id", teamId)
        .order("name", { ascending: true });

      if (status) {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,pppoker_id.ilike.%${search}%`);
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
        data: (data ?? []).map((member) => ({
          id: member.id,
          createdAt: member.created_at,
          updatedAt: member.updated_at,
          name: member.name,
          ppPokerId: member.pppoker_id,
          pokerPlayerId: member.poker_player_id,
          status: member.status,
          restriction: member.restriction,
          linkedAt: member.linked_at,
          totalLinkedAccounts: member.total_linked_accounts ?? 0,
          note: member.note,
          pokerPlayer: member.pokerPlayer,
        })),
      };
    }),

  /**
   * Get a single member by ID with linked accounts
   */
  getById: protectedProcedure
    .input(getFastchipsMemberByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("fastchips_members")
        .select(
          `
          *,
          pokerPlayer:poker_players!fastchips_members_poker_player_id_fkey(id, nickname, pppoker_id, type, status),
          linkedAccounts:fastchips_linked_accounts(*)
        `,
        )
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      // Get operation stats for this member
      const { data: operations } = await supabase
        .from("fastchips_operations")
        .select("operation_type, gross_amount, net_amount")
        .eq("member_id", input.id)
        .eq("team_id", teamId);

      const stats = {
        totalOperations: operations?.length ?? 0,
        totalEntries:
          operations?.filter((op) => op.operation_type === "entrada").length ??
          0,
        totalExits:
          operations?.filter((op) => op.operation_type === "saida").length ?? 0,
        grossEntryTotal:
          operations
            ?.filter((op) => op.operation_type === "entrada")
            .reduce((sum, op) => sum + Number(op.gross_amount ?? 0), 0) ?? 0,
        grossExitTotal:
          operations
            ?.filter((op) => op.operation_type === "saida")
            .reduce((sum, op) => sum + Number(op.gross_amount ?? 0), 0) ?? 0,
      };

      return {
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        name: data.name,
        ppPokerId: data.pppoker_id,
        pokerPlayerId: data.poker_player_id,
        status: data.status,
        restriction: data.restriction,
        linkedAt: data.linked_at,
        totalLinkedAccounts: data.total_linked_accounts ?? 0,
        note: data.note,
        pokerPlayer: data.pokerPlayer,
        linkedAccounts: (data.linkedAccounts ?? []).map((acc: any) => ({
          id: acc.id,
          name: acc.name,
          phone: acc.phone,
          linkedAt: acc.linked_at,
          status: acc.status,
          restriction: acc.restriction,
        })),
        stats,
      };
    }),

  /**
   * Link a Fastchips member to a Poker player
   */
  linkToPokerPlayer: protectedProcedure
    .input(linkToPokerPlayerSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Verify the poker player exists and belongs to the team
      const { data: pokerPlayer, error: playerError } = await supabase
        .from("poker_players")
        .select("id, pppoker_id")
        .eq("id", input.pokerPlayerId)
        .eq("team_id", teamId)
        .single();

      if (playerError || !pokerPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poker player not found",
        });
      }

      // Update the member with the poker player link
      const { error: updateError } = await supabase
        .from("fastchips_members")
        .update({
          poker_player_id: input.pokerPlayerId,
          pppoker_id: pokerPlayer.pppoker_id,
          linked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.memberId)
        .eq("team_id", teamId);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      return { success: true };
    }),

  /**
   * Unlink a Fastchips member from a Poker player
   */
  unlinkFromPokerPlayer: protectedProcedure
    .input(unlinkFromPokerPlayerSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("fastchips_members")
        .update({
          poker_player_id: null,
          linked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.memberId)
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
