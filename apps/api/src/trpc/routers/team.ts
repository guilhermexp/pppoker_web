import {
  acceptTeamInviteSchema,
  createTeamSchema,
  declineTeamInviteSchema,
  deleteTeamInviteSchema,
  deleteTeamMemberSchema,
  deleteTeamSchema,
  inviteTeamMembersSchema,
  leaveTeamSchema,
  updateBaseCurrencySchema,
  updateTeamByIdSchema,
  updateTeamMemberSchema,
} from "@api/schemas/team";
import { createAdminClient } from "@api/services/supabase";
import { authProcedure, createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import {
  acceptTeamInvite,
  createTeam,
  createTeamInvites,
  declineTeamInvite,
  deleteTeam,
  deleteTeamInvite,
  deleteTeamMember,
  getAvailablePlans,
  getInvitesByEmail,
  getTeamById,
  getTeamInvites,
  getTeamMembersByTeamId,
  getTeamsByUserId,
  leaveTeam,
  updateTeamById,
  updateTeamMember,
} from "@midday/db/queries";
import type {
  DeleteTeamPayload,
  InviteTeamMembersPayload,
  UpdateBaseCurrencyPayload,
} from "@midday/jobs/schema";
import { tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";

// Helper to get team via Supabase REST (avoids Drizzle connection pool issues)
async function getTeamViaSupabase(teamId: string) {
  const supabase = await createAdminClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, logo_url, email, inbox_id, plan, base_currency, country_code, fiscal_year_start_month, export_settings")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    console.log("[getTeamViaSupabase] Error:", teamError?.message);
    return null;
  }

  // Transform snake_case to camelCase
  return {
    id: team.id,
    name: team.name,
    logoUrl: team.logo_url,
    email: team.email,
    inboxId: team.inbox_id,
    plan: team.plan,
    baseCurrency: team.base_currency,
    countryCode: team.country_code,
    fiscalYearStartMonth: team.fiscal_year_start_month,
    exportSettings: team.export_settings,
  };
}

export const teamRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  current: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    if (!teamId) {
      return null;
    }
    return getTeamViaSupabase(teamId);
  }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  update: protectedProcedure
    .input(updateTeamByIdSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Transform camelCase to snake_case for database
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl;
      if (input.baseCurrency !== undefined) updateData.base_currency = input.baseCurrency;
      if (input.countryCode !== undefined) updateData.country_code = input.countryCode;
      if (input.fiscalYearStartMonth !== undefined) updateData.fiscal_year_start_month = input.fiscalYearStartMonth;

      const { data, error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", teamId)
        .select()
        .single();

      if (error) {
        console.log("[team.update] Supabase REST error:", error.message);
        throw new Error(`Failed to update team: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        logoUrl: data.logo_url,
        baseCurrency: data.base_currency,
        countryCode: data.country_code,
        fiscalYearStartMonth: data.fiscal_year_start_month,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  members: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: members, error } = await supabase
      .from("users_on_team")
      .select(`
        id,
        role,
        created_at,
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("team_id", teamId);

    if (error) {
      console.log("[team.members] Supabase REST error:", error.message);
      return [];
    }

    return (members ?? []).map((m: any) => ({
      id: m.id,
      role: m.role,
      createdAt: m.created_at,
      user: m.user ? {
        id: m.user.id,
        fullName: m.user.full_name,
        email: m.user.email,
        avatarUrl: m.user.avatar_url,
      } : null,
    }));
  }),

  // Use authProcedure because users need to list their teams before selecting one
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  list: authProcedure.query(async ({ ctx: { session } }) => {
    const supabase = await createAdminClient();

    // Get user's team memberships
    const { data: memberships, error: memberError } = await supabase
      .from("users_on_team")
      .select(`
        team_id,
        role,
        teams:team_id (
          id,
          name,
          logo_url,
          created_at
        )
      `)
      .eq("user_id", session.user.id);

    if (memberError || !memberships) {
      console.log("[team.list] Supabase REST error:", memberError?.message);
      return [];
    }

    // Transform to match expected format
    return memberships
      .filter((m: any) => m.teams)
      .map((m: any) => ({
        id: m.teams.id,
        name: m.teams.name,
        logoUrl: m.teams.logo_url,
        createdAt: m.teams.created_at,
        role: m.role,
      }));
  }),

  // Use authProcedure because new users need to create their first team
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  create: authProcedure
    .input(createTeamSchema)
    .mutation(async ({ ctx: { session }, input }) => {
      const requestId = `trpc_team_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`[${requestId}] TRPC team creation request`, {
        userId: session.user.id,
        userEmail: session.user.email,
        teamName: input.name,
        baseCurrency: input.baseCurrency,
        countryCode: input.countryCode,
        switchTeam: input.switchTeam,
        timestamp: new Date().toISOString(),
      });

      const supabase = await createAdminClient();

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: input.name,
          base_currency: input.baseCurrency,
          country_code: input.countryCode,
        })
        .select("id")
        .single();

      if (teamError || !team) {
        console.error(`[${requestId}] Failed to create team:`, teamError?.message);
        throw new Error(`Failed to create team: ${teamError?.message}`);
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from("users_on_team")
        .insert({
          user_id: session.user.id,
          team_id: team.id,
          role: "owner",
        });

      if (memberError) {
        console.error(`[${requestId}] Failed to add user to team:`, memberError.message);
        throw new Error(`Failed to add user to team: ${memberError.message}`);
      }

      // Update user's default team if switchTeam is true
      if (input.switchTeam) {
        await supabase
          .from("users")
          .update({ team_id: team.id })
          .eq("id", session.user.id);
      }

      console.log(`[${requestId}] TRPC team creation successful`, {
        teamId: team.id,
        userId: session.user.id,
      });

      return team.id;
    }),

  leave: protectedProcedure
    .input(leaveTeamSchema)
    .mutation(async ({ ctx: { db, session }, input }) => {
      const teamMembersData = await getTeamMembersByTeamId(db, input.teamId);

      const currentUser = teamMembersData?.find(
        (member) => member.user?.id === session.user.id,
      );

      const totalOwners = teamMembersData?.filter(
        (member) => member.role === "owner",
      ).length;

      if (currentUser?.role === "owner" && totalOwners === 1) {
        throw Error("Action not allowed");
      }

      return leaveTeam(db, {
        userId: session.user.id,
        teamId: input.teamId,
      });
    }),

  acceptInvite: protectedProcedure
    .input(acceptTeamInviteSchema)
    .mutation(async ({ ctx: { db, session }, input }) => {
      return acceptTeamInvite(db, {
        id: input.id,
        userId: session.user.id,
      });
    }),

  declineInvite: protectedProcedure
    .input(declineTeamInviteSchema)
    .mutation(async ({ ctx: { db, session }, input }) => {
      return declineTeamInvite(db, {
        id: input.id,
        email: session.user.email!,
      });
    }),

  delete: protectedProcedure
    .input(deleteTeamSchema)
    .mutation(async ({ ctx: { db, session }, input }) => {
      const data = await deleteTeam(db, {
        teamId: input.teamId,
        userId: session.user.id,
      });

      if (!data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Team not found",
        });
      }

      await tasks.trigger("delete-team", {
        teamId: input.teamId!,
      } satisfies DeleteTeamPayload);
    }),

  deleteMember: protectedProcedure
    .input(deleteTeamMemberSchema)
    .mutation(async ({ ctx: { db }, input }) => {
      return deleteTeamMember(db, {
        teamId: input.teamId,
        userId: input.userId,
      });
    }),

  updateMember: protectedProcedure
    .input(updateTeamMemberSchema)
    .mutation(async ({ ctx: { db }, input }) => {
      return updateTeamMember(db, input);
    }),

  teamInvites: protectedProcedure.query(async ({ ctx: { db, teamId } }) => {
    return getTeamInvites(db, teamId!);
  }),

  // Use authProcedure because users need to see invites before joining a team
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  invitesByEmail: authProcedure.query(async ({ ctx: { session } }) => {
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
      .eq("email", session.user.email!);

    if (invitesError || !invites) {
      console.log("[team.invitesByEmail] Supabase REST error:", invitesError?.message);
      return [];
    }

    // Transform to match expected format
    return invites.map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      code: inv.code,
      role: inv.role,
      user: inv.user ? {
        id: inv.user.id,
        fullName: inv.user.full_name,
        email: inv.user.email,
      } : null,
      team: inv.team ? {
        id: inv.team.id,
        name: inv.team.name,
        logoUrl: inv.team.logo_url,
      } : null,
    }));
  }),

  invite: protectedProcedure
    .input(inviteTeamMembersSchema)
    .mutation(async ({ ctx: { db, session, teamId, geo }, input }) => {
      const ip = geo.ip ?? "127.0.0.1";

      const data = await createTeamInvites(db, {
        teamId: teamId!,
        invites: input.map((invite) => ({
          ...invite,
          invitedBy: session.user.id,
        })),
      });

      const results = data?.results ?? [];
      const skippedInvites = data?.skippedInvites ?? [];

      const invites = results.map((invite) => ({
        email: invite?.email!,
        invitedBy: session.user.id!,
        invitedByName: session.user.full_name!,
        invitedByEmail: session.user.email!,
        teamName: invite?.team?.name!,
        inviteCode: invite?.code!,
      }));

      // Only trigger email sending if there are valid invites
      if (invites.length > 0) {
        await tasks.trigger("invite-team-members", {
          teamId: teamId!,
          invites,
          ip,
          locale: "en",
        } satisfies InviteTeamMembersPayload);
      }

      // Return information about the invitation process
      return {
        sent: invites.length,
        skipped: skippedInvites.length,
        skippedInvites,
      };
    }),

  deleteInvite: protectedProcedure
    .input(deleteTeamInviteSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      return deleteTeamInvite(db, {
        teamId: teamId!,
        id: input.id,
      });
    }),

  availablePlans: protectedProcedure.query(async ({ ctx: { db, teamId } }) => {
    return getAvailablePlans(db, teamId!);
  }),

  updateBaseCurrency: protectedProcedure
    .input(updateBaseCurrencySchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const event = await tasks.trigger("update-base-currency", {
        teamId: teamId!,
        baseCurrency: input.baseCurrency,
      } satisfies UpdateBaseCurrencyPayload);

      return event;
    }),
});
