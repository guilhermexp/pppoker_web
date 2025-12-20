import {
  deleteDocumentSchema,
  getDocumentSchema,
  getDocumentsSchema,
  getRelatedDocumentsSchema,
  processDocumentSchema,
  signedUrlSchema,
  signedUrlsSchema,
} from "@api/schemas/documents";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import {
  checkDocumentAttachments,
  deleteDocument,
  getDocumentById,
  getRelatedDocuments,
  updateDocuments,
} from "@midday/db/queries";
import { isMimeTypeSupportedForProcessing } from "@midday/documents/utils";
import type { ProcessDocumentPayload } from "@midday/jobs/schema";
import { remove, signedUrl } from "@midday/supabase/storage";
import { tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";

export const documentsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getDocumentsSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("documents")
        .select(`
          id,
          name,
          title,
          summary,
          date,
          tag,
          path_tokens,
          metadata,
          parent_id,
          object_id,
          owner_id,
          processing_status,
          created_at
        `)
        .eq("team_id", teamId);

      // Apply filters - if no parentId specified, show root documents (null parent)
      if (input?.parentId) {
        query = query.eq("parent_id", input.parentId);
      } else {
        query = query.is("parent_id", null);
      }
      if (input?.q) {
        query = query.or(`name.ilike.%${input.q}%,title.ilike.%${input.q}%`);
      }
      if (input?.tags?.length) {
        query = query.in("tag", input.tags);
      }

      // Apply sorting
      if (input?.sort && input.sort.length === 2) {
        const [field, direction] = input.sort;
        query = query.order(field, { ascending: direction === "asc" });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Apply cursor-based pagination
      const pageSize = input?.pageSize ?? 20;
      const cursor = input?.cursor ? Number.parseInt(input.cursor, 10) : 0;
      // Fetch one extra to check if there's a next page
      query = query.range(cursor, cursor + pageSize);

      const { data: documents, error } = await query;

      if (error) {
        console.log("[documents.get] Supabase REST error:", error.message);
        return {
          data: [],
          meta: {
            cursor: null,
            hasNextPage: false,
            hasPreviousPage: cursor > 0,
          },
        };
      }

      const allDocs = documents ?? [];
      const hasNextPage = allDocs.length > pageSize;
      const docsToReturn = hasNextPage ? allDocs.slice(0, pageSize) : allDocs;
      const nextCursor = hasNextPage ? String(cursor + pageSize) : null;

      return {
        data: docsToReturn.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          title: doc.title,
          summary: doc.summary,
          date: doc.date,
          tag: doc.tag,
          pathTokens: doc.path_tokens,
          metadata: doc.metadata,
          parentId: doc.parent_id,
          objectId: doc.object_id,
          ownerId: doc.owner_id,
          processingStatus: doc.processing_status,
          createdAt: doc.created_at,
        })),
        meta: {
          cursor: nextCursor,
          hasNextPage,
          hasPreviousPage: cursor > 0,
        },
      };
    }),

  getById: protectedProcedure
    .input(getDocumentSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      const result = await getDocumentById(db, {
        id: input.id,
        filePath: input.filePath,
        teamId: teamId!,
      });

      return result ?? null;
    }),

  getRelatedDocuments: protectedProcedure
    .input(getRelatedDocumentsSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      return getRelatedDocuments(db, {
        id: input.id,
        pageSize: input.pageSize,
        teamId: teamId!,
      });
    }),

  checkAttachments: protectedProcedure
    .input(deleteDocumentSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      return checkDocumentAttachments(db, {
        id: input.id,
        teamId: teamId!,
      });
    }),

  delete: protectedProcedure
    .input(deleteDocumentSchema)
    .mutation(async ({ input, ctx: { db, supabase, teamId } }) => {
      const document = await deleteDocument(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (!document || !document.pathTokens) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Delete from storage
      await remove(supabase, {
        bucket: "vault",
        path: document.pathTokens,
      });

      return document;
    }),

  processDocument: protectedProcedure
    .input(processDocumentSchema)
    .mutation(async ({ ctx: { teamId, db }, input }) => {
      const supportedDocuments = input.filter((item) =>
        isMimeTypeSupportedForProcessing(item.mimetype),
      );

      const unsupportedDocuments = input.filter(
        (item) => !isMimeTypeSupportedForProcessing(item.mimetype),
      );

      if (unsupportedDocuments.length > 0) {
        const unsupportedNames = unsupportedDocuments.map((doc) =>
          doc.filePath.join("/"),
        );

        await updateDocuments(db, {
          ids: unsupportedNames,
          teamId: teamId!,
          processingStatus: "completed",
        });
      }

      if (supportedDocuments.length === 0) {
        return;
      }

      // Trigger processing task only for supported documents
      return tasks.batchTrigger(
        "process-document",
        supportedDocuments.map(
          (item) =>
            ({
              payload: {
                filePath: item.filePath,
                mimetype: item.mimetype,
                teamId: teamId!,
              },
            }) as { payload: ProcessDocumentPayload },
        ),
      );
    }),

  signedUrl: protectedProcedure
    .input(signedUrlSchema)
    .mutation(async ({ input, ctx: { supabase } }) => {
      const { data } = await signedUrl(supabase, {
        bucket: "vault",
        path: input.filePath,
        expireIn: input.expireIn,
      });

      return data;
    }),

  signedUrls: protectedProcedure
    .input(signedUrlsSchema)
    .mutation(async ({ input, ctx: { supabase } }) => {
      const signedUrls = [];

      for (const filePath of input) {
        const { data } = await signedUrl(supabase, {
          bucket: "vault",
          path: filePath,
          expireIn: 60, // 1 Minute
        });

        if (data?.signedUrl) {
          signedUrls.push(data.signedUrl);
        }
      }

      return signedUrls ?? [];
    }),
});
