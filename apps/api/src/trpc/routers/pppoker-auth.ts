import { createAdminClient } from "@api/services/supabase";
import { logger } from "@midpoker/logger";
import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:8000";

export const pppokerAuthRouter = createTRPCRouter({
  /**
   * Login with PPPoker credentials.
   * 1. Validates credentials against PPPoker API via bridge
   * 2. Creates/finds a Supabase user mapped by PPPoker UID
   * 3. Creates a team linked to the club_id
   * 4. Returns a Supabase session (JWT)
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        clubId: z.number().int().positive(),
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

      // Step 2: Create or find Supabase user mapped by PPPoker UID
      // Use separate clients: one for auth operations (which changes internal session),
      // and one for DB operations that must keep service_role privileges
      const supabase = await createAdminClient();
      const adminDb = await createAdminClient();

      // Use a deterministic email for the Supabase user based on PPPoker UID
      const mappedEmail = `pppoker_${pppokerUid}@midpoker.internal`;
      const mappedPassword = `ppk_${pppokerUid}_${password.slice(0, 8)}`;

      // Try to sign in first
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: mappedEmail,
          password: mappedPassword,
        });

      let userId: string;
      let accessToken: string;
      let refreshToken: string;

      if (signInData?.session) {
        // Existing user - sign in succeeded
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

        // Create the public.users row (auth.users does NOT auto-create it)
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

        // Step 3: Create team linked to club
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

        // Create club connection record
        await adminDb.from("pppoker_club_connections").insert({
          team_id: team.id,
          club_id: clubId,
          pppoker_username: username,
          pppoker_password: password,
          sync_status: "active",
        });
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

      // Ensure club connection exists for existing users too
      const { data: userData } = await adminDb
        .from("users")
        .select("team_id")
        .eq("id", userId)
        .single();

      if (userData?.team_id) {
        // Upsert club connection
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

      return {
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
