import {
  deleteTrackerEntrySchema,
  getCurrentTimerSchema,
  getTrackerRecordsByDateSchema,
  getTrackerRecordsByRangeSchema,
  startTimerSchema,
  stopTimerSchema,
  upsertTrackerEntriesSchema,
} from "@api/schemas/tracker-entries";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";

export const trackerEntriesRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  byDate: protectedProcedure
    .input(getTrackerRecordsByDateSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: entries, error } = await supabase
        .from("tracker_entries")
        .select(`
          id,
          date,
          duration,
          description,
          start,
          stop,
          project_id,
          assigned_id,
          team_id,
          created_at,
          rate,
          currency
        `)
        .eq("team_id", teamId)
        .eq("date", input.date)
        .order("created_at", { ascending: false });

      if (error) {
        console.log(
          "[trackerEntries.byDate] Supabase REST error:",
          error.message,
        );
        return [];
      }

      return (entries ?? []).map((e: any) => ({
        id: e.id,
        date: e.date,
        duration: e.duration,
        description: e.description,
        start: e.start,
        stop: e.stop,
        projectId: e.project_id,
        assignedId: e.assigned_id,
        teamId: e.team_id,
        createdAt: e.created_at,
        rate: e.rate,
        currency: e.currency,
      }));
    }),

  // Use Supabase REST directly
  byRange: protectedProcedure
    .input(getTrackerRecordsByRangeSchema)
    .query(async ({ input, ctx: { session, teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("tracker_entries")
        .select(`
          id,
          date,
          duration,
          description,
          start,
          stop,
          project_id,
          assigned_id,
          team_id,
          created_at,
          rate,
          currency
        `)
        .eq("team_id", teamId)
        .gte("date", input.from)
        .lte("date", input.to)
        .order("date", { ascending: false });

      if (input.projectId) {
        query = query.eq("project_id", input.projectId);
      }

      const { data: entries, error } = await query;

      if (error) {
        console.log(
          "[trackerEntries.byRange] Supabase REST error:",
          error.message,
        );
        return [];
      }

      return (entries ?? []).map((e: any) => ({
        id: e.id,
        date: e.date,
        duration: e.duration,
        description: e.description,
        start: e.start,
        stop: e.stop,
        projectId: e.project_id,
        assignedId: e.assigned_id,
        teamId: e.team_id,
        createdAt: e.created_at,
        rate: e.rate,
        currency: e.currency,
      }));
    }),

  // Use Supabase REST directly
  upsert: protectedProcedure
    .input(upsertTrackerEntriesSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const entries = input.entries.map((entry) => ({
        id: entry.id,
        team_id: teamId,
        date: entry.date,
        duration: entry.duration,
        description: entry.description,
        start: entry.start,
        stop: entry.stop,
        project_id: entry.projectId,
        assigned_id: entry.assignedId,
        rate: entry.rate,
        currency: entry.currency,
      }));

      const { data, error } = await supabase
        .from("tracker_entries")
        .upsert(entries, { onConflict: "id" })
        .select();

      if (error) {
        console.log(
          "[trackerEntries.upsert] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to upsert tracker entries: ${error.message}`);
      }

      return data;
    }),

  // Use Supabase REST directly
  delete: protectedProcedure
    .input(deleteTrackerEntrySchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("tracker_entries")
        .delete()
        .eq("id", input.id)
        .eq("team_id", teamId);

      if (error) {
        console.log(
          "[trackerEntries.delete] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to delete tracker entry: ${error.message}`);
      }

      return { success: true };
    }),

  // Timer procedures - Use Supabase REST directly
  startTimer: protectedProcedure
    .input(startTimerSchema)
    .mutation(async ({ ctx: { teamId, session }, input }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("tracker_entries")
        .insert({
          team_id: teamId,
          project_id: input.projectId,
          assigned_id: input.assignedId ?? session.user.id,
          date: new Date().toISOString().split("T")[0],
          start: new Date().toISOString(),
          duration: 0,
          description: input.description,
        })
        .select()
        .single();

      if (error) {
        console.log(
          "[trackerEntries.startTimer] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to start timer: ${error.message}`);
      }

      return {
        id: data.id,
        start: data.start,
        projectId: data.project_id,
        assignedId: data.assigned_id,
      };
    }),

  // Use Supabase REST directly
  stopTimer: protectedProcedure
    .input(stopTimerSchema)
    .mutation(async ({ ctx: { teamId, session }, input }) => {
      const supabase = await createAdminClient();

      // Get the current running timer
      const { data: timer } = await supabase
        .from("tracker_entries")
        .select("id, start")
        .eq("team_id", teamId)
        .eq("assigned_id", input.assignedId ?? session.user.id)
        .is("stop", null)
        .single();

      if (!timer) {
        return null;
      }

      const stop = new Date().toISOString();
      const start = new Date(timer.start);
      const duration = Math.floor(
        (new Date(stop).getTime() - start.getTime()) / 1000,
      );

      const { data, error } = await supabase
        .from("tracker_entries")
        .update({
          stop: stop,
          duration: duration,
        })
        .eq("id", timer.id)
        .select()
        .single();

      if (error) {
        console.log(
          "[trackerEntries.stopTimer] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to stop timer: ${error.message}`);
      }

      return {
        id: data.id,
        stop: data.stop,
        duration: data.duration,
      };
    }),

  // Use Supabase REST directly
  getCurrentTimer: protectedProcedure
    .input(getCurrentTimerSchema.optional())
    .query(async ({ ctx: { teamId, session }, input }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("tracker_entries")
        .select(`
          id,
          start,
          description,
          project_id,
          assigned_id
        `)
        .eq("team_id", teamId)
        .eq("assigned_id", input?.assignedId ?? session.user.id)
        .is("stop", null)
        .single();

      if (error) {
        // No active timer is not an error
        return null;
      }

      return {
        id: data.id,
        start: data.start,
        description: data.description,
        projectId: data.project_id,
        assignedId: data.assigned_id,
      };
    }),

  // Use Supabase REST directly
  getTimerStatus: protectedProcedure
    .input(getCurrentTimerSchema.optional())
    .query(async ({ ctx: { teamId, session }, input }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("tracker_entries")
        .select(`
          id,
          start,
          description,
          project_id,
          assigned_id
        `)
        .eq("team_id", teamId)
        .eq("assigned_id", input?.assignedId ?? session.user.id)
        .is("stop", null)
        .maybeSingle();

      if (error) {
        console.log(
          "[trackerEntries.getTimerStatus] Supabase REST error:",
          error.message,
        );
        return { isRunning: false, timer: null };
      }

      if (!data) {
        return { isRunning: false, timer: null };
      }

      return {
        isRunning: true,
        timer: {
          id: data.id,
          start: data.start,
          description: data.description,
          projectId: data.project_id,
          assignedId: data.assigned_id,
        },
      };
    }),
});
