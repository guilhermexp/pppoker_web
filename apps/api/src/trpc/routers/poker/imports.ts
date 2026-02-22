import { createAdminClient } from "@api/services/supabase";
import { calculateBatchActivityMetrics } from "@api/utils/poker-activity";
import { logger } from "@midpoker/logger";
import { TRPCError } from "@trpc/server";
import {
  cancelPokerImportSchema,
  createPokerImportSchema,
  getPokerImportByIdSchema,
  getPokerImportsSchema,
  processPokerImportSchema,
  validatePokerImportSchema,
} from "../../../schemas/poker/imports";
import { createTRPCRouter, protectedProcedure } from "../../init";

/**
 * Classifies a transaction based on its characteristics.
 * Available types (from pokerTransactionTypeEnum):
 * - buy_in: Player buying chips to enter a game
 * - cash_out: Player cashing out chips
 * - credit_given: Agent giving credit to player
 * - credit_received: Agent receiving credit back from player
 * - credit_paid: Credit being paid/settled
 * - rake: Rake collected from sessions
 * - agent_commission: Commission paid to agent
 * - rakeback: Rakeback paid to player
 * - jackpot: Jackpot winnings
 * - adjustment: Manual adjustments
 * - transfer_in: Chips/credit transferred in
 * - transfer_out: Chips/credit transferred out
 */
function classifyTransactionType(tx: {
  creditSent?: number;
  creditRedeemed?: number;
  creditLeftClub?: number;
  chipsSent?: number;
  chipsRedeemed?: number;
  chipsLeftClub?: number;
  ticketSent?: number;
  ticketRedeemed?: number;
  ticketExpired?: number;
  senderNickname?: string;
  recipientNickname?: string;
}): string {
  const creditSent = tx.creditSent ?? 0;
  const creditRedeemed = tx.creditRedeemed ?? 0;
  const creditLeftClub = tx.creditLeftClub ?? 0;
  const chipsSent = tx.chipsSent ?? 0;
  const chipsRedeemed = tx.chipsRedeemed ?? 0;
  const chipsLeftClub = tx.chipsLeftClub ?? 0;
  const ticketSent = tx.ticketSent ?? 0;
  const ticketRedeemed = tx.ticketRedeemed ?? 0;

  // Credit-based transactions
  if (creditSent > 0 && creditRedeemed === 0) {
    return "credit_given"; // Agent giving credit
  }
  if (creditRedeemed > 0 && creditSent === 0) {
    return "credit_received"; // Agent receiving credit back
  }
  if (creditLeftClub > 0) {
    return "credit_paid"; // Credit being settled when leaving club
  }

  // Chip-based transactions
  if (chipsSent > 0 && chipsRedeemed === 0) {
    // Could be buy-in or transfer depending on context
    // If there's a ticket, it's likely a tournament buy-in
    if (ticketSent > 0 || ticketRedeemed > 0) {
      return "buy_in";
    }
    return "transfer_in"; // Chips being sent to player
  }
  if (chipsRedeemed > 0 && chipsSent === 0) {
    // Could be cash-out or transfer out
    if (chipsLeftClub > 0) {
      return "cash_out"; // Cashing out when leaving club
    }
    return "transfer_out"; // Chips being redeemed
  }

  // Mixed transactions (both sent and redeemed)
  if (chipsSent > 0 && chipsRedeemed > 0) {
    // Net positive = transfer in, net negative = transfer out
    return chipsSent > chipsRedeemed ? "transfer_in" : "transfer_out";
  }
  if (creditSent > 0 && creditRedeemed > 0) {
    return creditSent > creditRedeemed ? "credit_given" : "credit_received";
  }

  // Ticket-only transactions
  if (ticketSent > 0 || ticketRedeemed > 0) {
    return "buy_in"; // Tickets are typically for tournament entry
  }

  // Default fallback
  return "adjustment";
}

export const pokerImportsRouter = createTRPCRouter({
  /**
   * Get poker imports with pagination
   */
  get: protectedProcedure
    .input(getPokerImportsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { cursor, pageSize = 20, status, sourceType } = input ?? {};

      let query = supabase
        .from("poker_imports")
        .select("*", { count: "exact" })
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      if (sourceType) {
        query = query.eq("source_type", sourceType);
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
        data: (data ?? []).map((imp) => {
          const rawData = imp.raw_data as any;

          // Calculate detailed stats from raw_data
          const summaries = rawData?.summaries ?? [];
          const sessions = rawData?.sessions ?? [];
          const rakebacks = rawData?.rakebacks ?? [];

          // Players breakdown
          const playersWithAgent = summaries.filter(
            (s: any) => s.agentPpPokerId,
          ).length;
          const playersWithoutAgent = summaries.length - playersWithAgent;

          // Unique agents and super agents from summaries
          const agentIds = new Set(
            summaries.map((s: any) => s.agentPpPokerId).filter(Boolean),
          );
          const superAgentIds = new Set(
            summaries.map((s: any) => s.superAgentPpPokerId).filter(Boolean),
          );

          // Sessions breakdown by type
          const sessionsByType = sessions.reduce((acc: any, s: any) => {
            const type = s.sessionType || "unknown";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});

          // Calculate totals from summaries
          const totalWinnings = summaries.reduce((sum: number, s: any) => {
            return sum + (s.generalTotal ?? s.winningsTotal ?? 0);
          }, 0);

          const totalRake = summaries.reduce((sum: number, s: any) => {
            return sum + (s.feeGeneral ?? s.rakeTotal ?? 0);
          }, 0);

          // Winners vs Losers
          const winners = summaries.filter(
            (s: any) => (s.generalTotal ?? s.winningsTotal ?? 0) > 0,
          ).length;
          const losers = summaries.filter(
            (s: any) => (s.generalTotal ?? s.winningsTotal ?? 0) < 0,
          ).length;

          return {
            id: imp.id,
            createdAt: imp.created_at,
            updatedAt: imp.updated_at,
            fileName: imp.file_name,
            fileSize: imp.file_size,
            fileType: imp.file_type,
            sourceType: imp.source_type ?? "club",
            status: imp.status,
            committed: imp.committed ?? false,
            committedAt: imp.committed_at,
            periodStart: imp.period_start,
            periodEnd: imp.period_end,
            totalPlayers: imp.total_players ?? 0,
            totalSessions: imp.total_sessions ?? 0,
            totalTransactions: imp.total_transactions ?? 0,
            newPlayers: imp.new_players ?? 0,
            updatedPlayers: imp.updated_players ?? 0,
            validationPassed: imp.validation_passed ?? false,
            validationErrors: imp.validation_errors,
            validationWarnings: imp.validation_warnings,
            processingErrors: imp.processing_errors,
            processedAt: imp.processed_at,
            // Metadata from raw_data
            leagueId: rawData?.leagueId ?? null,
            clubId: rawData?.clubId ?? null,
            // Detailed stats
            stats: {
              playersWithAgent,
              playersWithoutAgent,
              agentsCount: agentIds.size,
              superAgentsCount: superAgentIds.size,
              rakebacksCount: rakebacks.length,
              sessionsByType,
              totalWinnings,
              totalRake,
              winners,
              losers,
            },
          };
        }),
      };
    }),

  /**
   * Get a single import by ID
   */
  getById: protectedProcedure
    .input(getPokerImportByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_imports")
        .select("*")
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Importacao nao encontrada",
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
        fileName: data.file_name,
        fileSize: data.file_size,
        fileType: data.file_type,
        status: data.status,
        committed: data.committed ?? false,
        committedAt: data.committed_at,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        totalPlayers: data.total_players ?? 0,
        totalSessions: data.total_sessions ?? 0,
        totalTransactions: data.total_transactions ?? 0,
        newPlayers: data.new_players ?? 0,
        updatedPlayers: data.updated_players ?? 0,
        validationPassed: data.validation_passed ?? false,
        validationErrors: data.validation_errors,
        validationWarnings: data.validation_warnings,
        processedAt: data.processed_at,
        rawData: data.raw_data,
      };
    }),

  /**
   * Create a new import record
   */
  create: protectedProcedure
    .input(createPokerImportSchema)
    .mutation(async ({ input, ctx: { teamId, userId } }) => {
      // Guard: reject club imports - club data syncs automatically via PPPoker API
      const sourceType = input.sourceType ?? "club";
      if (sourceType === "club") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Dados de clube sincronizam automaticamente via PPPoker. Use a importação apenas para dados de liga.",
        });
      }

      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_imports")
        .insert({
          team_id: teamId,
          file_name: input.fileName,
          file_size: input.fileSize,
          file_type: input.fileType,
          source_type: sourceType,
          status: "validating",
          raw_data: input.rawData,
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
   * Validate import data and return statistics
   */
  validate: protectedProcedure
    .input(validatePokerImportSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get the import record
      const { data: importRecord, error: fetchError } = await supabase
        .from("poker_imports")
        .select("*")
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (fetchError || !importRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Importacao nao encontrada",
        });
      }

      const rawData = importRecord.raw_data as any;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Count entities
      const totalPlayers = rawData?.players?.length ?? 0;
      const totalSessions = rawData?.sessions?.length ?? 0;
      const totalTransactions = rawData?.transactions?.length ?? 0;

      // Get existing players to determine new vs update using pagination (Supabase API defaults to 1000 rows max)
      const existingIds = new Set<string>();
      let existingOffset = 0;
      const EXISTING_PAGE_SIZE = 1000;

      while (true) {
        const { data: existingBatch } = await supabase
          .from("poker_players")
          .select("pppoker_id")
          .eq("team_id", teamId)
          .range(existingOffset, existingOffset + EXISTING_PAGE_SIZE - 1);

        if (!existingBatch || existingBatch.length === 0) {
          break;
        }

        for (const p of existingBatch) {
          existingIds.add(p.pppoker_id);
        }

        if (existingBatch.length < EXISTING_PAGE_SIZE) {
          break;
        }

        existingOffset += EXISTING_PAGE_SIZE;
      }

      let newPlayers = 0;
      let updatedPlayers = 0;

      for (const player of rawData?.players ?? []) {
        if (existingIds.has(player.ppPokerId)) {
          updatedPlayers++;
        } else {
          newPlayers++;
        }
      }

      // Determine period from data
      let periodStart: string | null = null;
      let periodEnd: string | null = null;

      if (rawData?.transactions?.length > 0) {
        const dates = rawData.transactions
          .map((t: any) => t.occurredAt)
          .filter(Boolean)
          .sort();
        periodStart = dates[0] ?? null;
        periodEnd = dates[dates.length - 1] ?? null;
      }

      // Validation checks
      if (
        totalPlayers === 0 &&
        totalTransactions === 0 &&
        totalSessions === 0
      ) {
        errors.push("No data found in the import file");
      }

      if (newPlayers > 100) {
        warnings.push(`${newPlayers} new players will be created`);
      }

      const validationPassed = errors.length === 0;

      // Update the import record
      const { error: updateError } = await supabase
        .from("poker_imports")
        .update({
          status: validationPassed ? "validated" : "failed",
          period_start: periodStart,
          period_end: periodEnd,
          total_players: totalPlayers,
          total_sessions: totalSessions,
          total_transactions: totalTransactions,
          new_players: newPlayers,
          updated_players: updatedPlayers,
          validation_passed: validationPassed,
          validation_errors: errors.length > 0 ? errors : null,
          validation_warnings: warnings.length > 0 ? warnings : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      return {
        id: input.id,
        validationPassed,
        periodStart,
        periodEnd,
        totalPlayers,
        totalSessions,
        totalTransactions,
        newPlayers,
        updatedPlayers,
        errors,
        warnings,
      };
    }),

  /**
   * Process validated import
   */
  process: protectedProcedure
    .input(processPokerImportSchema)
    .mutation(async ({ input, ctx: { teamId, userId } }) => {
      const supabase = await createAdminClient();

      // Get the import record
      const { data: importRecord, error: fetchError } = await supabase
        .from("poker_imports")
        .select("*")
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (fetchError || !importRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Importacao nao encontrada",
        });
      }

      if (importRecord.status !== "validated") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A importacao deve ser validada antes do processamento",
        });
      }

      // Update status to processing
      await supabase
        .from("poker_imports")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", input.id);

      const rawData = importRecord.raw_data as any;
      const processingErrors: string[] = [];

      // Helper to split array into chunks for batch operations
      const chunkArray = <T>(array: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      };

      // Helper to convert empty strings to null for timestamps
      const parseTimestamp = (
        value: string | null | undefined,
      ): string | null => {
        if (!value || value === "") return null;
        return value;
      };

      const BATCH_SIZE = 500; // Supabase recommends max 1000, using 500 for safety

      // Helper to deduplicate array by key (keeps last occurrence)
      const deduplicateByKey = <T>(
        array: T[],
        keyFn: (item: T) => string,
      ): T[] => {
        const map = new Map<string, T>();
        for (const item of array) {
          map.set(keyFn(item), item);
        }
        return Array.from(map.values());
      };

      try {
        // ============================================
        // STEP 0: Create/upsert week period from import dates
        // ============================================
        // This ensures the dashboard shows the imported week, not calculated from today
        const importPeriodStart = importRecord.period_start;
        const importPeriodEnd = importRecord.period_end;

        const importId = importRecord.id;

        if (importPeriodStart && importPeriodEnd) {
          const { error: weekPeriodError } = await supabase
            .from("poker_week_periods")
            .upsert(
              {
                team_id: teamId,
                week_start: importPeriodStart,
                week_end: importPeriodEnd,
                status: "open",
                import_id: importId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "team_id,week_start" },
            );

          if (weekPeriodError) {
            processingErrors.push(
              `Failed to create week period: ${weekPeriodError.message}`,
            );
          }
        }

        // ============================================
        // PRE-SCAN: Identify all agents and super_agents from summaries
        // ============================================
        // We need to know who the agents are BEFORE upserting players
        // to avoid setting their type as "player" in STEP 1
        const preScannedAgents = new Set<string>();
        if (rawData?.summaries?.length > 0) {
          for (const summary of rawData.summaries) {
            if (summary.superAgentPpPokerId) {
              preScannedAgents.add(summary.superAgentPpPokerId);
            }
            if (summary.agentPpPokerId) {
              preScannedAgents.add(summary.agentPpPokerId);
            }
          }
        }

        // ============================================
        // STEP 1: Batch upsert ALL players from "Detalhes do usuário"
        // ============================================
        // This sheet contains ALL club members - important for historical record.
        // Stats/widgets should count from poker_player_summary (players with activity)
        // not from poker_players (all club members).
        // Skip agents/super_agents to let STEP 2 create them with correct type.
        if (rawData?.players?.length > 0) {
          const playersRaw = rawData.players
            .filter((player: any) => !preScannedAgents.has(player.ppPokerId)) // Skip agents/super_agents
            .map((player: any) => ({
              team_id: teamId,
              import_id: importId,
              pppoker_id: player.ppPokerId,
              nickname: player.nickname,
              memo_name: player.memoName ?? null,
              country: player.country ?? null,
              type: "player",
              status: "active",
              chip_balance: player.chipBalance ?? 0,
              agent_credit_balance: player.agentCreditBalance ?? 0,
              super_agent_credit_balance: player.superAgentCreditBalance ?? 0,
              last_active_at: player.lastActiveAt ?? null,
              updated_at: new Date().toISOString(),
            }));

          // Deduplicate by pppoker_id to avoid "ON CONFLICT DO UPDATE cannot affect row a second time"
          const playersToUpsert = deduplicateByKey(
            playersRaw,
            (p) => p.pppoker_id,
          );

          // Process in batches
          for (const batch of chunkArray(playersToUpsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_players")
              .upsert(batch, { onConflict: "pppoker_id,team_id" });

            if (error) {
              processingErrors.push(
                `Failed to upsert players batch: ${error.message}`,
              );
            }
          }
        }

        // ============================================
        // STEP 2: Extract and upsert agents/super agents from summaries FIRST
        // ============================================
        // Map to store pppoker_id -> agent relationships for later linking
        const playerAgentMap = new Map<
          string,
          { agentPpPokerId: string | null; superAgentPpPokerId: string | null }
        >();
        // Set to track agent/super_agent ppPokerIds (used to avoid overwriting their type in later steps)
        const seenAgents = new Set<string>();

        if (rawData?.summaries?.length > 0) {
          // Extract unique agents and super agents
          const agentsRaw: any[] = [];

          for (const summary of rawData.summaries) {
            // Store the agent relationship for this player
            if (summary.ppPokerId) {
              playerAgentMap.set(summary.ppPokerId, {
                agentPpPokerId: summary.agentPpPokerId ?? null,
                superAgentPpPokerId: summary.superAgentPpPokerId ?? null,
              });
            }

            // Extract super agent FIRST (so they exist before agents reference them)
            if (
              summary.superAgentPpPokerId &&
              !seenAgents.has(summary.superAgentPpPokerId)
            ) {
              seenAgents.add(summary.superAgentPpPokerId);
              agentsRaw.push({
                team_id: teamId,
                import_id: importId,
                pppoker_id: summary.superAgentPpPokerId,
                nickname:
                  summary.superAgentNickname ||
                  `Super Agent ${summary.superAgentPpPokerId}`,
                type: "super_agent",
                status: "active",
                updated_at: new Date().toISOString(),
              });
            }

            // Extract agent
            if (
              summary.agentPpPokerId &&
              !seenAgents.has(summary.agentPpPokerId)
            ) {
              seenAgents.add(summary.agentPpPokerId);
              agentsRaw.push({
                team_id: teamId,
                import_id: importId,
                pppoker_id: summary.agentPpPokerId,
                nickname:
                  summary.agentNickname || `Agent ${summary.agentPpPokerId}`,
                type: "agent",
                status: "active",
                updated_at: new Date().toISOString(),
              });
            }
          }

          if (agentsRaw.length > 0) {
            // Deduplicate by pppoker_id
            const agentsToUpsert = deduplicateByKey(
              agentsRaw,
              (a) => a.pppoker_id,
            );

            for (const batch of chunkArray(agentsToUpsert, BATCH_SIZE)) {
              const { error } = await supabase
                .from("poker_players")
                .upsert(batch, { onConflict: "pppoker_id,team_id" });

              if (error) {
                processingErrors.push(
                  `Failed to upsert agents batch: ${error.message}`,
                );
              }
            }
          }
        }

        // ============================================
        // STEP 2.5: Batch upsert players from summaries (Geral sheet)
        // Skip agents/super_agents to avoid overwriting their type
        // ============================================
        if (rawData?.summaries?.length > 0) {
          const summaryPlayersRaw = rawData.summaries
            .filter((summary: any) => !seenAgents.has(summary.ppPokerId)) // Don't overwrite agents/super_agents
            .map((summary: any) => ({
              team_id: teamId,
              import_id: importId,
              pppoker_id: summary.ppPokerId,
              nickname: summary.nickname,
              memo_name: summary.memoName ?? null,
              country: summary.country ?? null,
              type: "player",
              status: "active",
              updated_at: new Date().toISOString(),
            }));

          // Deduplicate by pppoker_id
          const summaryPlayersToUpsert = deduplicateByKey(
            summaryPlayersRaw,
            (p) => p.pppoker_id,
          );

          for (const batch of chunkArray(summaryPlayersToUpsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_players")
              .upsert(batch, { onConflict: "pppoker_id,team_id" });

            if (error) {
              processingErrors.push(
                `Failed to upsert summary players batch: ${error.message}`,
              );
            }
          }
        }

        // ============================================
        // STEP 2.6: Batch upsert players from sessions (Partidas sheet)
        // These players may not be in Geral sheet but are in individual game results
        // Skip agents/super_agents to avoid overwriting their type
        // ============================================
        if (rawData?.sessions?.length > 0) {
          const sessionPlayersRaw: any[] = [];

          for (const session of rawData.sessions) {
            if (!session.players?.length) continue;

            for (const player of session.players) {
              if (!player.ppPokerId) continue;
              // Skip if this is an agent or super_agent
              if (seenAgents.has(player.ppPokerId)) continue;

              sessionPlayersRaw.push({
                team_id: teamId,
                import_id: importId,
                pppoker_id: player.ppPokerId,
                nickname: player.nickname || `Player ${player.ppPokerId}`,
                memo_name: player.memoName ?? null,
                type: "player",
                status: "active",
                updated_at: new Date().toISOString(),
              });
            }
          }

          if (sessionPlayersRaw.length > 0) {
            // Deduplicate by pppoker_id
            const sessionPlayersToUpsert = deduplicateByKey(
              sessionPlayersRaw,
              (p) => p.pppoker_id,
            );

            for (const batch of chunkArray(
              sessionPlayersToUpsert,
              BATCH_SIZE,
            )) {
              const { error } = await supabase
                .from("poker_players")
                .upsert(batch, { onConflict: "pppoker_id,team_id" });

              if (error) {
                processingErrors.push(
                  `Failed to upsert session players batch: ${error.message}`,
                );
              }
            }
          }
        }

        // ============================================
        // STEP 3: Get player ID map (needed for transactions and sessions)
        // ============================================
        // Use pagination to fetch ALL players (Supabase API defaults to 1000 rows max)
        const playerIdMap = new Map<string, string>();
        let playerOffset = 0;
        const PLAYER_PAGE_SIZE = 1000;

        while (true) {
          const { data: playerBatch, error: playerError } = await supabase
            .from("poker_players")
            .select("id, pppoker_id")
            .eq("team_id", teamId)
            .range(playerOffset, playerOffset + PLAYER_PAGE_SIZE - 1);

          if (playerError) {
            processingErrors.push(
              `Failed to fetch players for map: ${playerError.message}`,
            );
            break;
          }

          if (!playerBatch || playerBatch.length === 0) {
            break;
          }

          for (const p of playerBatch) {
            playerIdMap.set(p.pppoker_id, p.id);
          }

          // If we got less than a full page, we've reached the end
          if (playerBatch.length < PLAYER_PAGE_SIZE) {
            break;
          }

          playerOffset += PLAYER_PAGE_SIZE;
        }

        // ============================================
        // STEP 3.5: Link players to their agents (update agent_id and super_agent_id)
        // ============================================
        if (playerAgentMap.size > 0) {
          // Also need to link agents to their super_agents
          const agentToSuperAgentMap = new Map<string, string>();

          // Build agent -> super_agent relationships from summaries
          for (const summary of rawData?.summaries ?? []) {
            if (summary.agentPpPokerId && summary.superAgentPpPokerId) {
              agentToSuperAgentMap.set(
                summary.agentPpPokerId,
                summary.superAgentPpPokerId,
              );
            }
          }

          // Update players with their agent_id and super_agent_id
          const playerUpdates: Array<{
            pppoker_id: string;
            agent_id: string | null;
            super_agent_id: string | null;
          }> = [];

          for (const [playerPpPokerId, relations] of playerAgentMap) {
            const agentId = relations.agentPpPokerId
              ? playerIdMap.get(relations.agentPpPokerId)
              : null;
            const superAgentId = relations.superAgentPpPokerId
              ? playerIdMap.get(relations.superAgentPpPokerId)
              : null;

            if (agentId || superAgentId) {
              playerUpdates.push({
                pppoker_id: playerPpPokerId,
                agent_id: agentId ?? null,
                super_agent_id: superAgentId ?? null,
              });
            }
          }

          // Update agents with their super_agent_id
          const agentUpdates: Array<{
            pppoker_id: string;
            super_agent_id: string | null;
          }> = [];

          for (const [
            agentPpPokerId,
            superAgentPpPokerId,
          ] of agentToSuperAgentMap) {
            const superAgentId = playerIdMap.get(superAgentPpPokerId);
            if (superAgentId) {
              agentUpdates.push({
                pppoker_id: agentPpPokerId,
                super_agent_id: superAgentId,
              });
            }
          }

          // Batch update players
          for (const batch of chunkArray(playerUpdates, BATCH_SIZE)) {
            for (const update of batch) {
              const { error } = await supabase
                .from("poker_players")
                .update({
                  agent_id: update.agent_id,
                  super_agent_id: update.super_agent_id,
                  updated_at: new Date().toISOString(),
                })
                .eq("pppoker_id", update.pppoker_id)
                .eq("team_id", teamId);

              if (error) {
                processingErrors.push(
                  `Failed to link player ${update.pppoker_id} to agent: ${error.message}`,
                );
              }
            }
          }

          // Batch update agents with super_agent reference
          for (const batch of chunkArray(agentUpdates, BATCH_SIZE)) {
            for (const update of batch) {
              const { error } = await supabase
                .from("poker_players")
                .update({
                  super_agent_id: update.super_agent_id,
                  updated_at: new Date().toISOString(),
                })
                .eq("pppoker_id", update.pppoker_id)
                .eq("team_id", teamId);

              if (error) {
                processingErrors.push(
                  `Failed to link agent ${update.pppoker_id} to super_agent: ${error.message}`,
                );
              }
            }
          }
        }

        // ============================================
        // STEP 4: Batch insert transactions
        // ============================================
        if (rawData?.transactions?.length > 0) {
          const transactionsToInsert = rawData.transactions
            .map((tx: any) => {
              const occurredAt = parseTimestamp(tx.occurredAt);
              if (!occurredAt) return null; // Skip invalid

              // Determine transaction type based on the values
              const transactionType = classifyTransactionType(tx);

              return {
                team_id: teamId,
                import_id: importId,
                occurred_at: occurredAt,
                type: transactionType,
                sender_club_id: tx.senderClubId ?? null,
                sender_player_id: tx.senderPlayerId
                  ? playerIdMap.get(tx.senderPlayerId)
                  : null,
                recipient_player_id: tx.recipientPlayerId
                  ? playerIdMap.get(tx.recipientPlayerId)
                  : null,
                // Identificação completa - sender (100% coverage)
                sender_nickname: tx.senderNickname ?? null,
                sender_memo_name: tx.senderMemoName ?? null,
                // Identificação completa - recipient (100% coverage)
                recipient_nickname: tx.recipientNickname ?? null,
                recipient_memo_name: tx.recipientMemoName ?? null,
                credit_sent: tx.creditSent ?? 0,
                credit_redeemed: tx.creditRedeemed ?? 0,
                credit_left_club: tx.creditLeftClub ?? 0,
                chips_sent: tx.chipsSent ?? 0,
                chips_redeemed: tx.chipsRedeemed ?? 0,
                chips_left_club: tx.chipsLeftClub ?? 0,
                // Classification by chip type (M-P)
                chips_ppsr: tx.classificationPpsr ?? 0,
                chips_ring: tx.classificationRing ?? 0,
                chips_custom_ring: tx.classificationCustomRing ?? 0,
                chips_mtt: tx.classificationMtt ?? 0,
                // Tickets (S-U)
                ticket_sent: tx.ticketSent ?? 0,
                ticket_redeemed: tx.ticketRedeemed ?? 0,
                ticket_expired: tx.ticketExpired ?? 0,
                amount:
                  (tx.creditSent ?? 0) +
                  (tx.chipsSent ?? 0) -
                  (tx.creditRedeemed ?? 0) -
                  (tx.chipsRedeemed ?? 0),
              };
            })
            .filter(Boolean);

          const skippedTxCount =
            rawData.transactions.length - transactionsToInsert.length;
          if (skippedTxCount > 0) {
            processingErrors.push(
              `Skipped ${skippedTxCount} transactions with invalid timestamps`,
            );
          }

          for (const batch of chunkArray(transactionsToInsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_chip_transactions")
              .insert(batch);

            if (error) {
              processingErrors.push(
                `Failed to insert transactions batch: ${error.message}`,
              );
            }
          }
        }

        // ============================================
        // STEP 5: Batch upsert sessions
        // ============================================
        if (rawData?.sessions?.length > 0) {
          const sessionsRaw = rawData.sessions
            .map((session: any) => {
              const startedAt = parseTimestamp(session.startedAt);
              if (!startedAt) return null; // Skip invalid

              return {
                team_id: teamId,
                import_id: importId,
                external_id: session.externalId,
                table_name: session.tableName ?? null,
                session_type: session.sessionType ?? "cash_game",
                game_variant: session.gameVariant ?? "nlh",
                started_at: startedAt,
                ended_at: parseTimestamp(session.endedAt),
                blinds: session.blinds ?? null,
                buy_in_amount: session.buyInAmount ?? null,
                guaranteed_prize: session.guaranteedPrize ?? null,
                total_rake: session.totalRake ?? 0,
                total_buy_in: session.totalBuyIn ?? 0,
                // totalWinnings is net result (can be negative), so cash_out = buy_in + winnings
                total_cash_out:
                  (session.totalBuyIn ?? 0) + (session.totalWinnings ?? 0),
                player_count:
                  session.playerCount ?? session.players?.length ?? 0,
                hands_played: session.handsPlayed ?? 0,
                created_by_id: session.createdByPpPokerId
                  ? playerIdMap.get(session.createdByPpPokerId)
                  : null,
              };
            })
            .filter(Boolean);

          // Deduplicate by external_id
          const sessionsToUpsert = deduplicateByKey(
            sessionsRaw as any[],
            (s) => s.external_id,
          );

          const skippedSessionCount =
            rawData.sessions.length - sessionsToUpsert.length;
          if (skippedSessionCount > 0) {
            processingErrors.push(
              `Skipped ${skippedSessionCount} sessions with invalid timestamps or duplicates`,
            );
          }

          for (const batch of chunkArray(sessionsToUpsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_sessions")
              .upsert(batch, { onConflict: "external_id,team_id" });

            if (error) {
              processingErrors.push(
                `Failed to upsert sessions batch: ${error.message}`,
              );
            }
          }
        }

        // ============================================
        // STEP 6: Get session IDs for session_players (if needed)
        // ============================================
        // Get all sessions we just created/updated using pagination (Supabase API defaults to 1000 rows max)
        const sessionIdMap = new Map<string, string>();
        let sessionOffset = 0;
        const SESSION_PAGE_SIZE = 1000;

        while (true) {
          const { data: sessionBatch, error: sessionError } = await supabase
            .from("poker_sessions")
            .select("id, external_id")
            .eq("team_id", teamId)
            .range(sessionOffset, sessionOffset + SESSION_PAGE_SIZE - 1);

          if (sessionError) {
            processingErrors.push(
              `Failed to fetch sessions for map: ${sessionError.message}`,
            );
            break;
          }

          if (!sessionBatch || sessionBatch.length === 0) {
            break;
          }

          for (const s of sessionBatch) {
            sessionIdMap.set(s.external_id, s.id);
          }

          // If we got less than a full page, we've reached the end
          if (sessionBatch.length < SESSION_PAGE_SIZE) {
            break;
          }

          sessionOffset += SESSION_PAGE_SIZE;
        }

        // ============================================
        // STEP 7: Batch upsert session players
        // ============================================
        if (rawData?.sessions?.length > 0) {
          const sessionPlayersRaw: any[] = [];

          for (const session of rawData.sessions) {
            const sessionId = sessionIdMap.get(session.externalId);
            if (!sessionId || !session.players?.length) continue;

            for (const player of session.players) {
              const playerId = playerIdMap.get(player.ppPokerId);
              if (!playerId) continue;

              sessionPlayersRaw.push({
                team_id: teamId,
                session_id: sessionId,
                player_id: playerId,
                // Identificação completa (100% coverage)
                nickname: player.nickname ?? null,
                memo_name: player.memoName ?? null,
                ranking: player.ranking ?? null,
                buy_in_chips: player.buyIn ?? player.buyInChips ?? 0,
                buy_in_ticket: player.buyInTicket ?? 0,
                cash_out: player.winnings ?? player.winningsGeneral ?? 0,
                winnings: player.winnings ?? player.winningsGeneral ?? 0,
                rake: player.rake ?? player.clubWinningsFee ?? 0,
                // Club winnings general (calculable but saving for completeness)
                club_winnings_general: player.clubWinningsGeneral ?? null,
                // New fields - CASH game detailed winnings
                hands: player.hands ?? null,
                winnings_opponents: player.winningsOpponents ?? null,
                winnings_jackpot: player.winningsJackpot ?? null,
                winnings_ev_split: player.winningsEvSplit ?? null,
                // Club winnings details
                club_winnings_jackpot_fee:
                  player.clubWinningsJackpotFee ?? null,
                club_winnings_jackpot_prize:
                  player.clubWinningsJackpotPrize ?? null,
                club_winnings_ev_split: player.clubWinningsEvSplit ?? null,
                // Tournament specific
                bounty: player.bounty ?? null,
                prize: player.prize ?? null,
              });
            }
          }

          // Deduplicate by session_id + player_id combination
          const sessionPlayersToUpsert = deduplicateByKey(
            sessionPlayersRaw,
            (sp) => `${sp.session_id}-${sp.player_id}`,
          );

          for (const batch of chunkArray(sessionPlayersToUpsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_session_players")
              .upsert(batch, { onConflict: "session_id,player_id" });

            if (error) {
              processingErrors.push(
                `Failed to upsert session players batch: ${error.message}`,
              );
            }
          }
        }

        // ============================================
        // STEP 8: Batch upsert player summaries
        // ============================================
        if (rawData?.summaries?.length > 0) {
          const periodStart = importRecord.period_start || rawData.periodStart;
          const periodEnd = importRecord.period_end || rawData.periodEnd;

          // Build a map of ppPokerId -> balance data from "Detalhes do usuário"
          // This captures the player's balance state at the time of the report
          const playerBalanceMap = new Map<
            string,
            {
              chipBalance: number;
              agentCreditBalance: number;
              superAgentCreditBalance: number;
            }
          >();

          for (const player of rawData?.players ?? []) {
            if (player.ppPokerId) {
              playerBalanceMap.set(String(player.ppPokerId), {
                chipBalance: player.chipBalance ?? 0,
                agentCreditBalance: player.agentCreditBalance ?? 0,
                superAgentCreditBalance: player.superAgentCreditBalance ?? 0,
              });
            }
          }

          if (periodStart && periodEnd) {
            const summariesRaw = rawData.summaries
              .map((summary: any) => {
                const playerId = playerIdMap.get(summary.ppPokerId);
                if (!playerId) return null;

                // Get balance snapshot from "Detalhes do usuário" sheet
                const balanceData = playerBalanceMap.get(
                  String(summary.ppPokerId),
                );

                return {
                  team_id: teamId,
                  import_id: importId,
                  player_id: playerId,
                  period_start: periodStart,
                  period_end: periodEnd,
                  // Balance snapshot at period end (from "Detalhes do usuário")
                  chip_balance: balanceData?.chipBalance ?? 0,
                  agent_credit_balance: balanceData?.agentCreditBalance ?? 0,
                  super_agent_credit_balance:
                    balanceData?.superAgentCreditBalance ?? 0,
                  winnings_total: summary.generalTotal ?? 0,
                  winnings_general: summary.generalTotal ?? 0,
                  winnings_ring: summary.ringGamesTotal ?? 0,
                  winnings_mtt_sitgo: summary.mttSitNGoTotal ?? 0,
                  winnings_spinup: summary.spinUpTotal ?? 0,
                  winnings_caribbean: summary.caribbeanTotal ?? 0,
                  winnings_color_game: summary.colorGameTotal ?? 0,
                  winnings_crash: summary.crashTotal ?? 0,
                  winnings_lucky_draw: summary.luckyDrawTotal ?? 0,
                  winnings_jackpot:
                    summary.jackpotTotal ?? summary.jackpotPrize ?? 0,
                  winnings_ev_split: summary.evSplitTotal ?? 0,
                  club_earnings_general: summary.feeGeneral ?? 0,
                  rake_total: summary.feeGeneral ?? summary.fee ?? 0,
                  rake_ppst: summary.feePpst ?? 0,
                  rake_ppsr: summary.feePpsr ?? 0,
                  rake_non_ppst: summary.feeNonPpst ?? 0,
                  rake_non_ppsr: summary.feeNonPpsr ?? 0,
                  club_earnings_jackpot: summary.jackpotFee ?? 0,
                  // Classifications (K-N)
                  classification_ppsr: summary.classificationPpsr ?? 0,
                  classification_ring: summary.classificationRing ?? 0,
                  classification_custom_ring:
                    summary.classificationCustomRing ?? 0,
                  classification_mtt: summary.classificationMtt ?? 0,
                  // Tickets (Y-AA)
                  ticket_value_won: summary.ticketValueWon ?? 0,
                  ticket_buy_in: summary.ticketBuyIn ?? 0,
                  custom_prize_value: summary.customPrizeValue ?? 0,
                  // SPINUP details (AH-AI)
                  spinup_buy_in: summary.spinUpBuyIn ?? 0,
                  spinup_prize: summary.spinUpPrize ?? 0,
                  // Caribbean (AJ-AK)
                  caribbean_bets: summary.caribbeanBets ?? 0,
                  caribbean_prize: summary.caribbeanPrize ?? 0,
                  // Color Game (AL-AM)
                  color_game_bets: summary.colorGameBets ?? 0,
                  color_game_prize: summary.colorGamePrize ?? 0,
                  // Crash (AN-AO)
                  crash_bets: summary.crashBets ?? 0,
                  crash_prize: summary.crashPrize ?? 0,
                  // Lucky Draw (AP-AQ)
                  lucky_draw_bets: summary.luckyDrawBets ?? 0,
                  lucky_draw_prize: summary.luckyDrawPrize ?? 0,
                  // EV Split (AT)
                  ev_split: summary.evSplit ?? 0,
                  // Ticket delivered (AU-AV)
                  ticket_delivered_value: summary.ticketDeliveredValue ?? 0,
                  ticket_delivered_buy_in: summary.ticketDeliveredBuyIn ?? 0,
                };
              })
              .filter(Boolean);

            // Deduplicate by player_id (since period_start and period_end are the same for all)
            const summariesToUpsert = deduplicateByKey(
              summariesRaw as any[],
              (s) => s.player_id,
            );

            for (const batch of chunkArray(summariesToUpsert, BATCH_SIZE)) {
              const { error } = await supabase
                .from("poker_player_summary")
                .upsert(batch, {
                  onConflict: "player_id,period_start,period_end",
                });

              if (error) {
                processingErrors.push(
                  `Failed to upsert summaries batch: ${error.message}`,
                );
              }
            }
          }
        }

        // ============================================
        // STEP 9: Batch upsert player detailed data
        // ============================================
        if (rawData?.detailed?.length > 0) {
          const periodStart = importRecord.period_start || rawData.periodStart;
          const periodEnd = importRecord.period_end || rawData.periodEnd;

          if (periodStart && periodEnd) {
            const detailedRaw = rawData.detailed
              .map((d: any) => {
                const playerId = playerIdMap.get(d.ppPokerId);
                if (!playerId) return null;

                return {
                  team_id: teamId,
                  import_id: importId,
                  player_id: playerId,
                  period_start: periodStart,
                  period_end: periodEnd,
                  date: d.date ? parseTimestamp(d.date) : null,
                  // Identificação completa (A-I)
                  country: d.country || null,
                  nickname: d.nickname || null,
                  memo_name: d.memoName || null,
                  agent_nickname: d.agentNickname || null,
                  agent_pppoker_id: d.agentPpPokerId || null,
                  super_agent_nickname: d.superAgentNickname || null,
                  super_agent_pppoker_id: d.superAgentPpPokerId || null,
                  // Ganhos NLH (J-R)
                  nlh_regular: d.nlhRegular ?? 0,
                  nlh_three_one: d.nlhThreeOne ?? 0,
                  nlh_three_one_f: d.nlhThreeOneF ?? 0,
                  nlh_six_plus: d.nlhSixPlus ?? 0,
                  nlh_aof: d.nlhAof ?? 0,
                  nlh_sitng: d.nlhSitNGo ?? 0,
                  nlh_spinup: d.nlhSpinUp ?? 0,
                  nlh_mtt: d.nlhMtt ?? 0,
                  nlh_mtt_six_plus: d.nlhMttSixPlus ?? 0,
                  // Ganhos PLO (S-AB)
                  plo4: d.plo4 ?? 0,
                  plo5: d.plo5 ?? 0,
                  plo6: d.plo6 ?? 0,
                  plo4_hilo: d.plo4Hilo ?? 0,
                  plo5_hilo: d.plo5Hilo ?? 0,
                  plo6_hilo: d.plo6Hilo ?? 0,
                  plo_sitng: d.ploSitNGo ?? 0,
                  plo_mtt_plo4: d.ploMttPlo4 ?? 0,
                  plo_mtt_plo5: d.ploMttPlo5 ?? 0,
                  plo_nlh: d.ploNlh ?? 0,
                  // FLASH e outros (AC-AO)
                  flash_plo4: d.flashPlo4 ?? 0,
                  flash_plo5: d.flashPlo5 ?? 0,
                  mixed_game: d.mixedGame ?? 0,
                  ofc: d.ofc ?? 0,
                  seka_36: d.seka36 ?? 0,
                  seka_32: d.seka32 ?? 0,
                  seka_21: d.seka21 ?? 0,
                  teen_patti_regular: d.teenPattiRegular ?? 0,
                  teen_patti_ak47: d.teenPattiAk47 ?? 0,
                  teen_patti_hukam: d.teenPattiHukam ?? 0,
                  teen_patti_muflis: d.teenPattiMuflis ?? 0,
                  tongits: d.tongits ?? 0,
                  pusoy: d.pusoy ?? 0,
                  // Cassino (AP-AU)
                  caribbean: d.caribbean ?? 0,
                  color_game: d.colorGame ?? 0,
                  crash: d.crash ?? 0,
                  lucky_draw: d.luckyDraw ?? 0,
                  jackpot: d.jackpot ?? 0,
                  ev_split_winnings: d.evSplitWinnings ?? 0,
                  // Totais (AV)
                  total_winnings: d.totalWinnings ?? 0,
                  // Classificações (AW-AZ)
                  classification_ppsr: d.classificationPpsr ?? 0,
                  classification_ring: d.classificationRing ?? 0,
                  classification_custom_ring: d.classificationCustomRing ?? 0,
                  classification_mtt: d.classificationMtt ?? 0,
                  // Valores Gerais (BA-BD)
                  general_plus_events: d.generalPlusEvents ?? 0,
                  ticket_value_won: d.ticketValueWon ?? 0,
                  ticket_buy_in: d.ticketBuyIn ?? 0,
                  custom_prize_value: d.customPrizeValue ?? 0,
                  // ============================================
                  // TAXA POR VARIANTE (BE-CI) - 33 colunas
                  // ============================================
                  // Taxa NLH (BE-BM)
                  fee_nlh_regular: d.feeNlhRegular ?? 0,
                  fee_nlh_three_one: d.feeNlhThreeOne ?? 0,
                  fee_nlh_three_one_f: d.feeNlhThreeOneF ?? 0,
                  fee_nlh_six_plus: d.feeNlhSixPlus ?? 0,
                  fee_nlh_aof: d.feeNlhAof ?? 0,
                  fee_nlh_sitng: d.feeNlhSitNGo ?? 0,
                  fee_nlh_spinup: d.feeNlhSpinUp ?? 0,
                  fee_nlh_mtt: d.feeNlhMtt ?? 0,
                  fee_nlh_mtt_six_plus: d.feeNlhMttSixPlus ?? 0,
                  // Taxa PLO (BN-BU)
                  fee_plo4: d.feePlo4 ?? 0,
                  fee_plo5: d.feePlo5 ?? 0,
                  fee_plo6: d.feePlo6 ?? 0,
                  fee_plo4_hilo: d.feePlo4Hilo ?? 0,
                  fee_plo5_hilo: d.feePlo5Hilo ?? 0,
                  fee_plo6_hilo: d.feePlo6Hilo ?? 0,
                  fee_plo_sitng: d.feePloSitNGo ?? 0,
                  fee_plo_mtt_plo4: d.feePloMttPlo4 ?? 0,
                  fee_plo_mtt_plo5: d.feePloMttPlo5 ?? 0,
                  // Taxa FLASH e outros (BV-CI)
                  fee_flash_nlh: d.feeFlashNlh ?? 0,
                  fee_flash_plo4: d.feeFlashPlo4 ?? 0,
                  fee_flash_plo5: d.feeFlashPlo5 ?? 0,
                  fee_mixed_game: d.feeMixedGame ?? 0,
                  fee_ofc: d.feeOfc ?? 0,
                  fee_seka_36: d.feeSeka36 ?? 0,
                  fee_seka_32: d.feeSeka32 ?? 0,
                  fee_seka_21: d.feeSeka21 ?? 0,
                  fee_teen_patti_regular: d.feeTeenPattiRegular ?? 0,
                  fee_teen_patti_ak47: d.feeTeenPattiAk47 ?? 0,
                  fee_teen_patti_hukam: d.feeTeenPattiHukam ?? 0,
                  fee_teen_patti_muflis: d.feeTeenPattiMuflis ?? 0,
                  fee_tongits: d.feeTongits ?? 0,
                  fee_pusoy: d.feePusoy ?? 0,
                  // Taxa Total (CJ)
                  fee_total: d.feeTotal ?? 0,
                  // SPINUP (CK-CL)
                  spinup_buy_in: d.spinUpBuyIn ?? 0,
                  spinup_prize: d.spinUpPrize ?? 0,
                  // Jackpot (CM-CN)
                  jackpot_fee: d.jackpotFee ?? 0,
                  jackpot_prize: d.jackpotPrize ?? 0,
                  // EV Split (CO-CQ)
                  ev_split_nlh: d.evSplitNlh ?? 0,
                  ev_split_plo: d.evSplitPlo ?? 0,
                  ev_split_total: d.evSplitTotal ?? 0,
                  // Ticket entregue (CR)
                  ticket_delivered_value: d.ticketDeliveredValue ?? 0,
                  // Fichas (CS-CY)
                  chip_ticket_buy_in: d.chipTicketBuyIn ?? 0,
                  chip_sent: d.chipSent ?? 0,
                  chip_class_ppsr: d.chipClassPpsr ?? 0,
                  chip_class_ring: d.chipClassRing ?? 0,
                  chip_class_custom_ring: d.chipClassCustomRing ?? 0,
                  chip_class_mtt: d.chipClassMtt ?? 0,
                  chip_redeemed: d.chipRedeemed ?? 0,
                  // Crédito (CZ-DC)
                  credit_left_club: d.creditLeftClub ?? 0,
                  credit_sent: d.creditSent ?? 0,
                  credit_redeemed: d.creditRedeemed ?? 0,
                  credit_left_club_2: d.creditLeftClub2 ?? 0,
                  // ============================================
                  // MÃOS POR VARIANTE (DD-EG) - 36 colunas
                  // ============================================
                  // Mãos NLH (DD-DH)
                  hands_nlh_regular: d.handsNlhRegular ?? 0,
                  hands_nlh_three_one: d.handsNlhThreeOne ?? 0,
                  hands_nlh_three_one_f: d.handsNlhThreeOneF ?? 0,
                  hands_nlh_six_plus: d.handsNlhSixPlus ?? 0,
                  hands_nlh_aof: d.handsNlhAof ?? 0,
                  // Mãos PLO (DI-DN)
                  hands_plo4: d.handsPlo4 ?? 0,
                  hands_plo5: d.handsPlo5 ?? 0,
                  hands_plo6: d.handsPlo6 ?? 0,
                  hands_plo4_hilo: d.handsPlo4Hilo ?? 0,
                  hands_plo5_hilo: d.handsPlo5Hilo ?? 0,
                  hands_plo6_hilo: d.handsPlo6Hilo ?? 0,
                  // Mãos FLASH (DO-DQ)
                  hands_flash_nlh: d.handsFlashNlh ?? 0,
                  hands_flash_plo4: d.handsFlashPlo4 ?? 0,
                  hands_flash_plo5: d.handsFlashPlo5 ?? 0,
                  // Mãos outros (DR-EF)
                  hands_mixed_game: d.handsMixedGame ?? 0,
                  hands_ofc: d.handsOfc ?? 0,
                  hands_seka_36: d.handsSeka36 ?? 0,
                  hands_seka_32: d.handsSeka32 ?? 0,
                  hands_seka_21: d.handsSeka21 ?? 0,
                  hands_teen_patti_regular: d.handsTeenPattiRegular ?? 0,
                  hands_teen_patti_ak47: d.handsTeenPattiAk47 ?? 0,
                  hands_teen_patti_hukam: d.handsTeenPattiHukam ?? 0,
                  hands_teen_patti_muflis: d.handsTeenPattiMuflis ?? 0,
                  hands_tongits: d.handsTongits ?? 0,
                  hands_pusoy: d.handsPusoy ?? 0,
                  hands_caribbean: d.handsCaribbean ?? 0,
                  hands_color_game: d.handsColorGame ?? 0,
                  hands_crash: d.handsCrash ?? 0,
                  hands_lucky_draw: d.handsLuckyDraw ?? 0,
                  // Mãos Total (EG)
                  hands_total: d.handsTotal ?? 0,
                };
              })
              .filter(Boolean);

            // Deduplicate by player_id + date
            const detailedToUpsert = deduplicateByKey(
              detailedRaw as any[],
              (d) => `${d.player_id}-${d.date || "null"}`,
            );

            for (const batch of chunkArray(detailedToUpsert, BATCH_SIZE)) {
              const { error } = await supabase
                .from("poker_player_detailed")
                .upsert(batch, {
                  onConflict: "player_id,period_start,period_end,date",
                });

              if (error) {
                processingErrors.push(
                  `Failed to upsert detailed batch: ${error.message}`,
                );
              }
            }
          }
        }

        // ============================================
        // STEP 10: Batch upsert agent rakeback data
        // ============================================
        if (rawData?.rakebacks?.length > 0) {
          const periodStart = importRecord.period_start || rawData.periodStart;
          const periodEnd = importRecord.period_end || rawData.periodEnd;

          if (periodStart && periodEnd) {
            const rakebacksRaw = rawData.rakebacks.map((rb: any) => {
              const agentId = playerIdMap.get(rb.agentPpPokerId);
              const superAgentId = rb.superAgentPpPokerId
                ? playerIdMap.get(rb.superAgentPpPokerId)
                : null;

              return {
                team_id: teamId,
                import_id: importId,
                period_start: periodStart,
                period_end: periodEnd,
                agent_id: agentId ?? null,
                agent_pppoker_id: rb.agentPpPokerId,
                agent_nickname: rb.agentNickname ?? null,
                memo_name: rb.memoName ?? null,
                country: rb.country ?? null,
                super_agent_id: superAgentId ?? null,
                super_agent_pppoker_id: rb.superAgentPpPokerId ?? null,
                average_rakeback_percent: rb.averageRakebackPercent ?? 0,
                total_rt: rb.totalRt ?? 0,
              };
            });

            // Deduplicate by agent_pppoker_id
            const rakebacksToUpsert = deduplicateByKey(
              rakebacksRaw,
              (rb) => rb.agent_pppoker_id,
            );

            for (const batch of chunkArray(rakebacksToUpsert, BATCH_SIZE)) {
              const { error } = await supabase
                .from("poker_agent_rakeback")
                .upsert(batch, {
                  onConflict:
                    "team_id,agent_pppoker_id,period_start,period_end",
                });

              if (error) {
                processingErrors.push(
                  `Failed to upsert rakebacks batch: ${error.message}`,
                );
              }
            }
          }
        }

        // ============================================
        // STEP 11: Batch insert demonstrativo data
        // ============================================
        if (rawData?.demonstrativo?.length > 0) {
          const demonstrativoToInsert = rawData.demonstrativo
            .map((d: any) => {
              const occurredAt = parseTimestamp(d.occurredAt);
              const playerId = d.ppPokerId
                ? playerIdMap.get(d.ppPokerId)
                : null;

              return {
                team_id: teamId,
                occurred_at: occurredAt,
                player_id: playerId ?? null,
                pppoker_id: d.ppPokerId || null,
                nickname: d.nickname || null,
                memo_name: d.memoName || null,
                type: d.type || null,
                amount: d.amount ?? 0,
                import_id: input.id,
              };
            })
            .filter((d: any) => d.occurred_at || d.pppoker_id); // Keep if has date or player ID

          for (const batch of chunkArray(demonstrativoToInsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_demonstrativo")
              .insert(batch);

            if (error) {
              processingErrors.push(
                `Failed to insert demonstrativo batch: ${error.message}`,
              );
            }
          }
        }

        // ============================================
        // STEP 12: Calculate and update activity metrics for all players
        // ============================================
        try {
          // Get all player IDs that were affected by this import
          const affectedPlayerIds = Array.from(playerIdMap.values());

          if (affectedPlayerIds.length > 0) {
            // Calculate activity metrics in batches
            const activityBatchSize = 100;
            for (
              let i = 0;
              i < affectedPlayerIds.length;
              i += activityBatchSize
            ) {
              const batchIds = affectedPlayerIds.slice(
                i,
                i + activityBatchSize,
              );
              const metricsMap = await calculateBatchActivityMetrics(
                supabase,
                teamId,
                batchIds,
              );

              // Update each player with their activity metrics
              for (const [playerId, metrics] of metricsMap) {
                const { error } = await supabase
                  .from("poker_players")
                  .update({
                    last_session_at: metrics.lastSessionAt ?? null,
                    sessions_last_4_weeks: metrics.sessionsLast4Weeks ?? 0,
                    weeks_active_last_4: metrics.weeksActiveLast4 ?? 0,
                    days_since_last_session:
                      metrics.daysSinceLastSession ?? null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", playerId)
                  .eq("team_id", teamId);

                if (error) {
                  // Don't fail the import for activity metrics errors
                  logger.error(
                    { playerId, error: error.message },
                    "Failed to update activity metrics for player",
                  );
                }
              }
            }
          }
        } catch (activityError: any) {
          // Don't fail the import for activity calculation errors
          logger.error(
            { error: activityError.message },
            "Activity metrics calculation error",
          );
          processingErrors.push(
            `Warning: Failed to calculate activity metrics: ${activityError.message}`,
          );
        }

        // Update status to completed
        await supabase
          .from("poker_imports")
          .update({
            status: processingErrors.length > 0 ? "failed" : "completed",
            processed_at: new Date().toISOString(),
            processed_by_id: userId,
            processing_errors:
              processingErrors.length > 0 ? processingErrors : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.id);

        return {
          id: input.id,
          success: processingErrors.length === 0,
          errors: processingErrors,
        };
      } catch (err: any) {
        // Update status to failed
        await supabase
          .from("poker_imports")
          .update({
            status: "failed",
            processing_errors: [err.message],
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.id);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err.message,
        });
      }
    }),

  /**
   * Cancel an import
   */
  cancel: protectedProcedure
    .input(cancelPokerImportSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_imports")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("team_id", teamId)
        .in("status", ["pending", "validating", "validated"]);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),

  /**
   * Delete an import record
   */
  delete: protectedProcedure
    .input(getPokerImportByIdSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_imports")
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
