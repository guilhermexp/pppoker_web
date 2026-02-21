import { updateUserSchema } from "@api/schemas/users";
import { resend } from "@api/services/resend";
import { createAdminClient } from "@api/services/supabase";
import {
  authProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@api/trpc/init";
import {
  deleteUser,
  getUserById,
  getUserInvites,
  updateUser,
} from "@midpoker/db/queries";
import { logger } from "@midpoker/logger";

// Helper to get user via Supabase REST API (fallback when Drizzle connection fails)
// Uses admin client to bypass RLS
// Note: Only selects columns that exist in the actual database schema
async function getUserViaSupabase(userId: string) {
  const supabase = await createAdminClient();

  // Query user data - only select columns that exist in the database
  const { data: user, error } = await supabase
    .from("users")
    .select(
      "id, full_name, email, avatar_url, locale, time_format, date_format, week_starts_on_monday, timezone, team_id, created_at",
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    logger.error({ error: error?.message }, "getUserViaSupabase error");
    return null;
  }

  // If user has a team, fetch it separately - only select existing columns
  let team = null;
  if (user.team_id) {
    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, name, logo_url, plan, inbox_id, created_at, canceled_at")
      .eq("id", user.team_id)
      .single();

    if (teamError) {
      logger.error(
        { error: teamError.message },
        "getUserViaSupabase team fetch error",
      );
    }

    if (teamData) {
      team = {
        id: teamData.id,
        name: teamData.name,
        logoUrl: teamData.logo_url,
        plan: teamData.plan,
        inboxId: teamData.inbox_id,
        createdAt: teamData.created_at,
        countryCode: null, // Column doesn't exist in this database
        canceledAt: teamData.canceled_at || null,
      };
    }
  }

  // Transform snake_case to camelCase to match Drizzle output
  // Provide defaults for columns that don't exist in this database
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    avatarUrl: user.avatar_url,
    locale: user.locale,
    timeFormat: user.time_format,
    dateFormat: user.date_format,
    weekStartsOnMonday: user.week_starts_on_monday,
    timezone: user.timezone,
    timezoneAutoSync: false, // Column doesn't exist in this database
    teamId: user.team_id,
    team,
  };
}

export const userRouter = createTRPCRouter({
  // Use authProcedure instead of protectedProcedure because new users
  // may not have a team yet (they need to create one after signup)
  // Use Supabase REST first to avoid Drizzle connection pool issues
  me: authProcedure.query(async ({ ctx: { session } }) => {
    return getUserViaSupabase(session.user.id);
  }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx: { session }, input }) => {
      const supabase = await createAdminClient();

      // Transform camelCase to snake_case for database
      const updateData: Record<string, unknown> = {};
      if (input.fullName !== undefined) updateData.full_name = input.fullName;
      if (input.avatarUrl !== undefined)
        updateData.avatar_url = input.avatarUrl;
      if (input.locale !== undefined) updateData.locale = input.locale;
      if (input.weekStartsOnMonday !== undefined)
        updateData.week_starts_on_monday = input.weekStartsOnMonday;
      if (input.timezone !== undefined) updateData.timezone = input.timezone;
      if (input.timezoneAutoSync !== undefined)
        updateData.timezone_auto_sync = input.timezoneAutoSync;
      if (input.timeFormat !== undefined)
        updateData.time_format = input.timeFormat;
      if (input.dateFormat !== undefined)
        updateData.date_format = input.dateFormat;

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", session.user.id)
        .select()
        .single();

      if (error) {
        logger.error(
          { error: error.message },
          "user.update Supabase REST error",
        );
        throw new Error(`Failed to update user: ${error.message}`);
      }

      return data;
    }),

  delete: protectedProcedure.mutation(
    async ({ ctx: { supabase, db, session } }) => {
      const [data] = await Promise.all([
        deleteUser(db, session.user.id),
        supabase.auth.admin.deleteUser(session.user.id),
        resend.contacts.remove({
          email: session.user.email!,
          audienceId: process.env.RESEND_AUDIENCE_ID!,
        }),
      ]);

      return data;
    },
  ),

  // Use authProcedure because users need to see invites before joining a team
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  invites: authProcedure.query(async ({ ctx: { session } }) => {
    if (!session.user.email) {
      return [];
    }

    const supabase = await createAdminClient();
    const { data: invites, error: invitesError } = await supabase
      .from("user_invites")
      .select(`
        id,
        email,
        code,
        role,
        user:invited_by (
          id,
          full_name,
          email
        ),
        team:team_id (
          id,
          name,
          logo_url
        )
      `)
      .eq("email", session.user.email);

    if (invitesError || !invites) {
      logger.error(
        { error: invitesError?.message },
        "user.invites Supabase REST error",
      );
      return [];
    }

    // Transform to match expected format
    return invites.map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      code: inv.code,
      role: inv.role,
      user: inv.user
        ? {
            id: inv.user.id,
            fullName: inv.user.full_name,
            email: inv.user.email,
          }
        : null,
      team: inv.team
        ? {
            id: inv.team.id,
            name: inv.team.name,
            logoUrl: inv.team.logo_url,
          }
        : null,
    }));
  }),
});
