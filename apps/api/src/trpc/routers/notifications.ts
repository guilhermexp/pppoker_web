import {
  getNotificationsSchema,
  updateAllNotificationsStatusSchema,
  updateNotificationStatusSchema,
} from "@api/schemas/notifications";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";

export const notificationsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  list: protectedProcedure
    .input(getNotificationsSchema.optional())
    .query(async ({ ctx: { teamId, session }, input }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("activities")
        .select(`
          id,
          created_at,
          team_id,
          user_id,
          type,
          status,
          priority,
          payload,
          metadata
        `)
        .eq("team_id", teamId)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      // Apply filters
      if (input?.status) {
        if (Array.isArray(input.status)) {
          query = query.in("status", input.status);
        } else {
          query = query.eq("status", input.status);
        }
      }
      if (input?.maxPriority !== undefined) {
        query = query.lte("priority", input.maxPriority);
      }
      if (input?.pageSize) {
        query = query.limit(input.pageSize);
      }

      const { data: activities, error } = await query;

      if (error) {
        console.log("[notifications.list] Supabase REST error:", error.message);
        return [];
      }

      // Transform snake_case to camelCase
      return (activities ?? []).map((act: any) => ({
        id: act.id,
        createdAt: act.created_at,
        teamId: act.team_id,
        userId: act.user_id,
        type: act.type,
        status: act.status,
        priority: act.priority,
        payload: act.payload,
        metadata: act.metadata,
      }));
    }),

  // Use Supabase REST directly
  updateStatus: protectedProcedure
    .input(updateNotificationStatusSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("activities")
        .update({ status: input.status })
        .eq("id", input.activityId)
        .eq("team_id", teamId)
        .select()
        .single();

      if (error) {
        console.log("[notifications.updateStatus] Supabase REST error:", error.message);
        throw new Error(`Failed to update notification: ${error.message}`);
      }

      return {
        id: data.id,
        status: data.status,
      };
    }),

  // Use Supabase REST directly
  updateAllStatus: protectedProcedure
    .input(updateAllNotificationsStatusSchema)
    .mutation(async ({ ctx: { teamId, session }, input }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("activities")
        .update({ status: input.status })
        .eq("team_id", teamId)
        .eq("user_id", session.user.id);

      if (error) {
        console.log("[notifications.updateAllStatus] Supabase REST error:", error.message);
        throw new Error(`Failed to update notifications: ${error.message}`);
      }

      return { success: true };
    }),
});
