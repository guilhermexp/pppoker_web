import {
  addLinkedClubSchema,
  removeLinkedClubSchema,
  updatePokerSettingsSchema,
} from "@api/schemas/poker";
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
import {
  authProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@api/trpc/init";
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
} from "@midpoker/db/queries";
import type {
  DeleteTeamPayload,
  InviteTeamMembersPayload,
  UpdateBaseCurrencyPayload,
} from "@midpoker/jobs/schema";
import { logger } from "@midpoker/logger";
import { tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";

// Helper to get team via Supabase REST (avoids Drizzle connection pool issues)
async function getTeamViaSupabase(teamId: string) {
  const supabase = await createAdminClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select(
      "id, name, logo_url, email, inbox_id, plan, base_currency, country_code, fiscal_year_start_month, export_settings",
    )
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    logger.error({ error: teamError?.message }, "getTeamViaSupabase error");
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
      if (input.baseCurrency !== undefined)
        updateData.base_currency = input.baseCurrency;
      if (input.countryCode !== undefined)
        updateData.country_code = input.countryCode;
      if (input.fiscalYearStartMonth !== undefined)
        updateData.fiscal_year_start_month = input.fiscalYearStartMonth;

      const { data, error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", teamId)
        .select()
        .single();

      if (error) {
        logger.error(
          { error: error.message },
          "team.update Supabase REST error",
        );
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
      logger.error(
        { error: error.message },
        "team.members Supabase REST error",
      );
      return [];
    }

    return (members ?? []).map((m: any) => ({
      id: m.id,
      role: m.role,
      createdAt: m.created_at,
      user: m.user
        ? {
            id: m.user.id,
            fullName: m.user.full_name,
            email: m.user.email,
            avatarUrl: m.user.avatar_url,
          }
        : null,
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
      logger.error(
        { error: memberError?.message },
        "team.list Supabase REST error",
      );
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

      logger.info(
        {
          requestId,
          userId: session.user.id,
          userEmail: session.user.email,
          teamName: input.name,
          baseCurrency: input.baseCurrency,
          countryCode: input.countryCode,
          switchTeam: input.switchTeam,
        },
        "TRPC team creation request",
      );

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
        logger.error(
          { requestId, error: teamError?.message },
          "Failed to create team",
        );
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
        logger.error(
          { requestId, error: memberError.message },
          "Failed to add user to team",
        );
        throw new Error(`Failed to add user to team: ${memberError.message}`);
      }

      // Update user's default team if switchTeam is true
      if (input.switchTeam) {
        await supabase
          .from("users")
          .update({ team_id: team.id })
          .eq("id", session.user.id);
      }

      logger.info(
        { requestId, teamId: team.id, userId: session.user.id },
        "TRPC team creation successful",
      );

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
      logger.error(
        { error: invitesError?.message },
        "team.invitesByEmail Supabase REST error",
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

  // ==========================================================================
  // POKER SETTINGS
  // ==========================================================================

  getPokerSettings: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: team, error } = await supabase
      .from("teams")
      .select(`
        poker_platform,
        poker_entity_type,
        poker_club_id,
        poker_club_name,
        poker_liga_id,
        poker_liga_name,
        poker_su_id,
        poker_su_name,
        poker_parent_liga_team_id
      `)
      .eq("id", teamId)
      .single();

    if (error || !team) {
      return null;
    }

    return {
      pokerPlatform: team.poker_platform,
      pokerEntityType: team.poker_entity_type,
      pokerClubId: team.poker_club_id,
      pokerClubName: team.poker_club_name,
      pokerLigaId: team.poker_liga_id,
      pokerLigaName: team.poker_liga_name,
      pokerSuId: team.poker_su_id,
      pokerSuName: team.poker_su_name,
      pokerParentLigaTeamId: team.poker_parent_liga_team_id,
    };
  }),

  updatePokerSettings: protectedProcedure
    .input(updatePokerSettingsSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const updateData: Record<string, unknown> = {};
      if (input.pokerPlatform !== undefined)
        updateData.poker_platform = input.pokerPlatform;
      if (input.pokerEntityType !== undefined)
        updateData.poker_entity_type = input.pokerEntityType;
      if (input.pokerClubId !== undefined)
        updateData.poker_club_id = input.pokerClubId;
      if (input.pokerClubName !== undefined)
        updateData.poker_club_name = input.pokerClubName;
      if (input.pokerLigaId !== undefined)
        updateData.poker_liga_id = input.pokerLigaId;
      if (input.pokerLigaName !== undefined)
        updateData.poker_liga_name = input.pokerLigaName;
      if (input.pokerSuId !== undefined)
        updateData.poker_su_id = input.pokerSuId;
      if (input.pokerSuName !== undefined)
        updateData.poker_su_name = input.pokerSuName;
      if (input.pokerParentLigaTeamId !== undefined)
        updateData.poker_parent_liga_team_id = input.pokerParentLigaTeamId;

      const { data, error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", teamId)
        .select(`
          poker_platform,
          poker_entity_type,
          poker_club_id,
          poker_club_name,
          poker_liga_id,
          poker_liga_name,
          poker_su_id,
          poker_su_name,
          poker_parent_liga_team_id
        `)
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update poker settings: ${error.message}`,
        });
      }

      return {
        pokerPlatform: data.poker_platform,
        pokerEntityType: data.poker_entity_type,
        pokerClubId: data.poker_club_id,
        pokerClubName: data.poker_club_name,
        pokerLigaId: data.poker_liga_id,
        pokerLigaName: data.poker_liga_name,
        pokerSuId: data.poker_su_id,
        pokerSuName: data.poker_su_name,
        pokerParentLigaTeamId: data.poker_parent_liga_team_id,
      };
    }),

  getLinkedClubs: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: clubs, error } = await supabase
      .from("poker_team_clubs")
      .select(`
        id,
        club_id,
        club_name,
        linked_team_id,
        created_at,
        linked_team:linked_team_id (
          name
        )
      `)
      .eq("liga_team_id", teamId)
      .order("created_at", { ascending: true });

    if (error) {
      return { clubs: [], total: 0 };
    }

    return {
      clubs: (clubs ?? []).map((c: any) => ({
        id: c.id,
        clubId: c.club_id,
        clubName: c.club_name,
        linkedTeamId: c.linked_team_id,
        linkedTeamName: c.linked_team?.name ?? null,
        createdAt: c.created_at,
      })),
      total: clubs?.length ?? 0,
    };
  }),

  addLinkedClub: protectedProcedure
    .input(addLinkedClubSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_team_clubs")
        .insert({
          liga_team_id: teamId,
          club_id: input.clubId,
          club_name: input.clubName,
          linked_team_id: input.linkedTeamId,
        })
        .select(`
          id,
          club_id,
          club_name,
          linked_team_id,
          created_at
        `)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este clube já está vinculado à sua liga",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add linked club: ${error.message}`,
        });
      }

      return {
        id: data.id,
        clubId: data.club_id,
        clubName: data.club_name,
        linkedTeamId: data.linked_team_id,
        createdAt: data.created_at,
      };
    }),

  removeLinkedClub: protectedProcedure
    .input(removeLinkedClubSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_team_clubs")
        .delete()
        .eq("liga_team_id", teamId)
        .eq("club_id", input.clubId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to remove linked club: ${error.message}`,
        });
      }

      return { success: true };
    }),

  searchLigas: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    // Find teams that are ligas (have poker_entity_type = 'liga' or 'ambos')
    const { data: ligas, error } = await supabase
      .from("teams")
      .select(`
        id,
        name,
        poker_liga_id,
        poker_liga_name,
        poker_platform
      `)
      .in("poker_entity_type", ["liga", "ambos"])
      .neq("id", teamId)
      .limit(100);

    if (error) {
      return [];
    }

    return (ligas ?? []).map((l: any) => ({
      id: l.id,
      name: l.name,
      pokerLigaId: l.poker_liga_id,
      pokerLigaName: l.poker_liga_name,
      pokerPlatform: l.poker_platform,
    }));
  }),
});
