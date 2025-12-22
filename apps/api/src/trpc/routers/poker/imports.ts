import { createAdminClient } from "@api/services/supabase";
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

export const pokerImportsRouter = createTRPCRouter({
  /**
   * Get poker imports with pagination
   */
  get: protectedProcedure
    .input(getPokerImportsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { cursor, pageSize = 20, status } = input ?? {};

      let query = supabase
        .from("poker_imports")
        .select("*", { count: "exact" })
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
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
        data: (data ?? []).map((imp) => ({
          id: imp.id,
          createdAt: imp.created_at,
          updatedAt: imp.updated_at,
          fileName: imp.file_name,
          fileSize: imp.file_size,
          fileType: imp.file_type,
          status: imp.status,
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
          processedAt: imp.processed_at,
        })),
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
            message: "Import not found",
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
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_imports")
        .insert({
          team_id: teamId,
          file_name: input.fileName,
          file_size: input.fileSize,
          file_type: input.fileType,
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
          message: "Import not found",
        });
      }

      const rawData = importRecord.raw_data as any;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Count entities
      const totalPlayers = rawData?.players?.length ?? 0;
      const totalSessions = rawData?.sessions?.length ?? 0;
      const totalTransactions = rawData?.transactions?.length ?? 0;

      // Get existing players to determine new vs update
      const { data: existingPlayers } = await supabase
        .from("poker_players")
        .select("pppoker_id")
        .eq("team_id", teamId);

      const existingIds = new Set(
        (existingPlayers ?? []).map((p) => p.pppoker_id)
      );

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
      if (totalPlayers === 0 && totalTransactions === 0 && totalSessions === 0) {
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
          message: "Import not found",
        });
      }

      if (importRecord.status !== "validated") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Import must be validated before processing",
        });
      }

      // Update status to processing
      await supabase
        .from("poker_imports")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", input.id);

      const rawData = importRecord.raw_data as any;
      const processingErrors: string[] = [];

      try {
        // Process players (upsert)
        if (rawData?.players?.length > 0) {
          // First, get or create agents
          const agentMap = new Map<string, string>();

          for (const player of rawData.players) {
            if (player.agentPpPokerId && !agentMap.has(player.agentPpPokerId)) {
              // Check if agent exists
              const { data: existingAgent } = await supabase
                .from("poker_players")
                .select("id")
                .eq("team_id", teamId)
                .eq("pppoker_id", player.agentPpPokerId)
                .single();

              if (existingAgent) {
                agentMap.set(player.agentPpPokerId, existingAgent.id);
              }
            }
          }

          // Upsert players
          for (const player of rawData.players) {
            const agentId = player.agentPpPokerId
              ? agentMap.get(player.agentPpPokerId)
              : null;

            const { error: upsertError } = await supabase
              .from("poker_players")
              .upsert(
                {
                  team_id: teamId,
                  pppoker_id: player.ppPokerId,
                  nickname: player.nickname,
                  memo_name: player.memoName ?? null,
                  country: player.country ?? null,
                  type: player.agentPpPokerId ? "player" : "player",
                  agent_id: agentId,
                  chip_balance: player.chipBalance ?? 0,
                  agent_credit_balance: player.agentCreditBalance ?? 0,
                  last_active_at: player.lastActiveAt ?? null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "pppoker_id,team_id" }
              );

            if (upsertError) {
              processingErrors.push(
                `Failed to upsert player ${player.nickname}: ${upsertError.message}`
              );
            }
          }
        }

        // Process transactions
        if (rawData?.transactions?.length > 0) {
          // Get player ID map
          const { data: allPlayers } = await supabase
            .from("poker_players")
            .select("id, pppoker_id")
            .eq("team_id", teamId);

          const playerIdMap = new Map(
            (allPlayers ?? []).map((p) => [p.pppoker_id, p.id])
          );

          for (const tx of rawData.transactions) {
            const senderPlayerId = tx.senderPlayerId
              ? playerIdMap.get(tx.senderPlayerId)
              : null;
            const recipientPlayerId = tx.recipientPlayerId
              ? playerIdMap.get(tx.recipientPlayerId)
              : null;

            const { error: txError } = await supabase
              .from("poker_chip_transactions")
              .insert({
                team_id: teamId,
                occurred_at: tx.occurredAt,
                type: tx.creditSent ? "credit_given" : "transfer_in",
                sender_club_id: tx.senderClubId ?? null,
                sender_player_id: senderPlayerId,
                recipient_player_id: recipientPlayerId,
                credit_sent: tx.creditSent ?? 0,
                credit_redeemed: tx.creditRedeemed ?? 0,
                chips_sent: tx.chipsSent ?? 0,
                chips_redeemed: tx.chipsRedeemed ?? 0,
                amount:
                  (tx.creditSent ?? 0) +
                  (tx.chipsSent ?? 0) -
                  (tx.creditRedeemed ?? 0) -
                  (tx.chipsRedeemed ?? 0),
              });

            if (txError) {
              processingErrors.push(
                `Failed to insert transaction: ${txError.message}`
              );
            }
          }
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
