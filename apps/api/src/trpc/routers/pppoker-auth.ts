import { createAdminClient } from "@api/services/supabase";
import { logger } from "@midpoker/logger";
import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:3102";

/** Shape returned by GET /clubs on the bridge */
interface BridgeClub {
  club_id: number;
  club_name: string;
  avatar_url: string;
  member_count: number;
  user_role_num: number;
  user_role: string;
  liga_id: number | null;
}

async function fetchBridgeClubs(
  username: string,
  password: string,
): Promise<BridgeClub[]> {
  const resp = await fetch(`${PPPOKER_BRIDGE_URL}/clubs`, {
    headers: {
      "X-PPPoker-Username": username,
      "X-PPPoker-Password": password,
    },
  });

  if (!resp.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Falha ao buscar clubes do PPPoker.",
    });
  }

  const data = (await resp.json()) as { clubs: BridgeClub[] };
  return data.clubs ?? [];
}

export const pppokerAuthRouter = createTRPCRouter({
  /**
   * Login with PPPoker credentials.
   *
   * Two behaviours controlled by whether `clubId` is provided:
   *
   * 1. Without clubId → validates credentials, returns list of clubs (no session created)
   * 2. With clubId → full login: creates Supabase user/session, saves all clubs, returns JWT
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        clubId: z.number().int().positive().optional(),
        verifyCode: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { username, password, clubId, verifyCode } = input;

      // Step 1: Validate credentials via FastAPI bridge
      let loginResult: {
        success: boolean;
        uid?: number;
        rdkey?: string;
        gserver_ip?: string;
        needs_verify?: boolean;
        secret_mail?: string;
        error?: string;
      };

      try {
        const resp = await fetch(`${PPPOKER_BRIDGE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            verify_code: verifyCode || null,
          }),
        });
        loginResult = await resp.json();
      } catch (err) {
        logger.error({ err }, "Failed to connect to PPPoker bridge");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Falha ao conectar com o servidor PPPoker. Verifique se o bridge está rodando.",
        });
      }

      if (loginResult.needs_verify) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Verificação por email necessária. Código enviado para ${loginResult.secret_mail}. Faça login novamente com o código.`,
        });
      }

      if (!loginResult.success || !loginResult.uid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: loginResult.error || "Credenciais PPPoker inválidas",
        });
      }

      const pppokerUid = loginResult.uid;

      // Fetch all clubs for this user
      let bridgeClubs: BridgeClub[] = [];
      try {
        bridgeClubs = await fetchBridgeClubs(username, password);
      } catch (err) {
        logger.warn({ err }, "Failed to fetch clubs list from bridge");
      }

      // ── Step "select_club": no clubId → return clubs for selection ──
      if (!clubId) {
        return {
          step: "select_club" as const,
          pppokerUid,
          clubs: bridgeClubs.map((c) => ({
            clubId: c.club_id,
            clubName: c.club_name,
            userRole: c.user_role,
            userRoleNum: c.user_role_num,
            memberCount: c.member_count,
            ligaId: c.liga_id,
            avatarUrl: c.avatar_url,
          })),
        };
      }

      // ── Step "done": clubId provided → full login ──

      const supabase = await createAdminClient();
      const adminDb = await createAdminClient();

      const mappedEmail = `pppoker_${pppokerUid}@midpoker.internal`;
      const mappedPassword = `ppk_${pppokerUid}_${password.slice(0, 8)}`;

      // Try to sign in first
      const { data: signInData } =
        await supabase.auth.signInWithPassword({
          email: mappedEmail,
          password: mappedPassword,
        });

      let userId: string;
      let accessToken: string;
      let refreshToken: string;

      if (signInData?.session) {
        // Existing user
        userId = signInData.user.id;
        accessToken = signInData.session.access_token;
        refreshToken = signInData.session.refresh_token;
      } else {
        // New user - create account
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: mappedEmail,
            password: mappedPassword,
            options: {
              data: {
                full_name: username,
                pppoker_uid: pppokerUid,
              },
            },
          });

        if (signUpError || !signUpData.user) {
          logger.error({ error: signUpError }, "Failed to create Supabase user");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar conta. Tente novamente.",
          });
        }

        userId = signUpData.user.id;

        // Auto-confirm the user (since we validated via PPPoker)
        await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });

        // Create the public.users row
        await adminDb.from("users").upsert(
          {
            id: userId,
            full_name: username,
            email: mappedEmail,
          },
          { onConflict: "id" },
        );

        // Sign in to get session
        const { data: newSignIn, error: newSignInError } =
          await supabase.auth.signInWithPassword({
            email: mappedEmail,
            password: mappedPassword,
          });

        if (newSignInError || !newSignIn.session) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao iniciar sessão após criar conta.",
          });
        }

        accessToken = newSignIn.session.access_token;
        refreshToken = newSignIn.session.refresh_token;

        // Create team linked to club
        const teamName = `Clube ${clubId}`;
        const { data: team, error: teamError } = await adminDb
          .from("teams")
          .insert({
            name: teamName,
            email: mappedEmail,
          })
          .select("id")
          .single();

        if (teamError) {
          logger.error({ error: teamError }, "Failed to create team");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Falha ao criar equipe: ${teamError.message}`,
          });
        }

        // Link user to team
        await adminDb.from("users_on_team").insert({
          user_id: userId,
          team_id: team.id,
          role: "owner",
        });

        // Set team_id on user
        await adminDb
          .from("users")
          .update({ team_id: team.id })
          .eq("id", userId);
      }

      // Ensure public.users row exists for returning users too
      await adminDb.from("users").upsert(
        {
          id: userId,
          full_name: username,
          email: mappedEmail,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      // Get the team_id for saving club connections
      const { data: userData } = await adminDb
        .from("users")
        .select("team_id")
        .eq("id", userId)
        .single();

      if (userData?.team_id) {
        // Save ALL clubs from bridge (selected one as active, rest as inactive)
        for (const club of bridgeClubs) {
          await adminDb.from("pppoker_club_connections").upsert(
            {
              team_id: userData.team_id,
              club_id: club.club_id,
              club_name: club.club_name,
              pppoker_username: username,
              pppoker_password: password,
              sync_status: club.club_id === clubId ? "active" : "inactive",
            },
            { onConflict: "team_id,club_id" },
          );
        }

        // Fallback: if selected club wasn't in bridge list, save it anyway
        const selectedInList = bridgeClubs.some((c) => c.club_id === clubId);
        if (!selectedInList) {
          await adminDb.from("pppoker_club_connections").upsert(
            {
              team_id: userData.team_id,
              club_id: clubId,
              pppoker_username: username,
              pppoker_password: password,
              sync_status: "active",
            },
            { onConflict: "team_id,club_id" },
          );
        }

        // Auto-fill poker settings from selected club data
        const selectedClub = bridgeClubs.find((c) => c.club_id === clubId);
        const pokerSettings: Record<string, unknown> = {
          poker_platform: "pppoker",
          poker_club_id: String(clubId),
          poker_club_name: selectedClub?.club_name ?? `Clube ${clubId}`,
        };

        if (selectedClub?.liga_id) {
          pokerSettings.poker_entity_type = "clube_liga";
          pokerSettings.poker_liga_id = String(selectedClub.liga_id);
        } else {
          pokerSettings.poker_entity_type = "clube_privado";
        }

        await adminDb
          .from("teams")
          .update(pokerSettings)
          .eq("id", userData.team_id);
      }

      return {
        step: "done" as const,
        accessToken,
        refreshToken,
        pppokerUid,
        clubId,
      };
    }),

  /**
   * Logout - client-side clears the session
   */
  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),
});
