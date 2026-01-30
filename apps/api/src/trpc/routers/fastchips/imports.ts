import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import {
  cancelFastchipsImportSchema,
  createFastchipsImportSchema,
  getFastchipsImportByIdSchema,
  getFastchipsImportsSchema,
  processFastchipsImportSchema,
  validateFastchipsImportSchema,
} from "../../../schemas/fastchips/imports";
import { createTRPCRouter, protectedProcedure } from "../../init";

/**
 * Maps UI operation type to database enum value
 */
function normalizeOperationType(type: string): "entrada" | "saida" {
  return type === "Entrada" ? "entrada" : "saida";
}

/**
 * Maps UI purpose to database enum value
 */
function normalizePurpose(
  purpose: string,
): "recebimento" | "pagamento" | "saque" | "servico" {
  const mapping: Record<
    string,
    "recebimento" | "pagamento" | "saque" | "servico"
  > = {
    Recebimento: "recebimento",
    Pagamento: "pagamento",
    Saque: "saque",
    Serviço: "servico",
  };
  return mapping[purpose] ?? "recebimento";
}

/**
 * Parses a date string in DD-MM-YYYY HH:MM format to ISO timestamp
 */
function parseFastchipsDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Expected format: DD-MM-YYYY HH:MM
  const match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, day, month, year, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const fastchipsImportsRouter = createTRPCRouter({
  /**
   * Get fastchips imports with pagination
   */
  get: protectedProcedure
    .input(getFastchipsImportsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { cursor, pageSize = 20, status } = input ?? {};

      let query = supabase
        .from("fastchips_imports")
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
        data: (data ?? []).map((imp) => {
          const rawData = imp.raw_data as any;
          const operations = rawData?.operations ?? [];

          // Calculate stats
          const uniqueMembers = new Set(
            operations.map((op: any) => op.memberName),
          );
          const totalEntries = operations.filter(
            (op: any) => op.operationType === "Entrada",
          ).length;
          const totalExits = operations.filter(
            (op: any) => op.operationType === "Saída",
          ).length;

          // Calculate totals
          const grossEntryTotal = operations.reduce(
            (sum: number, op: any) => sum + (op.grossEntry ?? 0),
            0,
          );
          const grossExitTotal = operations.reduce(
            (sum: number, op: any) => sum + (op.grossExit ?? 0),
            0,
          );
          const netEntryTotal = operations.reduce(
            (sum: number, op: any) => sum + (op.netEntry ?? 0),
            0,
          );
          const netExitTotal = operations.reduce(
            (sum: number, op: any) => sum + (op.netExit ?? 0),
            0,
          );

          return {
            id: imp.id,
            createdAt: imp.created_at,
            updatedAt: imp.updated_at,
            fileName: imp.file_name,
            fileSize: imp.file_size,
            status: imp.status,
            periodStart: imp.period_start,
            periodEnd: imp.period_end,
            totalOperations: imp.total_operations ?? 0,
            totalMembers: imp.total_members ?? 0,
            newMembers: imp.new_members ?? 0,
            validationPassed: imp.validation_passed ?? false,
            validationErrors: imp.validation_errors,
            validationWarnings: imp.validation_warnings,
            processingErrors: imp.processing_errors,
            processedAt: imp.processed_at,
            stats: {
              uniqueMembers: uniqueMembers.size,
              totalEntries,
              totalExits,
              grossEntryTotal,
              grossExitTotal,
              netEntryTotal,
              netExitTotal,
            },
          };
        }),
      };
    }),

  /**
   * Get a single import by ID
   */
  getById: protectedProcedure
    .input(getFastchipsImportByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("fastchips_imports")
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
        status: data.status,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        totalOperations: data.total_operations ?? 0,
        totalMembers: data.total_members ?? 0,
        newMembers: data.new_members ?? 0,
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
    .input(createFastchipsImportSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("fastchips_imports")
        .insert({
          team_id: teamId,
          file_name: input.fileName,
          file_size: input.fileSize,
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
    .input(validateFastchipsImportSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get the import record
      const { data: importRecord, error: fetchError } = await supabase
        .from("fastchips_imports")
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
      const operations = rawData?.operations ?? [];
      const totalOperations = operations.length;

      // Extract unique members
      const memberNames = new Set<string>();
      for (const op of operations) {
        if (op.memberName) {
          memberNames.add(op.memberName);
        }
      }
      const totalMembers = memberNames.size;

      // Get existing members to determine new vs update
      const existingNames = new Set<string>();
      const { data: existingMembers } = await supabase
        .from("fastchips_members")
        .select("name")
        .eq("team_id", teamId);

      for (const member of existingMembers ?? []) {
        existingNames.add(member.name);
      }

      let newMembers = 0;
      for (const name of memberNames) {
        if (!existingNames.has(name)) {
          newMembers++;
        }
      }

      // Determine period from operations
      let periodStart: string | null = null;
      let periodEnd: string | null = null;

      if (operations.length > 0) {
        const dates = operations
          .map((op: any) => parseFastchipsDate(op.occurredAt))
          .filter(Boolean)
          .sort();
        periodStart = dates[0] ?? null;
        periodEnd = dates[dates.length - 1] ?? null;
      }

      // Validation checks
      if (totalOperations === 0) {
        errors.push("No operations found in the import file");
      }

      if (totalMembers === 0) {
        errors.push("No members found in the operations");
      }

      // Check for invalid operation IDs
      const invalidOperationIds = operations.filter(
        (op: any) => !op.operationId || !/^[a-f0-9]{24}$/i.test(op.operationId),
      );
      if (invalidOperationIds.length > 0) {
        warnings.push(
          `${invalidOperationIds.length} operations have invalid operation IDs`,
        );
      }

      // Check for invalid dates
      const invalidDates = operations.filter(
        (op: any) => !parseFastchipsDate(op.occurredAt),
      );
      if (invalidDates.length > 0) {
        errors.push(
          `${invalidDates.length} operations have invalid date format`,
        );
      }

      if (newMembers > 50) {
        warnings.push(`${newMembers} new members will be created`);
      }

      const validationPassed = errors.length === 0;

      // Update the import record
      const { error: updateError } = await supabase
        .from("fastchips_imports")
        .update({
          status: validationPassed ? "validated" : "failed",
          period_start: periodStart,
          period_end: periodEnd,
          total_operations: totalOperations,
          total_members: totalMembers,
          new_members: newMembers,
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
        totalOperations,
        totalMembers,
        newMembers,
        errors,
        warnings,
      };
    }),

  /**
   * Process validated import
   */
  process: protectedProcedure
    .input(processFastchipsImportSchema)
    .mutation(async ({ input, ctx: { teamId, userId } }) => {
      const supabase = await createAdminClient();

      // Get the import record
      const { data: importRecord, error: fetchError } = await supabase
        .from("fastchips_imports")
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
        .from("fastchips_imports")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", input.id);

      const rawData = importRecord.raw_data as any;
      const operations = rawData?.operations ?? [];
      const processingErrors: string[] = [];

      const BATCH_SIZE = 500;

      // Helper to split array into chunks
      const chunkArray = <T>(array: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      };

      try {
        // ============================================
        // STEP 1: Extract and upsert unique members
        // ============================================
        const memberNames = new Set<string>();
        for (const op of operations) {
          if (op.memberName) {
            memberNames.add(op.memberName);
          }
        }

        // Get PPPoker IDs for members (most recent occurrence)
        const memberPpPokerIds = new Map<string, string | null>();
        for (const op of operations) {
          if (op.memberName && op.ppPokerId) {
            memberPpPokerIds.set(op.memberName, op.ppPokerId);
          }
        }

        const membersToUpsert = Array.from(memberNames).map((name) => ({
          team_id: teamId,
          name,
          pppoker_id: memberPpPokerIds.get(name) ?? null,
          status: "active",
          updated_at: new Date().toISOString(),
        }));

        for (const batch of chunkArray(membersToUpsert, BATCH_SIZE)) {
          const { error } = await supabase
            .from("fastchips_members")
            .upsert(batch, { onConflict: "name,team_id" });

          if (error) {
            processingErrors.push(
              `Failed to upsert members batch: ${error.message}`,
            );
          }
        }

        // ============================================
        // STEP 2: Get member ID map
        // ============================================
        const memberIdMap = new Map<string, string>();
        const { data: allMembers, error: memberError } = await supabase
          .from("fastchips_members")
          .select("id, name")
          .eq("team_id", teamId);

        if (memberError) {
          processingErrors.push(
            `Failed to fetch members: ${memberError.message}`,
          );
        } else {
          for (const member of allMembers ?? []) {
            memberIdMap.set(member.name, member.id);
          }
        }

        // ============================================
        // STEP 3: Insert operations (check for duplicates)
        // ============================================
        // Get existing operation external IDs
        const existingExternalIds = new Set<string>();
        const { data: existingOps } = await supabase
          .from("fastchips_operations")
          .select("external_id")
          .eq("team_id", teamId);

        for (const op of existingOps ?? []) {
          existingExternalIds.add(op.external_id);
        }

        const operationsToInsert = operations
          .filter((op: any) => !existingExternalIds.has(op.operationId))
          .map((op: any) => {
            const memberId = memberIdMap.get(op.memberName);
            const occurredAt = parseFastchipsDate(op.occurredAt);
            if (!memberId || !occurredAt) return null;

            const operationType = normalizeOperationType(op.operationType);
            const purpose = normalizePurpose(op.purpose);

            // Determine gross and net amounts based on operation type
            const grossAmount =
              operationType === "entrada"
                ? (op.grossEntry ?? 0)
                : (op.grossExit ?? 0);
            const netAmount =
              operationType === "entrada"
                ? (op.netEntry ?? 0)
                : (op.netExit ?? 0);
            const feeAmount = grossAmount - netAmount;

            return {
              team_id: teamId,
              import_id: input.id,
              external_id: op.operationId,
              payment_id: op.paymentId ?? "",
              occurred_at: occurredAt,
              operation_type: operationType,
              purpose,
              member_id: memberId,
              member_name: op.memberName,
              pppoker_id: op.ppPokerId ?? null,
              gross_amount: grossAmount,
              net_amount: netAmount,
              fee_rate: op.feeRate ?? 0,
              fee_amount: feeAmount,
            };
          })
          .filter(Boolean);

        const skippedCount = operations.length - operationsToInsert.length;
        if (skippedCount > 0) {
          processingErrors.push(
            `Skipped ${skippedCount} operations (duplicates or invalid)`,
          );
        }

        for (const batch of chunkArray(
          operationsToInsert as any[],
          BATCH_SIZE,
        )) {
          const { error } = await supabase
            .from("fastchips_operations")
            .insert(batch);

          if (error) {
            processingErrors.push(
              `Failed to insert operations batch: ${error.message}`,
            );
          }
        }

        // ============================================
        // STEP 4: Update member linked accounts count
        // ============================================
        // Count linked accounts per member
        for (const memberId of memberIdMap.values()) {
          const { count } = await supabase
            .from("fastchips_linked_accounts")
            .select("*", { count: "exact", head: true })
            .eq("member_id", memberId);

          await supabase
            .from("fastchips_members")
            .update({
              total_linked_accounts: count ?? 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", memberId);
        }

        // Update status to completed
        await supabase
          .from("fastchips_imports")
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
          .from("fastchips_imports")
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
    .input(cancelFastchipsImportSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("fastchips_imports")
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
    .input(getFastchipsImportByIdSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("fastchips_imports")
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
