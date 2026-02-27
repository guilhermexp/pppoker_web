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

const CLUB_CREATOR_ROLE_NUMS = new Set([1, 2]); // Dono, Gestor

function canCreateOrganizationForClub(club: BridgeClub | undefined): boolean {
  return club ? CLUB_CREATOR_ROLE_NUMS.has(club.user_role_num) : false;
}

function mapTeamRoleFromClubRole(
  club: BridgeClub | undefined,
): "owner" | "member" {
  return canCreateOrganizationForClub(club) ? "owner" : "member";
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

/**
 * Find or create a dedicated team for a specific club.
 * Each club gets its own isolated team (organization).
 *
 * A team is "dedicated" when poker_club_id matches. Legacy shared teams
 * (one team with multiple clubs) are ignored — a new dedicated team is created.
 */
async function findOrCreateTeamForClub(
  adminDb: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  clubId: number,
  clubData: BridgeClub | undefined,
  mappedEmail: string,
) {
  const clubIdStr = String(clubId);
  const clubName = clubData?.club_name ?? `Clube ${clubId}`;
  const userTeamRole = mapTeamRoleFromClubRole(clubData);

  // Look for an existing DEDICATED team for this club globally.
  // We want 1 club = 1 organization.
  const { data: dedicatedTeam } = await adminDb
    .from("teams")
    .select("id")
    .eq("poker_club_id", clubIdStr)
    .maybeSingle();

  if (dedicatedTeam) {
    const { data: existingLink } = await adminDb
      .from("users_on_team")
      .select("id, role")
      .eq("user_id", userId)
      .eq("team_id", dedicatedTeam.id)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkError } = await adminDb.from("users_on_team").insert({
        user_id: userId,
        team_id: dedicatedTeam.id,
        role: userTeamRole,
      });

      if (linkError) {
        logger.error({ error: linkError }, "Failed to link user to existing club team");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao vincular usuário à organização do clube.",
        });
      }
    } else if (userTeamRole === "owner" && existingLink.role !== "owner") {
      // Upgrade membership if PPPoker role is owner/manager
      await adminDb
        .from("users_on_team")
        .update({ role: "owner" })
        .eq("id", existingLink.id);
    }

    return dedicatedTeam.id;
  }

  // No dedicated team exists yet: only club owner/manager may create it.
  if (!canCreateOrganizationForClub(clubData)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Somente Dono ou Gestor do clube pode criar a organização deste clube no sistema.",
    });
  }

  // No dedicated team — create one
  const { data: newTeam, error: teamError } = await adminDb
    .from("teams")
    .insert({
      name: clubName,
      email: mappedEmail,
      poker_platform: "pppoker",
      poker_club_id: clubIdStr,
      poker_club_name: clubName,
      poker_entity_type: clubData?.liga_id ? "clube_liga" : "clube_privado",
      poker_liga_id: clubData?.liga_id ? String(clubData.liga_id) : null,
    })
    .select("id")
    .single();

  if (teamError || !newTeam) {
    logger.error({ error: teamError }, "Failed to create team for club");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Falha ao criar organização para o clube ${clubId}`,
    });
  }

  // Link user to new team (check first — no unique constraint on user_id,team_id)
  const { data: existingLink } = await adminDb
    .from("users_on_team")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", newTeam.id)
    .maybeSingle();

  if (!existingLink) {
    await adminDb.from("users_on_team").insert({
      user_id: userId,
      team_id: newTeam.id,
      role: userTeamRole,
    });
  }

  return newTeam.id;
}

export const pppokerAuthRouter = createTRPCRouter({
  /**
   * Login with PPPoker credentials.
   *
   * Two behaviours controlled by whether `clubId` is provided:
   *
   * 1. Without clubId → validates credentials, returns list of clubs (no session created)
   * 2. With clubId → full login: creates Supabase user/session per club, returns JWT
   *
   * Each club gets its own team (organization) for complete data isolation.
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
          message: JSON.stringify({
            type: "email_verification",
            secret_mail: loginResult.secret_mail ?? "",
            uid: loginResult.uid ?? 0,
          }),
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

      // --- Ensure Supabase user exists ---
      let userId: string;
      let accessToken: string;
      let refreshToken: string;

      const { data: signInData } =
        await supabase.auth.signInWithPassword({
          email: mappedEmail,
          password: mappedPassword,
        });

      if (signInData?.session) {
        userId = signInData.user.id;
        accessToken = signInData.session.access_token;
        refreshToken = signInData.session.refresh_token;
      } else {
        // New user — create account
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

        await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });

        await adminDb.from("users").upsert(
          { id: userId, full_name: username, email: mappedEmail },
          { onConflict: "id" },
        );

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
      }

      // Ensure public.users row exists
      await adminDb.from("users").upsert(
        { id: userId, full_name: username, email: mappedEmail },
        { onConflict: "id", ignoreDuplicates: true },
      );

      // --- Find or create a DEDICATED team for the selected club ---
      const selectedClub = bridgeClubs.find((c) => c.club_id === clubId);
      if (!selectedClub) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Clube selecionado não encontrado na conta PPPoker informada. Faça login novamente e selecione um clube válido.",
        });
      }

      const teamId = await findOrCreateTeamForClub(
        adminDb,
        userId,
        clubId,
        selectedClub,
        mappedEmail,
      );

      // Switch user's active team to the selected club's team
      await adminDb
        .from("users")
        .update({ team_id: teamId })
        .eq("id", userId);

      // Ensure club connection exists and is active
      const clubName = selectedClub?.club_name ?? `Clube ${clubId}`;
      await adminDb.from("pppoker_club_connections").upsert(
        {
          team_id: teamId,
          club_id: clubId,
          club_name: clubName,
          pppoker_username: username,
          pppoker_password: password,
          sync_status: "active",
        },
        { onConflict: "team_id,club_id" },
      );

      // Update poker settings on the team
      const pokerSettings: Record<string, unknown> = {
        poker_platform: "pppoker",
        poker_club_id: String(clubId),
        poker_club_name: clubName,
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
        .eq("id", teamId);

      return {
        step: "done" as const,
        accessToken,
        refreshToken,
        pppokerUid,
        clubId,
      };
    }),

  /**
   * Send email verification code for login (code -15 flow).
   * The user must provide the full email linked to their PPPoker account.
   */
  sendVerificationCode: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const resp = await fetch(
          `${PPPOKER_BRIDGE_URL}/auth/send-verification-code`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: input.email }),
          },
        );

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              (errorData as { detail?: string }).detail ??
              "Falha ao enviar código de verificação.",
          });
        }

        return { success: true };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        logger.error({ err }, "Failed to send verification code");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao enviar código de verificação.",
        });
      }
    }),

  /**
   * Logout - client-side clears the session
   */
  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),
});
