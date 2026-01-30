import {
  createTransactionSchema,
  deleteTransactionsSchema,
  getSimilarTransactionsSchema,
  getTransactionByIdSchema,
  getTransactionsSchema,
  searchTransactionMatchSchema,
  updateTransactionSchema,
  updateTransactionsSchema,
} from "@api/schemas/transactions";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import {
  getSimilarTransactions,
  searchTransactionMatch,
} from "@midpoker/db/queries";
import type { EmbedTransactionPayload } from "@midpoker/jobs/schema";
import { tasks } from "@trigger.dev/sdk";

export const transactionsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getTransactionsSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const { cursor, sort, pageSize = 50, filter } = input;

      let query = supabase
        .from("transactions")
        .select(
          `
          id,
          date,
          amount,
          currency,
          method,
          status,
          note,
          manual,
          internal,
          recurring,
          frequency,
          name,
          description,
          created_at,
          category_slug,
          bank_account_id
        `,
          { count: "exact" },
        )
        .eq("team_id", teamId);

      // Apply filters
      if (filter?.statuses?.length) {
        query = query.in("status", filter.statuses);
      }
      if (filter?.categories?.length) {
        query = query.in("category_slug", filter.categories);
      }
      if (filter?.accounts?.length) {
        query = query.in("bank_account_id", filter.accounts);
      }
      if (filter?.start) {
        query = query.gte("date", filter.start);
      }
      if (filter?.end) {
        query = query.lte("date", filter.end);
      }
      if (filter?.q) {
        query = query.or(
          `name.ilike.%${filter.q}%,description.ilike.%${filter.q}%`,
        );
      }

      // Apply sorting
      const sortColumn = sort?.[0]?.id ?? "date";
      const sortOrder = sort?.[0]?.desc ?? true;
      query = query.order(
        sortColumn === "amount"
          ? "amount"
          : sortColumn === "name"
            ? "name"
            : "date",
        { ascending: !sortOrder },
      );

      // Apply pagination
      const offset = cursor ? cursor * pageSize : 0;
      query = query.range(offset, offset + pageSize - 1);

      const { data: transactions, error, count } = await query;

      if (error) {
        console.log("[transactions.get] Supabase REST error:", error.message);
        return {
          data: [],
          meta: {
            cursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }

      // Transform to camelCase
      const transformedData = (transactions ?? []).map((t: any) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        currency: t.currency,
        method: t.method,
        status: t.status,
        note: t.note,
        manual: t.manual,
        internal: t.internal,
        recurring: t.recurring,
        frequency: t.frequency,
        name: t.name,
        description: t.description,
        createdAt: t.created_at,
        isFulfilled: t.status === "completed",
        categorySlug: t.category_slug,
        category: null,
        bankAccountId: t.bank_account_id,
        bankAccount: null,
      }));

      const totalCount = count ?? 0;
      const currentCursor = cursor ?? 0;
      const hasNextPage = offset + pageSize < totalCount;
      const hasPreviousPage = currentCursor > 0;
      const nextCursor = hasNextPage ? currentCursor + 1 : null;

      return {
        data: transformedData,
        meta: {
          cursor: nextCursor,
          hasNextPage,
          hasPreviousPage,
        },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getById: protectedProcedure
    .input(getTransactionByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data: transaction, error } = await supabase
        .from("transactions")
        .select(`
          id,
          date,
          amount,
          currency,
          method,
          status,
          note,
          manual,
          internal,
          recurring,
          frequency,
          name,
          description,
          created_at,
          category_slug,
          bank_account_id,
          assigned_id
        `)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error || !transaction) {
        console.log(
          "[transactions.getById] Supabase REST error:",
          error?.message,
        );
        return null;
      }

      return {
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        currency: transaction.currency,
        method: transaction.method,
        status: transaction.status,
        note: transaction.note,
        manual: transaction.manual,
        internal: transaction.internal,
        recurring: transaction.recurring,
        frequency: transaction.frequency,
        name: transaction.name,
        description: transaction.description,
        createdAt: transaction.created_at,
        categorySlug: transaction.category_slug,
        bankAccountId: transaction.bank_account_id,
        assignedId: transaction.assigned_id,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  deleteMany: protectedProcedure
    .input(deleteTransactionsSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("transactions")
        .delete()
        .in("id", input)
        .eq("team_id", teamId)
        .select("id");

      if (error) {
        console.log(
          "[transactions.deleteMany] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to delete transactions: ${error.message}`);
      }

      return data?.map((t: any) => ({ id: t.id })) ?? [];
    }),

  // Use Supabase REST directly
  getAmountRange: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    // Get min and max amounts
    const { data: minData } = await supabase
      .from("transactions")
      .select("amount")
      .eq("team_id", teamId)
      .order("amount", { ascending: true })
      .limit(1)
      .single();

    const { data: maxData } = await supabase
      .from("transactions")
      .select("amount")
      .eq("team_id", teamId)
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    return {
      min: minData?.amount ?? 0,
      max: maxData?.amount ?? 0,
    };
  }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  update: protectedProcedure
    .input(updateTransactionSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Build update object (snake_case)
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.amount !== undefined) updateData.amount = input.amount;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.date !== undefined) updateData.date = input.date;
      if (input.bankAccountId !== undefined)
        updateData.bank_account_id = input.bankAccountId;
      if (input.categorySlug !== undefined)
        updateData.category_slug = input.categorySlug;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.internal !== undefined) updateData.internal = input.internal;
      if (input.recurring !== undefined) updateData.recurring = input.recurring;
      if (input.frequency !== undefined) updateData.frequency = input.frequency;
      if (input.note !== undefined) updateData.note = input.note;
      if (input.assignedId !== undefined)
        updateData.assigned_id = input.assignedId;
      if (input.taxRate !== undefined) updateData.tax_rate = input.taxRate;
      if (input.taxAmount !== undefined)
        updateData.tax_amount = input.taxAmount;

      const { data: transaction, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select(
          "id, name, amount, currency, date, status, manual, internal, note, created_at",
        )
        .single();

      if (error) {
        console.log(
          "[transactions.update] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to update transaction: ${error.message}`);
      }

      return {
        id: transaction.id,
        name: transaction.name,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        status: transaction.status,
        manual: transaction.manual,
        internal: transaction.internal,
        note: transaction.note,
        createdAt: transaction.created_at,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  updateMany: protectedProcedure
    .input(updateTransactionsSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Build update object (snake_case)
      const updateData: Record<string, unknown> = {};
      if (input.categorySlug !== undefined)
        updateData.category_slug = input.categorySlug;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.frequency !== undefined) updateData.frequency = input.frequency;
      if (input.internal !== undefined) updateData.internal = input.internal;
      if (input.note !== undefined) updateData.note = input.note;
      if (input.assignedId !== undefined)
        updateData.assigned_id = input.assignedId;
      if (input.recurring !== undefined) updateData.recurring = input.recurring;

      const { data, error } = await supabase
        .from("transactions")
        .update(updateData)
        .in("id", input.ids)
        .eq("team_id", teamId)
        .select("id");

      if (error) {
        console.log(
          "[transactions.updateMany] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to update transactions: ${error.message}`);
      }

      return data?.map((t: any) => ({ id: t.id })) ?? [];
    }),

  getSimilarTransactions: protectedProcedure
    .input(getSimilarTransactionsSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      return getSimilarTransactions(db, {
        name: input.name,
        categorySlug: input.categorySlug,
        frequency: input.frequency,
        teamId: teamId!,
        transactionId: input.transactionId,
      });
    }),

  searchTransactionMatch: protectedProcedure
    .input(searchTransactionMatchSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      return searchTransactionMatch(db, {
        query: input.query,
        teamId: teamId!,
        inboxId: input.inboxId,
        maxResults: input.maxResults,
        minConfidenceScore: input.minConfidenceScore,
        includeAlreadyMatched: input.includeAlreadyMatched,
      });
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Generate a unique internal_id for manual transactions
      const internalId = `manual_${teamId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the transaction
      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          name: input.name,
          amount: input.amount,
          currency: input.currency,
          date: input.date,
          bank_account_id: input.bankAccountId,
          team_id: teamId,
          assigned_id: input.assignedId ?? null,
          category_slug: input.categorySlug ?? null,
          note: input.note ?? null,
          internal: input.internal ?? false,
          manual: true,
          status: "posted",
          internal_id: internalId,
          method: "other",
        })
        .select(
          "id, name, amount, currency, date, status, manual, internal, note, created_at, category_slug, bank_account_id",
        )
        .single();

      if (error) {
        console.log(
          "[transactions.create] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      // Create attachments if provided
      if (input.attachments?.length && transaction?.id) {
        const attachmentRecords = input.attachments.map((att) => ({
          transaction_id: transaction.id,
          team_id: teamId,
          path: att.path,
          name: att.name,
          size: att.size,
          type: att.type,
        }));

        await supabase
          .from("transaction_attachments")
          .insert(attachmentRecords);
      }

      // Trigger embedding for the newly created manual transaction
      if (transaction?.id) {
        tasks.trigger("embed-transaction", {
          transactionIds: [transaction.id],
          teamId: teamId!,
        } satisfies EmbedTransactionPayload);
      }

      // Transform to camelCase
      return {
        id: transaction.id,
        name: transaction.name,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        status: transaction.status,
        manual: transaction.manual,
        internal: transaction.internal,
        note: transaction.note,
        createdAt: transaction.created_at,
        categorySlug: transaction.category_slug,
        bankAccountId: transaction.bank_account_id,
      };
    }),
});
