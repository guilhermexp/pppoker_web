import type { Session } from "@api/utils/auth";
import { createAdminClient } from "@api/services/supabase";
import { teamCache } from "@midpoker/cache/team-cache";
import type { Database } from "@midpoker/db/client";
import { TRPCError } from "@trpc/server";

// Helper to get user team data via Supabase REST API (fallback when Drizzle fails)
async function getUserTeamDataViaSupabase(userId: string) {
  const supabase = await createAdminClient();

  // Get user's team_id
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, team_id")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    console.log("[getUserTeamDataViaSupabase] User error:", userError?.message);
    return null;
  }

  // Get user's team memberships
  const { data: memberships, error: memberError } = await supabase
    .from("users_on_team")
    .select("id, team_id")
    .eq("user_id", userId);

  if (memberError) {
    console.log(
      "[getUserTeamDataViaSupabase] Memberships error:",
      memberError?.message,
    );
  }

  // Transform snake_case to camelCase to match Drizzle output
  const transformedMemberships = (memberships || []).map(
    (m: { id: string; team_id: string }) => ({
      id: m.id,
      teamId: m.team_id,
    }),
  );

  return {
    teamId: user.team_id,
    usersOnTeams: transformedMemberships,
  };
}

export const withTeamPermission = async <TReturn>(opts: {
  ctx: {
    session?: Session | null;
    db: Database;
  };
  next: (opts: {
    ctx: {
      session?: Session | null;
      db: Database;
      teamId: string | null;
    };
  }) => Promise<TReturn>;
}) => {
  const { ctx, next } = opts;

  const userId = ctx.session?.user?.id;

  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required - please log in",
    });
  }

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  const result = await getUserTeamDataViaSupabase(userId);

  if (!result) {
    console.log(
      "[withTeamPermission] No result from fallback - user not found",
    );
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  const teamId = result.teamId;

  // If teamId is null, user has no team assigned but this is now allowed
  if (teamId !== null) {
    const hasAccess = result.usersOnTeams.some(
      (membership) => membership.teamId === teamId,
    );

    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No permission to access this team",
      });
    }
  }

  return next({
    ctx: {
      session: ctx.session,
      teamId,
      db: ctx.db,
    },
  });
};
