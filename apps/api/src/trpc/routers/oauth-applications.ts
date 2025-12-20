import {
  authorizeOAuthApplicationSchema,
  createOAuthApplicationSchema,
  deleteOAuthApplicationSchema,
  getApplicationInfoSchema,
  getOAuthApplicationSchema,
  regenerateClientSecretSchema,
  updateApprovalStatusSchema,
  updateOAuthApplicationSchema,
} from "@api/schemas/oauth-applications";
import { revokeUserApplicationAccessSchema } from "@api/schemas/oauth-flow";
import { resend } from "@api/services/resend";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import {
  createAuthorizationCode,
  createOAuthApplication,
  deleteOAuthApplication,
  getOAuthApplicationByClientId,
  getOAuthApplicationById,
  getTeamsByUserId,
  getUserAuthorizedApplications,
  hasUserEverAuthorizedApp,
  regenerateClientSecret,
  revokeUserApplicationTokens,
  updateOAuthApplication,
  updateOAuthApplicationstatus,
} from "@midday/db/queries";
import { AppInstalledEmail } from "@midday/email/emails/app-installed";
import { AppReviewRequestEmail } from "@midday/email/emails/app-review-request";
import { render } from "@midday/email/render";

export const oauthApplicationsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues (v2)
  list: protectedProcedure.query(async ({ ctx }) => {
    console.log("[oauthApplications.list] Using Supabase REST");
    const { teamId } = ctx;
    const supabase = await createAdminClient();

    const { data: applications, error } = await supabase
      .from("oauth_applications")
      .select(`
        id,
        name,
        slug,
        description,
        overview,
        developer_name,
        logo_url,
        website,
        install_url,
        screenshots,
        redirect_uris,
        client_id,
        scopes,
        team_id,
        created_by,
        created_at,
        updated_at,
        is_public,
        active,
        status,
        users:created_by (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("[oauth-applications.list] Supabase REST error:", error.message);
      return { data: [] };
    }

    // Transform snake_case to camelCase
    const transformedData = (applications ?? []).map((app: any) => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      overview: app.overview,
      developerName: app.developer_name,
      logoUrl: app.logo_url,
      website: app.website,
      installUrl: app.install_url,
      screenshots: app.screenshots,
      redirectUris: app.redirect_uris,
      clientId: app.client_id,
      scopes: app.scopes,
      teamId: app.team_id,
      createdBy: app.created_by,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      isPublic: app.is_public,
      active: app.active,
      status: app.status,
      user: app.users ? {
        id: app.users.id,
        fullName: app.users.full_name,
        avatarUrl: app.users.avatar_url,
      } : null,
    }));

    return {
      data: transformedData,
    };
  }),

  getApplicationInfo: protectedProcedure
    .input(getApplicationInfoSchema)
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { clientId, redirectUri, scope, state } = input;

      // Validate client_id
      const application = await getOAuthApplicationByClientId(db, clientId);
      if (!application || !application.active) {
        throw new Error("Invalid client_id");
      }

      // Validate redirect_uri
      if (!application.redirectUris.includes(redirectUri)) {
        throw new Error("Invalid redirect_uri");
      }

      // Validate scopes
      const requestedScopes = scope.split(" ").filter(Boolean);
      const invalidScopes = requestedScopes.filter(
        (s) => !application.scopes.includes(s),
      );

      if (invalidScopes.length > 0) {
        throw new Error(`Invalid scopes: ${invalidScopes.join(", ")}`);
      }

      // Return application info for consent screen
      return {
        id: application.id,
        name: application.name,
        description: application.description,
        overview: application.overview,
        developerName: application.developerName,
        logoUrl: application.logoUrl,
        website: application.website,
        installUrl: application.installUrl,
        screenshots: application.screenshots,
        clientId: application.clientId,
        scopes: requestedScopes,
        redirectUri: redirectUri,
        state,
        status: application.status,
      };
    }),

  authorize: protectedProcedure
    .input(authorizeOAuthApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const {
        clientId,
        decision,
        scopes,
        redirectUri,
        state,
        codeChallenge,
        teamId,
      } = input;

      // Validate client_id first (needed for both allow and deny)
      const application = await getOAuthApplicationByClientId(db, clientId);
      if (!application || !application.active) {
        throw new Error("Invalid client_id");
      }

      // Validate scopes against application's registered scopes (prevent privilege escalation)
      const invalidScopes = scopes.filter(
        (scope) => !application.scopes.includes(scope),
      );

      if (invalidScopes.length > 0) {
        throw new Error(`Invalid scopes: ${invalidScopes.join(", ")}`);
      }

      const redirectUrl = new URL(redirectUri);

      // Handle denial early - no need to check team membership for denial
      if (decision === "deny") {
        redirectUrl.searchParams.set("error", "access_denied");
        redirectUrl.searchParams.set("error_description", "User denied access");
        if (state) {
          redirectUrl.searchParams.set("state", state);
        }
        return { redirect_url: redirectUrl.toString() };
      }

      // Only validate team membership for "allow" decisions
      const userTeams = await getTeamsByUserId(db, session.user.id);

      if (!userTeams) {
        throw new Error("User not found");
      }

      const hasTeamAccess = userTeams.some((team) => team.id === teamId);

      if (!hasTeamAccess) {
        throw new Error("User is not a member of the specified team");
      }

      // Enforce PKCE for public clients
      if (application.isPublic && !codeChallenge) {
        throw new Error("PKCE is required for public clients");
      }

      // Create authorization code
      const authCode = await createAuthorizationCode(db, {
        applicationId: application.id,
        userId: session.user.id,
        teamId,
        scopes,
        redirectUri,
        codeChallenge,
      });

      if (!authCode) {
        throw new Error("Failed to create authorization code");
      }

      // Send app installation email only if this is the first time authorizing this app
      try {
        // Check if user has ever authorized this application for this team (including expired tokens)
        const hasAuthorizedBefore = await hasUserEverAuthorizedApp(
          db,
          session.user.id,
          teamId,
          application.id,
        );

        if (!hasAuthorizedBefore) {
          // Get team information
          const userTeam = userTeams.find((team) => team.id === teamId);

          if (userTeam && session.user.email) {
            const html = await render(
              AppInstalledEmail({
                email: session.user.email,
                teamName: userTeam.name!,
                appName: application.name,
              }),
            );

            await resend.emails.send({
              from: "Mid Poker <noreply@mid.poker>",
              to: session.user.email,
              subject: "An app has been added to your team",
              html,
            });
          }
        }
      } catch (error) {
        // Log error but don't fail the OAuth flow
        console.error("Failed to send app installation email:", error);
      }

      // Build success redirect URL
      redirectUrl.searchParams.set("code", authCode.code);
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }

      return { redirect_url: redirectUrl.toString() };
    }),

  create: protectedProcedure
    .input(createOAuthApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, teamId, session } = ctx;

      const application = await createOAuthApplication(db, {
        ...input,
        teamId: teamId!,
        createdBy: session.user.id,
      });

      return application;
    }),

  get: protectedProcedure
    .input(getOAuthApplicationSchema)
    .query(async ({ ctx, input }) => {
      const { db, teamId } = ctx;

      const application = await getOAuthApplicationById(db, input.id, teamId!);

      if (!application) {
        throw new Error("OAuth application not found");
      }

      return application;
    }),

  update: protectedProcedure
    .input(updateOAuthApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, teamId } = ctx;
      const { id, ...updateData } = input;

      const application = await updateOAuthApplication(db, {
        ...updateData,
        id,
        teamId: teamId!,
      });

      if (!application) {
        throw new Error("OAuth application not found");
      }

      return application;
    }),

  delete: protectedProcedure
    .input(deleteOAuthApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, teamId } = ctx;

      const result = await deleteOAuthApplication(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (!result) {
        throw new Error("OAuth application not found");
      }

      return { success: true };
    }),

  regenerateSecret: protectedProcedure
    .input(regenerateClientSecretSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, teamId } = ctx;

      const result = await regenerateClientSecret(db, input.id, teamId!);

      if (!result) {
        throw new Error("OAuth application not found");
      }

      return result;
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  authorized: protectedProcedure.query(async ({ ctx }) => {
    const { teamId, session } = ctx;
    const supabase = await createAdminClient();

    // Get authorized applications for user
    const { data: tokens, error } = await supabase
      .from("oauth_access_tokens")
      .select(`
        scopes,
        last_used_at,
        created_at,
        expires_at,
        refresh_token_expires_at,
        oauth_applications:application_id (
          id,
          name,
          description,
          overview,
          developer_name,
          logo_url,
          website,
          install_url,
          screenshots
        )
      `)
      .eq("user_id", session.user.id)
      .eq("team_id", teamId)
      .eq("revoked", false)
      .gt("expires_at", new Date().toISOString())
      .order("last_used_at", { ascending: false });

    if (error) {
      console.log("[oauthApplications.authorized] Supabase REST error:", error.message);
      return { data: [] };
    }

    // Transform to match expected format
    const transformedData = (tokens ?? []).map((token: any) => ({
      scopes: token.scopes,
      lastUsedAt: token.last_used_at,
      createdAt: token.created_at,
      expiresAt: token.expires_at,
      refreshTokenExpiresAt: token.refresh_token_expires_at,
      application: token.oauth_applications ? {
        id: token.oauth_applications.id,
        name: token.oauth_applications.name,
        description: token.oauth_applications.description,
        overview: token.oauth_applications.overview,
        developerName: token.oauth_applications.developer_name,
        logoUrl: token.oauth_applications.logo_url,
        website: token.oauth_applications.website,
        installUrl: token.oauth_applications.install_url,
        screenshots: token.oauth_applications.screenshots,
      } : null,
    }));

    return {
      data: transformedData,
    };
  }),

  revokeAccess: protectedProcedure
    .input(revokeUserApplicationAccessSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      await revokeUserApplicationTokens(
        db,
        session.user.id,
        input.applicationId,
      );

      return { success: true };
    }),

  updateApprovalStatus: protectedProcedure
    .input(updateApprovalStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, teamId, session } = ctx;

      // Get full application details before updating
      const application = await getOAuthApplicationById(db, input.id, teamId!);

      if (!application) {
        throw new Error("OAuth application not found");
      }

      const result = await updateOAuthApplicationstatus(db, {
        id: input.id,
        teamId: teamId!,
        status: input.status,
      });

      if (!result) {
        throw new Error("OAuth application not found");
      }

      // Send email notification when status changes to "pending"
      if (input.status === "pending") {
        try {
          // Get team information
          const userTeams = await getTeamsByUserId(db, session.user.id);
          const currentTeam = userTeams?.find((team) => team.id === teamId);

          if (currentTeam && session.user.email) {
            const html = await render(
              AppReviewRequestEmail({
                applicationName: application.name,
                developerName: application.developerName || undefined,
                teamName: currentTeam.name!,
                userEmail: session.user.email,
              }),
            );

            await resend.emails.send({
              from: "Mid Poker <noreply@mid.poker>",
              to: "support@mid.poker",
              subject: `Application Review Request - ${application.name}`,
              html,
            });
          }
        } catch (error) {
          // Log error but don't fail the mutation
          console.error("Failed to send application review request:", error);
        }
      }

      return result;
    }),
});
