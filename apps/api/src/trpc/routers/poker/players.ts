import { createAdminClient } from "@api/services/supabase";
import { calculateBatchActivityMetrics, calculatePlayerActivityMetrics } from "@api/utils/poker-activity";
import { TRPCError } from "@trpc/server";
import {
  bulkCreatePlayersSchema,
  checkExistingPlayersSchema,
  deletePokerPlayerSchema,
  getAgentStatsSchema,
  getPlayersByAgentSchema,
  getPokerAgentsSchema,
  getPokerPlayerByIdSchema,
  getPokerPlayersSchema,
  updatePokerPlayerRakebackSchema,
  updatePokerPlayerStatusSchema,
  upsertPokerPlayerSchema,
} from "../../../schemas/poker/players";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const pokerPlayersRouter = createTRPCRouter({
  /**
   * Get poker players with pagination and filtering
   */
  get: protectedProcedure
    .input(getPokerPlayersSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const {
        cursor,
        pageSize = 50,
        sort,
        q,
        type,
        status,
        agentId,
        isVip,
        isShark,
        hasCreditLimit,
        hasRake,
        hasBalance,
        hasAgent,
      } = input ?? {};

      // Build query
      let query = supabase
        .from("poker_players")
        .select("*", { count: "exact" })
        .eq("team_id", teamId);

      // Apply filters
      if (q) {
        query = query.or(
          `nickname.ilike.%${q}%,memo_name.ilike.%${q}%,pppoker_id.ilike.%${q}%,email.ilike.%${q}%`,
        );
      }

      if (type) {
        query = query.eq("type", type);
      }

      if (status) {
        query = query.eq("status", status);
      }

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      if (isVip !== null && isVip !== undefined) {
        query = query.eq("is_vip", isVip);
      }

      if (isShark !== null && isShark !== undefined) {
        query = query.eq("is_shark", isShark);
      }

      // Simple boolean filters
      if (hasCreditLimit === true) {
        query = query.gt("credit_limit", 0);
      }

      if (hasBalance === true) {
        query = query.neq("current_balance", 0);
      }

      if (hasAgent === true) {
        query = query.not("agent_id", "is", null);
      }

      // Filter by rake (requires aggregation from session_players)
      let playerIdsWithRake: string[] | null = null;
      if (hasRake === true) {
        // Get player IDs that have rake > 0
        const { data: sessionData } = await supabase
          .from("poker_session_players")
          .select("player_id, rake")
          .eq("team_id", teamId)
          .gt("rake", 0);

        // Collect unique player IDs with positive rake
        const playerIdsSet = new Set<string>();
        for (const row of sessionData ?? []) {
          playerIdsSet.add(row.player_id);
        }
        playerIdsWithRake = [...playerIdsSet];

        if (playerIdsWithRake.length === 0) {
          // No players have rake
          return {
            meta: {
              cursor: null,
              hasPreviousPage: false,
              hasNextPage: false,
              totalCount: 0,
            },
            data: [],
          };
        }

        query = query.in("id", playerIdsWithRake);
      }

      // Apply sorting
      const sortColumn = sort?.[0] ?? "nickname";
      const sortOrder = sort?.[1] === "desc";
      query = query.order(sortColumn, { ascending: !sortOrder });

      // Apply pagination
      const currentCursor = cursor ? Number.parseInt(cursor, 10) : 0;
      const offset = currentCursor * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.log("[pokerPlayers.get] Supabase error:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const hasNextPage = offset + pageSize < (count ?? 0);
      const nextCursor = hasNextPage ? String(currentCursor + 1) : null;

      // Get unique agent IDs and super_agent IDs to fetch info separately
      const agentIds = [
        ...new Set(
          (data ?? [])
            .map((p) => p.agent_id)
            .filter((id): id is string => id !== null)
        ),
      ];

      const superAgentIds = [
        ...new Set(
          (data ?? [])
            .map((p) => p.super_agent_id)
            .filter((id): id is string => id !== null)
        ),
      ];

      // Fetch agents if any exist
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
          {} as typeof agentsMap
        );
      }

      // Fetch super agents if any exist
      let superAgentsMap: Record<
        string,
        { id: string; nickname: string; memoName: string | null }
      > = {};
      if (superAgentIds.length > 0) {
        const { data: superAgents } = await supabase
          .from("poker_players")
          .select("id, nickname, memo_name")
          .in("id", superAgentIds);

        superAgentsMap = (superAgents ?? []).reduce(
          (acc, sa) => {
            acc[sa.id] = {
              id: sa.id,
              nickname: sa.nickname,
              memoName: sa.memo_name,
            };
            return acc;
          },
          {} as typeof superAgentsMap
        );
      }

      // Fetch rake/winnings stats for all players in current page
      const playerIds = (data ?? []).map((p) => p.id);
      let statsMap: Record<string, { totalRake: number; totalWinnings: number }> = {};
      if (playerIds.length > 0) {
        const { data: sessionStats, error: sessionError } = await supabase
          .from("poker_session_players")
          .select("player_id, rake, winnings")
          .eq("team_id", teamId)
          .in("player_id", playerIds);

        // Aggregate by player
        for (const row of sessionStats ?? []) {
          const current = statsMap[row.player_id] ?? { totalRake: 0, totalWinnings: 0 };
          statsMap[row.player_id] = {
            totalRake: current.totalRake + Number(row.rake ?? 0),
            totalWinnings: current.totalWinnings + Number(row.winnings ?? 0),
          };
        }
      }

      // Fetch activity metrics for all players in current page
      const activityMetricsMap = playerIds.length > 0
        ? await calculateBatchActivityMetrics(supabase, teamId, playerIds)
        : new Map();

      // Transform snake_case to camelCase
      const transformedData = (data ?? []).map((player) => ({
        id: player.id,
        createdAt: player.created_at,
        updatedAt: player.updated_at,
        ppPokerId: player.pppoker_id,
        nickname: player.nickname,
        memoName: player.memo_name,
        country: player.country,
        type: player.type,
        status: player.status,
        agentId: player.agent_id,
        superAgentId: player.super_agent_id,
        phone: player.phone,
        whatsappNumber: player.whatsapp_number,
        email: player.email,
        creditLimit: player.credit_limit ?? 0,
        currentBalance: player.current_balance ?? 0,
        chipBalance: player.chip_balance ?? 0,
        agentCreditBalance: player.agent_credit_balance ?? 0,
        riskScore: player.risk_score ?? 50,
        isVip: player.is_vip ?? false,
        isShark: player.is_shark ?? false,
        lastActiveAt: player.last_active_at,
        rakebackPercent: player.rakeback_percent ?? 0,
        customerId: player.customer_id,
        note: player.note,
        agent: player.agent_id ? agentsMap[player.agent_id] ?? null : null,
        superAgent: player.super_agent_id ? superAgentsMap[player.super_agent_id] ?? null : null,
        totalRake: statsMap[player.id]?.totalRake ?? 0,
        totalWinnings: statsMap[player.id]?.totalWinnings ?? 0,
        activityStatus: activityMetricsMap.get(player.id)?.activityStatus ?? "new",
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
   * Get a single poker player by ID
   */
  getById: protectedProcedure
    .input(getPokerPlayerByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_players")
        .select("*")
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Player not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      // Fetch agent info if exists
      let agent = null;
      if (data.agent_id) {
        const { data: agentData } = await supabase
          .from("poker_players")
          .select("id, pppoker_id, nickname, memo_name, rakeback_percent")
          .eq("id", data.agent_id)
          .single();

        if (agentData) {
          agent = {
            id: agentData.id,
            ppPokerId: agentData.pppoker_id,
            nickname: agentData.nickname,
            memoName: agentData.memo_name,
            rakebackPercent: agentData.rakeback_percent ?? 0,
          };
        }
      }

      // Get rake stats for this player from session_players (partidas)
      const { data: sessionStats } = await supabase
        .from("poker_session_players")
        .select("rake, winnings")
        .eq("team_id", teamId)
        .eq("player_id", data.id);

      const totalRake = (sessionStats ?? []).reduce(
        (sum, s) => sum + (s.rake ?? 0),
        0
      );
      const totalWinnings = (sessionStats ?? []).reduce(
        (sum, s) => sum + (s.winnings ?? 0),
        0
      );
      const sessionsPlayed = sessionStats?.length ?? 0;
      const rakebackPercent = data.rakeback_percent ?? 0;
      const totalRakeback = totalRake * (rakebackPercent / 100);

      const rakeStats = {
        sessionsPlayed,
        totalRake,
        totalWinnings,
        totalRakeback,
      };

      // If player is an agent, also get stats for managed players
      let agentStats = null;
      if (data.type === "agent") {
        // Get all players managed by this agent
        const { data: managedPlayers } = await supabase
          .from("poker_players")
          .select("id")
          .eq("team_id", teamId)
          .eq("agent_id", data.id)
          .limit(50000);

        const managedPlayerIds = (managedPlayers ?? []).map((p) => p.id);

        if (managedPlayerIds.length > 0) {
          // Get rake from session_players for managed players
          const { data: managedSessionStats } = await supabase
            .from("poker_session_players")
            .select("rake")
            .eq("team_id", teamId)
            .in("player_id", managedPlayerIds);

          const managedTotalRake = (managedSessionStats ?? []).reduce(
            (sum, s) => sum + (s.rake ?? 0),
            0
          );
          const managedRakeback = managedTotalRake * (rakebackPercent / 100);

          agentStats = {
            playerCount: managedPlayerIds.length,
            totalRake: managedTotalRake,
            totalRakeback: managedRakeback,
          };
        } else {
          agentStats = {
            playerCount: 0,
            totalRake: 0,
            totalRakeback: 0,
          };
        }
      }

      // Calculate activity metrics
      const activityMetrics = await calculatePlayerActivityMetrics(
        supabase,
        teamId,
        data.id,
        data.last_active_at
      );

      return {
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        ppPokerId: data.pppoker_id,
        nickname: data.nickname,
        memoName: data.memo_name,
        country: data.country,
        type: data.type,
        status: data.status,
        agentId: data.agent_id,
        superAgentId: data.super_agent_id,
        phone: data.phone,
        whatsappNumber: data.whatsapp_number,
        email: data.email,
        creditLimit: data.credit_limit ?? 0,
        currentBalance: data.current_balance ?? 0,
        chipBalance: data.chip_balance ?? 0,
        agentCreditBalance: data.agent_credit_balance ?? 0,
        riskScore: data.risk_score ?? 50,
        isVip: data.is_vip ?? false,
        isShark: data.is_shark ?? false,
        lastActiveAt: data.last_active_at,
        rakebackPercent: data.rakeback_percent ?? 0,
        customerId: data.customer_id,
        note: data.note,
        agent,
        rakeStats,
        agentStats,
        activityMetrics,
      };
    }),

  /**
   * Create or update a poker player
   */
  upsert: protectedProcedure
    .input(upsertPokerPlayerSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const payload = {
        team_id: teamId,
        pppoker_id: input.ppPokerId,
        nickname: input.nickname,
        memo_name: input.memoName ?? null,
        country: input.country ?? null,
        type: input.type ?? "player",
        status: input.status ?? "active",
        agent_id: input.agentId ?? null,
        super_agent_id: input.superAgentId ?? null,
        phone: input.phone ?? null,
        whatsapp_number: input.whatsappNumber ?? null,
        email: input.email ?? null,
        credit_limit: input.creditLimit ?? 0,
        current_balance: input.currentBalance ?? 0,
        chip_balance: input.chipBalance ?? 0,
        risk_score: input.riskScore ?? 50,
        is_vip: input.isVip ?? false,
        is_shark: input.isShark ?? false,
        rakeback_percent: input.rakebackPercent ?? 0,
        customer_id: input.customerId ?? null,
        note: input.note ?? null,
        updated_at: new Date().toISOString(),
      };

      if (input.id) {
        // Update existing player
        const { data, error } = await supabase
          .from("poker_players")
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

      // Create new player
      const { data, error } = await supabase
        .from("poker_players")
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A player with this PPPoker ID already exists",
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
   * Delete a poker player
   */
  delete: protectedProcedure
    .input(deletePokerPlayerSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_players")
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
   * Update player status
   */
  updateStatus: protectedProcedure
    .input(updatePokerPlayerStatusSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_players")
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
   * Update player rakeback percentage
   */
  updateRakeback: protectedProcedure
    .input(updatePokerPlayerRakebackSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_players")
        .update({
          rakeback_percent: input.rakebackPercent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select("id, rakeback_percent")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { id: data.id, rakebackPercent: data.rakeback_percent };
    }),

  /**
   * Get only agents (type = 'agent')
   */
  getAgents: protectedProcedure
    .input(getPokerAgentsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { cursor, pageSize = 50, q } = input ?? {};

      let query = supabase
        .from("poker_players")
        .select("id, nickname, memo_name, rakeback_percent, status", {
          count: "exact",
        })
        .eq("team_id", teamId)
        .eq("type", "agent")
        .eq("status", "active");

      if (q) {
        query = query.or(`nickname.ilike.%${q}%,memo_name.ilike.%${q}%`);
      }

      query = query.order("nickname", { ascending: true });

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
        },
        data: (data ?? []).map((agent) => ({
          id: agent.id,
          nickname: agent.nickname,
          memoName: agent.memo_name,
          rakebackPercent: agent.rakeback_percent ?? 0,
          status: agent.status,
        })),
      };
    }),

  /**
   * Get players by agent ID
   */
  getPlayersByAgent: protectedProcedure
    .input(getPlayersByAgentSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { agentId, cursor, pageSize = 50 } = input;

      let query = supabase
        .from("poker_players")
        .select("id, nickname, memo_name, status, current_balance, is_vip", {
          count: "exact",
        })
        .eq("team_id", teamId)
        .eq("agent_id", agentId)
        .eq("type", "player");

      query = query.order("nickname", { ascending: true });

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
        data: (data ?? []).map((player) => ({
          id: player.id,
          nickname: player.nickname,
          memoName: player.memo_name,
          status: player.status,
          currentBalance: player.current_balance ?? 0,
          isVip: player.is_vip ?? false,
        })),
      };
    }),

  /**
   * Get player statistics (for dashboard widgets)
   */
  getStats: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    // Get counts by type and status
    const { data: players, error } = await supabase
      .from("poker_players")
      .select("type, status, is_vip, is_shark, current_balance")
      .eq("team_id", teamId)
      .limit(50000); // Avoid 1000 row limit

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    const stats = {
      totalPlayers: 0,
      totalAgents: 0,
      activePlayers: 0,
      activeAgents: 0,
      vipPlayers: 0,
      sharkPlayers: 0,
      totalBalance: 0,
      positiveBalance: 0,
      negativeBalance: 0,
    };

    for (const player of players ?? []) {
      if (player.type === "player") {
        stats.totalPlayers++;
        if (player.status === "active") stats.activePlayers++;
      } else {
        stats.totalAgents++;
        if (player.status === "active") stats.activeAgents++;
      }

      if (player.is_vip) stats.vipPlayers++;
      if (player.is_shark) stats.sharkPlayers++;

      const balance = player.current_balance ?? 0;
      stats.totalBalance += balance;
      if (balance > 0) stats.positiveBalance += balance;
      if (balance < 0) stats.negativeBalance += balance;
    }

    return stats;
  }),

  /**
   * Get agent statistics for dashboard widgets
   * Includes total agents, managed players, rake breakdown, commissions
   */
  getAgentStats: protectedProcedure
    .input(getAgentStatsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { dateFrom, dateTo, superAgentId } = input ?? {};

      // Build base query for agents
      let agentsQuery = supabase
        .from("poker_players")
        .select("id, nickname, status, rakeback_percent, super_agent_id")
        .eq("team_id", teamId)
        .eq("type", "agent")
        .limit(10000); // Avoid 1000 row limit

      if (superAgentId) {
        agentsQuery = agentsQuery.eq("super_agent_id", superAgentId);
      }

      const { data: agents, error: agentsError } = await agentsQuery;

      if (agentsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: agentsError.message,
        });
      }

      const agentIds = (agents ?? []).map((a) => a.id);

      // Get all players managed by these agents (includes agents themselves since they self-reference)
      const { data: managedPlayers, error: playersError } = await supabase
        .from("poker_players")
        .select("id, agent_id")
        .eq("team_id", teamId)
        .in("agent_id", agentIds.length > 0 ? agentIds : ["00000000-0000-0000-0000-000000000000"])
        .limit(50000); // Avoid 1000 row limit

      if (playersError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: playersError.message,
        });
      }

      // Get rake summary data
      let summaryQuery = supabase
        .from("poker_player_summary")
        .select("player_id, rake_total, rake_ppst, rake_ppsr")
        .eq("team_id", teamId)
        .limit(50000); // Avoid 1000 row limit

      if (dateFrom) {
        summaryQuery = summaryQuery.gte("period_start", dateFrom);
      }
      if (dateTo) {
        summaryQuery = summaryQuery.lte("period_end", dateTo);
      }

      const { data: summaries, error: summaryError } = await summaryQuery;

      if (summaryError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: summaryError.message,
        });
      }

      // Build maps for aggregation
      const playerAgentMap = new Map<string, string>();
      for (const player of managedPlayers ?? []) {
        if (player.agent_id) {
          playerAgentMap.set(player.id, player.agent_id);
        }
      }

      const agentRakeMap = new Map<string, { total: number; ppst: number; ppsr: number }>();
      for (const summary of summaries ?? []) {
        const agentId = playerAgentMap.get(summary.player_id);
        if (agentId) {
          const current = agentRakeMap.get(agentId) ?? { total: 0, ppst: 0, ppsr: 0 };
          current.total += summary.rake_total ?? 0;
          current.ppst += summary.rake_ppst ?? 0;
          current.ppsr += summary.rake_ppsr ?? 0;
          agentRakeMap.set(agentId, current);
        }
      }

      // Calculate totals
      let totalRake = 0;
      let totalRakePpst = 0;
      let totalRakePpsr = 0;
      let totalCommission = 0;

      const byStatus: Record<string, { count: number; rake: number }> = {};
      const bySuperAgent: Record<string, { nickname: string; count: number; rake: number }> = {};

      // Get super agent nicknames
      const superAgentIds = [...new Set((agents ?? []).map((a) => a.super_agent_id).filter(Boolean))] as string[];
      let superAgentMap: Record<string, string> = {};
      if (superAgentIds.length > 0) {
        const { data: superAgents } = await supabase
          .from("poker_players")
          .select("id, nickname")
          .in("id", superAgentIds);
        superAgentMap = (superAgents ?? []).reduce((acc, sa) => {
          acc[sa.id] = sa.nickname;
          return acc;
        }, {} as Record<string, string>);
      }

      // Aggregate per agent
      const agentMetrics: Array<{
        id: string;
        nickname: string;
        status: string;
        rakebackPercent: number;
        playerCount: number;
        totalRake: number;
        rakePpst: number;
        rakePpsr: number;
        estimatedCommission: number;
        superAgentId: string | null;
      }> = [];

      for (const agent of agents ?? []) {
        const playerCount = (managedPlayers ?? []).filter((p) => p.agent_id === agent.id).length;
        const rake = agentRakeMap.get(agent.id) ?? { total: 0, ppst: 0, ppsr: 0 };
        const rakebackPercent = agent.rakeback_percent ?? 0;
        const commission = rake.total * (rakebackPercent / 100);

        totalRake += rake.total;
        totalRakePpst += rake.ppst;
        totalRakePpsr += rake.ppsr;
        totalCommission += commission;

        // By status
        const status = agent.status ?? "active";
        if (!byStatus[status]) {
          byStatus[status] = { count: 0, rake: 0 };
        }
        byStatus[status].count++;
        byStatus[status].rake += rake.total;

        // By super agent
        if (agent.super_agent_id) {
          const superAgentNickname = superAgentMap[agent.super_agent_id] ?? "Unknown";
          if (!bySuperAgent[agent.super_agent_id]) {
            bySuperAgent[agent.super_agent_id] = { nickname: superAgentNickname, count: 0, rake: 0 };
          }
          bySuperAgent[agent.super_agent_id].count++;
          bySuperAgent[agent.super_agent_id].rake += rake.total;
        }

        agentMetrics.push({
          id: agent.id,
          nickname: agent.nickname,
          status: agent.status,
          rakebackPercent,
          playerCount,
          totalRake: rake.total,
          rakePpst: rake.ppst,
          rakePpsr: rake.ppsr,
          estimatedCommission: commission,
          superAgentId: agent.super_agent_id,
        });
      }

      return {
        totalAgents: agents?.length ?? 0,
        totalManagedPlayers: managedPlayers?.length ?? 0,
        totalRake,
        totalRakePpst,
        totalRakePpsr,
        totalCommission,
        byStatus,
        bySuperAgent: Object.entries(bySuperAgent)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.rake - a.rake)
          .slice(0, 5),
        agentMetrics: agentMetrics.sort((a, b) => b.totalRake - a.totalRake),
      };
    }),

  /**
   * Check which PPPoker IDs already exist in the database
   * Used for bulk import validation
   */
  checkExistingByPpPokerIds: protectedProcedure
    .input(checkExistingPlayersSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      if (input.ppPokerIds.length === 0) {
        return { existing: [], missing: [] };
      }

      const { data, error } = await supabase
        .from("poker_players")
        .select("id, pppoker_id, nickname, memo_name, type, status")
        .eq("team_id", teamId)
        .in("pppoker_id", input.ppPokerIds);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const existingIds = new Set((data ?? []).map((p) => p.pppoker_id));
      const missing = input.ppPokerIds.filter((id) => !existingIds.has(id));

      return {
        existing: (data ?? []).map((p) => ({
          id: p.id,
          ppPokerId: p.pppoker_id,
          nickname: p.nickname,
          memoName: p.memo_name,
          type: p.type,
          status: p.status,
        })),
        missing,
      };
    }),

  /**
   * Bulk create players from import
   * Resolves agent/super-agent relationships by ppPokerId
   */
  bulkCreate: protectedProcedure
    .input(bulkCreatePlayersSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      if (input.players.length === 0) {
        return { created: 0, errors: [] };
      }

      // Collect all agent/super-agent ppPokerIds to resolve
      const agentPpPokerIds = [
        ...new Set(
          input.players
            .map((p) => p.agentPpPokerId)
            .filter((id): id is string => id !== null && id !== undefined)
        ),
      ];
      const superAgentPpPokerIds = [
        ...new Set(
          input.players
            .map((p) => p.superAgentPpPokerId)
            .filter((id): id is string => id !== null && id !== undefined)
        ),
      ];

      // Build a map of ppPokerId -> internal id for agents/super-agents
      const idMap: Record<string, string> = {};

      if (agentPpPokerIds.length > 0 || superAgentPpPokerIds.length > 0) {
        const allIds = [...new Set([...agentPpPokerIds, ...superAgentPpPokerIds])];
        const { data: existingPlayers } = await supabase
          .from("poker_players")
          .select("id, pppoker_id")
          .eq("team_id", teamId)
          .in("pppoker_id", allIds);

        for (const p of existingPlayers ?? []) {
          idMap[p.pppoker_id] = p.id;
        }
      }

      // Prepare players for insert
      const playersToInsert = input.players.map((p) => ({
        team_id: teamId,
        pppoker_id: p.ppPokerId,
        nickname: p.nickname,
        memo_name: p.memoName ?? null,
        country: p.country ?? null,
        type: p.type ?? "player",
        status: "active" as const,
        agent_id: p.agentPpPokerId ? idMap[p.agentPpPokerId] ?? null : null,
        super_agent_id: p.superAgentPpPokerId ? idMap[p.superAgentPpPokerId] ?? null : null,
        credit_limit: 0,
        current_balance: 0,
        chip_balance: 0,
        agent_credit_balance: 0,
        risk_score: 50,
        is_vip: false,
        is_shark: false,
        rakeback_percent: 0,
      }));

      const errors: Array<{ ppPokerId: string; error: string }> = [];
      let created = 0;

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < playersToInsert.length; i += batchSize) {
        const batch = playersToInsert.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("poker_players")
          .insert(batch)
          .select("id, pppoker_id");

        if (error) {
          // If batch failed, try individual inserts to identify problematic records
          for (const player of batch) {
            const { error: singleError } = await supabase
              .from("poker_players")
              .insert(player);

            if (singleError) {
              errors.push({
                ppPokerId: player.pppoker_id,
                error: singleError.code === "23505"
                  ? "Jogador já existe"
                  : singleError.message,
              });
            } else {
              created++;
            }
          }
        } else {
          created += (data ?? []).length;
        }
      }

      return { created, errors };
    }),
});
