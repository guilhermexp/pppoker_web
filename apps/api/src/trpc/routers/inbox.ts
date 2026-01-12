import {
  confirmMatchSchema,
  createInboxItemSchema,
  declineMatchSchema,
  deleteInboxSchema,
  getInboxByIdSchema,
  getInboxByStatusSchema,
  getInboxSchema,
  matchTransactionSchema,
  processAttachmentsSchema,
  retryMatchingSchema,
  searchInboxSchema,
  unmatchTransactionSchema,
  updateInboxSchema,
} from "@api/schemas/inbox";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import {
  confirmSuggestedMatch,
  createInbox,
  declineSuggestedMatch,
  deleteInbox,
  deleteInboxEmbedding,
  getInbox,
  getInboxById,
  getInboxByStatus,
  getInboxSearch,
  matchTransaction,
  unmatchTransaction,
  updateInbox,
} from "@midpoker/db/queries";
import type { ProcessAttachmentPayload } from "@midpoker/jobs/schema";
import { tasks } from "@trigger.dev/sdk";

export const inboxRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getInboxSchema.optional())
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Fetch inbox items without joins (no FK constraints may exist)
      let query = supabase
        .from("inbox")
        .select(`
          id,
          file_name,
          file_path,
          display_name,
          transaction_id,
          amount,
          currency,
          content_type,
          date,
          status,
          created_at,
          website,
          description
        `)
        .eq("team_id", teamId)
        .neq("status", "deleted");

      // Apply status filter
      if (input?.status) {
        query = query.eq("status", input.status);
      }

      // Apply search filter
      if (input?.q) {
        query = query.or(`file_name.ilike.%${input.q}%,display_name.ilike.%${input.q}%,description.ilike.%${input.q}%`);
      }

      // Apply sorting
      const sortField = input?.sort || "created_at";
      const ascending = input?.order === "asc";
      query = query.order(sortField, { ascending });

      // Apply cursor-based pagination
      const pageSize = input?.pageSize ?? 50;
      const cursor = input?.cursor ? Number.parseInt(input.cursor, 10) : 0;
      // Fetch one extra to check if there's a next page
      query = query.range(cursor, cursor + pageSize);

      const { data: inboxItems, error } = await query;

      if (error) {
        console.log("[inbox.get] Supabase REST error:", error.message);
        return {
          data: [],
          meta: {
            cursor: null,
            hasNextPage: false,
            hasPreviousPage: cursor > 0,
          },
        };
      }

      const allItems = inboxItems ?? [];
      const hasNextPage = allItems.length > pageSize;
      const itemsToReturn = hasNextPage ? allItems.slice(0, pageSize) : allItems;
      const nextCursor = hasNextPage ? String(cursor + pageSize) : null;

      // Transform snake_case to camelCase
      return {
        data: itemsToReturn.map((item: any) => ({
          id: item.id,
          fileName: item.file_name,
          filePath: item.file_path,
          displayName: item.display_name,
          transactionId: item.transaction_id,
          amount: item.amount,
          currency: item.currency,
          contentType: item.content_type,
          date: item.date,
          status: item.status,
          createdAt: item.created_at,
          website: item.website,
          description: item.description,
          transaction: null,
        })),
        meta: {
          cursor: nextCursor,
          hasNextPage,
          hasPreviousPage: cursor > 0,
        },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getById: protectedProcedure
    .input(getInboxByIdSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Fetch inbox item without joins (no FK constraints may exist)
      const { data: item, error } = await supabase
        .from("inbox")
        .select(`
          id,
          file_name,
          file_path,
          display_name,
          transaction_id,
          amount,
          currency,
          content_type,
          date,
          status,
          created_at,
          website,
          description
        `)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error || !item) {
        console.log("[inbox.getById] Supabase REST error:", error?.message);
        return null;
      }

      return {
        id: item.id,
        fileName: item.file_name,
        filePath: item.file_path,
        displayName: item.display_name,
        transactionId: item.transaction_id,
        amount: item.amount,
        currency: item.currency,
        contentType: item.content_type,
        date: item.date,
        status: item.status,
        createdAt: item.created_at,
        website: item.website,
        description: item.description,
        transaction: null,
      };
    }),

  delete: protectedProcedure
    .input(deleteInboxSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      await Promise.all([
        deleteInboxEmbedding(db, {
          inboxId: input.id,
          teamId: teamId!,
        }),
        deleteInbox(db, {
          id: input.id,
          teamId: teamId!,
        }),
      ]);
    }),

  create: protectedProcedure
    .input(createInboxItemSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      return createInbox(db, {
        displayName: input.filename,
        teamId: teamId!,
        filePath: input.filePath,
        fileName: input.filename,
        contentType: input.mimetype,
        size: input.size,
        status: "processing",
      });
    }),

  processAttachments: protectedProcedure
    .input(processAttachmentsSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const batchResult = await tasks.batchTrigger(
        "process-attachment",
        input.map((item) => ({
          payload: {
            filePath: item.filePath,
            mimetype: item.mimetype,
            size: item.size,
            teamId: teamId!,
          },
        })) as { payload: ProcessAttachmentPayload }[],
      );

      // Send notification for user uploads
      await tasks.trigger("notification", {
        type: "inbox_new",
        teamId: teamId!,
        totalCount: input.length,
        inboxType: "upload",
      });

      return batchResult;
    }),

  search: protectedProcedure
    .input(searchInboxSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      const { q, transactionId, limit = 10 } = input;

      return getInboxSearch(db, {
        teamId: teamId!,
        q,
        transactionId,
        limit,
      });
    }),

  update: protectedProcedure
    .input(updateInboxSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      return updateInbox(db, { ...input, teamId: teamId! });
    }),

  matchTransaction: protectedProcedure
    .input(matchTransactionSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      return matchTransaction(db, { ...input, teamId: teamId! });
    }),

  unmatchTransaction: protectedProcedure
    .input(unmatchTransactionSchema)
    .mutation(async ({ ctx: { db, teamId, session }, input }) => {
      return unmatchTransaction(db, {
        id: input.id,
        teamId: teamId!,
        userId: session.user.id,
      });
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getByStatus: protectedProcedure
    .input(getInboxByStatusSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: items, error } = await supabase
        .from("inbox")
        .select(`
          id,
          file_name,
          file_path,
          display_name,
          transaction_id,
          amount,
          currency,
          content_type,
          date,
          status,
          created_at,
          website,
          description
        `)
        .eq("team_id", teamId)
        .eq("status", input.status)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("[inbox.getByStatus] Supabase REST error:", error.message);
        return [];
      }

      return (items ?? []).map((item: any) => ({
        id: item.id,
        fileName: item.file_name,
        filePath: item.file_path,
        displayName: item.display_name,
        transactionId: item.transaction_id,
        amount: item.amount,
        currency: item.currency,
        contentType: item.content_type,
        date: item.date,
        status: item.status,
        createdAt: item.created_at,
        website: item.website,
        description: item.description,
      }));
    }),

  // Confirm a match suggestion
  confirmMatch: protectedProcedure
    .input(confirmMatchSchema)
    .mutation(async ({ ctx: { db, teamId, session }, input }) => {
      return confirmSuggestedMatch(db, {
        teamId: teamId!,
        suggestionId: input.suggestionId,
        inboxId: input.inboxId,
        transactionId: input.transactionId,
        userId: session.user.id,
      });
    }),

  // Decline a match suggestion
  declineMatch: protectedProcedure
    .input(declineMatchSchema)
    .mutation(async ({ ctx: { db, session, teamId }, input }) => {
      return declineSuggestedMatch(db, {
        suggestionId: input.suggestionId,
        inboxId: input.inboxId,
        userId: session.user.id,
        teamId: teamId!,
      });
    }),

  // Retry matching for an inbox item
  retryMatching: protectedProcedure
    .input(retryMatchingSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const result = await tasks.trigger("batch-process-matching", {
        teamId: teamId!,
        inboxIds: [input.id],
      });

      return { jobId: result.id };
    }),
});
