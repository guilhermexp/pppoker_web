import { createAdminClient } from "@api/services/supabase";
import { logger } from "@midpoker/logger";
import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import {
  createCreditRequestSchema,
  createMemberRequestSchema,
  getMembersListSchema,
  listCreditRequestsSchema,
  listPendingMembersSchema,
  reviewCreditSchema,
  reviewMemberSchema,
} from "../../../schemas/poker/members";
import { createTRPCRouter, protectedProcedure } from "../../init";

const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:8000";

async function getBridgeCredentials(teamId: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("pppoker_club_connections")
    .select("club_id, pppoker_username, pppoker_password")
    .eq("team_id", teamId)
    .in("sync_status", ["active", "error"])
    .limit(1)
    .single();

  if (!data) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nenhuma conexao PPPoker encontrada. Faca login novamente.",
    });
  }

  return data;
}

const liveMemberSchema = z
  .object({
    uid: z.number(),
    nome: z.string(),
    papel_num: z.number(),
    papel: z.string(),
    avatar_url: z.string().optional().default(""),
    join_ts: z.number(),
    last_active_ts: z.number(),
    titulo: z.string().optional().default(""),
    online: z.boolean(),
    saldo_caixa: z.number().nullable().optional(),
    credito_linha: z.number().optional().default(-1),
    agente_uid: z.number().nullable().optional(),
    agente_nome: z.string().optional().default(""),
    super_agente_uid: z.number().nullable().optional(),
    super_agente_nome: z.string().optional().default(""),
    downlines: z.array(z.unknown()).optional().default([]),
  })
  .passthrough();

const getLiveMembersResponse = z.object({
  success: z.boolean(),
  total: z.number(),
  members: z.array(liveMemberSchema),
});

export const pokerMembersRouter = createTRPCRouter({
  /**
   * Get live member list directly from PPPoker bridge (real-time)
   */
  getLive: protectedProcedure
    .input(
      z
        .object({
          q: z.string().optional(),
        })
        .optional()
        .default({}),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const creds = await getBridgeCredentials(teamId!);

      const resp = await fetch(
        `${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/members`,
        {
          headers: {
            "X-PPPoker-Username": creds.pppoker_username,
            "X-PPPoker-Password": creds.pppoker_password,
          },
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao buscar membros ao vivo: ${errText}`,
        });
      }

      const json = await resp.json();
      const parsed = getLiveMembersResponse.parse(json);

      let members = parsed.members;

      // Client-side search filter
      if (input.q) {
        const q = input.q.toLowerCase();
        members = members.filter(
          (m) =>
            m.nome.toLowerCase().includes(q) ||
            m.titulo.toLowerCase().includes(q) ||
            String(m.uid).includes(q),
        );
      }

      return {
        total: members.length,
        members,
      };
    }),

  /**
   * List all club members (from poker_players) with pagination + search
   */
  list: protectedProcedure
    .input(getMembersListSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const { cursor, pageSize = 50, q, sort } = input ?? {};

      let query = supabase
        .from("poker_players")
        .select(
          "id, pppoker_id, nickname, memo_name, type, status, is_online, cashbox_balance, pppoker_role, credit_limit, current_balance, agent_id, created_at, last_synced_at",
          { count: "exact" },
        )
        .eq("team_id", teamId);

      if (q) {
        query = query.or(
          `nickname.ilike.%${q}%,memo_name.ilike.%${q}%,pppoker_id.ilike.%${q}%`,
        );
      }

      const sortColumn = sort?.[0] ?? "nickname";
      const sortOrder = sort?.[1] === "desc";
      query = query.order(sortColumn, { ascending: !sortOrder });

      const currentCursor = cursor ? Number.parseInt(cursor, 10) : 0;
      const offset = currentCursor * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error({ error: error.message }, "members.list error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      // Fetch agent info for members that have agents
      const agentIds = [
        ...new Set(
          (data ?? [])
            .map((p) => p.agent_id)
            .filter((id): id is string => id !== null),
        ),
      ];

      let agentsMap: Record<
        string,
        { id: string; nickname: string; memoName: string | null }
      > = {};
      if (agentIds.length > 0) {
        const { data: agents } = await supabase
          .from("poker_players")
          .select("id, nickname, memo_name")
          .in("id", agentIds);

        agentsMap = (agents ?? []).reduce(
          (acc, agent) => {
            acc[agent.id] = {
              id: agent.id,
              nickname: agent.nickname,
              memoName: agent.memo_name,
            };
            return acc;
          },
          {} as typeof agentsMap,
        );
      }

      const hasNextPage = offset + pageSize < (count ?? 0);
      const nextCursor = hasNextPage ? String(currentCursor + 1) : null;

      const ROLE_LABELS: Record<number, string> = {
        1: "Dono",
        2: "Gestor",
        4: "Super Agente",
        5: "Agente",
        10: "Membro",
      };

      const transformedData = (data ?? []).map((p) => ({
        id: p.id,
        ppPokerId: p.pppoker_id,
        nickname: p.nickname,
        memoName: p.memo_name,
        type: p.type,
        status: p.status,
        isOnline: (p as Record<string, unknown>).is_online ?? false,
        cashboxBalance: Number(
          (p as Record<string, unknown>).cashbox_balance ?? 0,
        ),
        pppokerRole: (p as Record<string, unknown>).pppoker_role ?? null,
        roleLabel:
          ROLE_LABELS[
            (p as Record<string, unknown>).pppoker_role as number
          ] ?? "Membro",
        creditLimit: p.credit_limit ?? 0,
        currentBalance: p.current_balance ?? 0,
        agentId: p.agent_id,
        createdAt: p.created_at,
        lastSyncedAt: (p as Record<string, unknown>).last_synced_at ?? null,
        agent: p.agent_id ? (agentsMap[p.agent_id] ?? null) : null,
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
   * Get member stats: total, online, new this week, pending requests
   */
  getStats: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    // Count all members
    const { count: totalMembers } = await supabase
      .from("poker_players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId);

    // Count online members
    const { count: onlineMembers } = await supabase
      .from("poker_players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("is_online", true);

    // Count new members this week (created in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: newThisWeek } = await supabase
      .from("poker_players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .gte("created_at", weekAgo.toISOString());

    // Count pending member requests
    const { count: pendingMembers } = await supabase
      .from("club_member_requests")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "pending");

    // Count pending credit requests
    const { count: pendingCredits } = await supabase
      .from("club_credit_requests")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "pending");

    return {
      totalMembers: totalMembers ?? 0,
      onlineMembers: onlineMembers ?? 0,
      newThisWeek: newThisWeek ?? 0,
      pendingMembers: pendingMembers ?? 0,
      pendingCredits: pendingCredits ?? 0,
    };
  }),

  /**
   * List pending member requests
   */
  listPendingMembers: protectedProcedure
    .input(listPendingMembersSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const { cursor, pageSize = 50 } = input ?? {};

      const currentCursor = cursor ? Number.parseInt(cursor, 10) : 0;
      const offset = currentCursor * pageSize;

      const { data, error, count } = await supabase
        .from("club_member_requests")
        .select("*", { count: "exact" })
        .eq("team_id", teamId)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        logger.error({ error: error.message }, "members.listPendingMembers error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const hasNextPage = offset + pageSize < (count ?? 0);

      return {
        meta: {
          cursor: hasNextPage ? String(currentCursor + 1) : null,
          hasNextPage,
          totalCount: count ?? 0,
        },
        data: (data ?? []).map((r) => ({
          id: r.id,
          playerId: r.player_id,
          ppPokerId: r.pppoker_id,
          nickname: r.nickname,
          status: r.status,
          requestedAt: r.requested_at,
          note: r.note,
        })),
      };
    }),

  /**
   * Approve or reject a member request
   */
  reviewMember: protectedProcedure
    .input(reviewMemberSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("club_member_requests")
        .update({
          status: input.action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.userId,
          note: input.note ?? null,
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
   * List credit requests
   */
  listCreditRequests: protectedProcedure
    .input(listCreditRequestsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const { cursor, pageSize = 50, status = "pending" } = input ?? {};

      const currentCursor = cursor ? Number.parseInt(cursor, 10) : 0;
      const offset = currentCursor * pageSize;

      let query = supabase
        .from("club_credit_requests")
        .select("*", { count: "exact" })
        .eq("team_id", teamId);

      if (status) {
        query = query.eq("status", status);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error({ error: error.message }, "members.listCreditRequests error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const hasNextPage = offset + pageSize < (count ?? 0);

      return {
        meta: {
          cursor: hasNextPage ? String(currentCursor + 1) : null,
          hasNextPage,
          totalCount: count ?? 0,
        },
        data: (data ?? []).map((r) => ({
          id: r.id,
          playerId: r.player_id,
          ppPokerId: r.pppoker_id,
          nickname: r.nickname,
          requestedAmount: Number(r.requested_amount),
          currentCreditLimit: Number(r.current_credit_limit),
          approvedAmount: r.approved_amount ? Number(r.approved_amount) : null,
          status: r.status,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at,
          note: r.note,
        })),
      };
    }),

  /**
   * Approve or reject a credit request
   * If approved, updates the player's credit_limit
   */
  reviewCredit: protectedProcedure
    .input(reviewCreditSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      // Get the credit request first
      const { data: request, error: fetchError } = await supabase
        .from("club_credit_requests")
        .select("*")
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (fetchError || !request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao de credito nao encontrada",
        });
      }

      const approvedAmount =
        input.action === "approved"
          ? (input.approvedAmount ?? request.requested_amount)
          : null;

      // Update the credit request
      const { error: updateError } = await supabase
        .from("club_credit_requests")
        .update({
          status: input.action,
          approved_amount: approvedAmount,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.userId,
          note: input.note ?? null,
        })
        .eq("id", input.id)
        .eq("team_id", teamId);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      // If approved, update the player's credit limit
      if (input.action === "approved" && request.player_id) {
        const { error: playerError } = await supabase
          .from("poker_players")
          .update({
            credit_limit: approvedAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.player_id)
          .eq("team_id", teamId);

        if (playerError) {
          logger.error(
            { error: playerError.message },
            "Failed to update player credit limit",
          );
        }
      }

      return { id: request.id, status: input.action };
    }),

  /**
   * Create a credit request manually
   */
  createCreditRequest: protectedProcedure
    .input(createCreditRequestSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get the player to fill in pppoker_id and nickname
      const { data: player, error: playerError } = await supabase
        .from("poker_players")
        .select("id, pppoker_id, nickname, credit_limit")
        .eq("id", input.playerId)
        .eq("team_id", teamId)
        .single();

      if (playerError || !player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Jogador nao encontrado",
        });
      }

      const { data, error } = await supabase
        .from("club_credit_requests")
        .insert({
          team_id: teamId,
          player_id: player.id,
          pppoker_id: player.pppoker_id,
          nickname: player.nickname,
          requested_amount: input.requestedAmount,
          current_credit_limit: player.credit_limit ?? 0,
          note: input.note ?? null,
        })
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
   * Create a member request manually
   */
  createMemberRequest: protectedProcedure
    .input(createMemberRequestSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("club_member_requests")
        .insert({
          team_id: teamId,
          player_id: input.playerId ?? null,
          pppoker_id: input.ppPokerId,
          nickname: input.nickname,
          note: input.note ?? null,
        })
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
});
