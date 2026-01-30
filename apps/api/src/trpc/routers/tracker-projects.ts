import {
  deleteTrackerProjectSchema,
  getTrackerProjectByIdSchema,
  getTrackerProjectsSchema,
  upsertTrackerProjectSchema,
} from "@api/schemas/tracker-projects";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import {
  deleteTrackerProject,
  getTrackerProjectById,
  upsertTrackerProject,
} from "@midpoker/db/queries";

export const trackerProjectsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getTrackerProjectsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("tracker_projects")
        .select(`
          id,
          name,
          description,
          status,
          rate,
          currency,
          billable,
          estimate,
          customer_id,
          created_at,
          customers (
            id,
            name
          )
        `)
        .eq("team_id", teamId);

      // Apply filters
      if (input?.status) {
        query = query.eq("status", input.status);
      }
      if (input?.search) {
        query = query.ilike("name", `%${input.search}%`);
      }

      // Apply sorting
      if (input?.sort) {
        const sortOrder = input.sort.startsWith("-") ? false : true;
        const sortField = input.sort.replace(/^-/, "");
        query = query.order(sortField === "name" ? "name" : "created_at", {
          ascending: sortOrder,
        });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Apply cursor-based pagination
      const pageSize = input?.pageSize ?? 50;
      const cursor = input?.cursor ? Number.parseInt(input.cursor, 10) : 0;
      query = query.range(cursor, cursor + pageSize);

      const { data: projects, error } = await query;

      if (error) {
        console.log(
          "[trackerProjects.get] Supabase REST error:",
          error.message,
        );
        return {
          data: [],
          meta: {
            cursor: null,
            hasNextPage: false,
            hasPreviousPage: cursor > 0,
          },
        };
      }

      const allProjects = projects ?? [];
      const hasNextPage = allProjects.length > pageSize;
      const projectsToReturn = hasNextPage
        ? allProjects.slice(0, pageSize)
        : allProjects;
      const nextCursor = hasNextPage ? String(cursor + pageSize) : null;

      return {
        data: projectsToReturn.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          rate: p.rate,
          currency: p.currency,
          billable: p.billable,
          estimate: p.estimate,
          customerId: p.customer_id,
          createdAt: p.created_at,
          customer: p.customers
            ? {
                id: p.customers.id,
                name: p.customers.name,
              }
            : null,
        })),
        meta: {
          cursor: nextCursor,
          hasNextPage,
          hasPreviousPage: cursor > 0,
        },
      };
    }),

  upsert: protectedProcedure
    .input(upsertTrackerProjectSchema)
    .mutation(async ({ input, ctx: { db, teamId, session } }) => {
      return upsertTrackerProject(db, {
        ...input,
        teamId: teamId!,
        userId: session.user.id,
      });
    }),

  delete: protectedProcedure
    .input(deleteTrackerProjectSchema)
    .mutation(async ({ input, ctx: { db, teamId } }) => {
      return deleteTrackerProject(db, {
        ...input,
        teamId: teamId!,
      });
    }),

  getById: protectedProcedure
    .input(getTrackerProjectByIdSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      return getTrackerProjectById(db, {
        ...input,
        teamId: teamId!,
      });
    }),
});
