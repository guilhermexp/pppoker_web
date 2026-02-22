import { createAdminClient } from "@api/services/supabase";
import { triggerSyncForTeam } from "@api/services/pppoker-sync";
import { logger } from "@midpoker/logger";
import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { createTRPCRouter, protectedProcedure } from "../../init";

const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:8000";

/**
 * Helper to get bridge credentials for the current team
 */
async function getBridgeCredentials(teamId: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("pppoker_club_connections")
    .select("club_id, pppoker_username, pppoker_password")
    .eq("team_id", teamId)
    .in("sync_status", ["active", "error"])
    .limit(1)
    .single();

  if (!data) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nenhuma conexão PPPoker encontrada. Faça login novamente.",
    });
  }

  return data;
}

export const pppokerRouter = createTRPCRouter({
  /**
   * Trigger immediate sync for the current team
   */
  syncNow: protectedProcedure.mutation(async ({ ctx: { teamId } }) => {
    try {
      const synced = await triggerSyncForTeam(teamId!);
      return { success: true, synced };
    } catch (err) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        "Manual sync failed",
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao sincronizar. Tente novamente.",
      });
    }
  }),

  /**
   * Get sync status for the current team
   */
  getSyncStatus: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: connections } = await supabase
      .from("pppoker_club_connections")
      .select("id, club_id, club_name, last_synced_at, sync_status")
      .eq("team_id", teamId);

    // Count online players
    const { count: onlineCount } = await supabase
      .from("poker_players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("is_online", true);

    return {
      connections: (connections ?? []).map((c) => ({
        id: c.id,
        clubId: c.club_id,
        clubName: c.club_name,
        lastSyncedAt: c.last_synced_at,
        syncStatus: c.sync_status,
      })),
      onlineCount: onlineCount ?? 0,
    };
  }),

  /**
   * Send chips to a player via bridge
   */
  sendChips: protectedProcedure
    .input(
      z.object({
        targetPlayerId: z.number().int().positive(),
        amount: z.number().int().positive(),
        ligaId: z.number().int().positive().default(3357),
      }),
    )
    .mutation(async ({ input, ctx: { teamId } }) => {
      const creds = await getBridgeCredentials(teamId!);

      const resp = await fetch(
        `${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/chips/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PPPoker-Username": creds.pppoker_username,
            "X-PPPoker-Password": creds.pppoker_password,
          },
          body: JSON.stringify({
            target_player_id: input.targetPlayerId,
            amount: input.amount,
            liga_id: input.ligaId,
          }),
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao enviar fichas: ${errText}`,
        });
      }

      return await resp.json();
    }),

  /**
   * Withdraw chips from a player via bridge
   */
  withdrawChips: protectedProcedure
    .input(
      z.object({
        targetPlayerId: z.number().int().positive(),
        amount: z.number().int().positive(),
        ligaId: z.number().int().positive().default(3357),
      }),
    )
    .mutation(async ({ input, ctx: { teamId } }) => {
      const creds = await getBridgeCredentials(teamId!);

      const resp = await fetch(
        `${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/chips/withdraw`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PPPoker-Username": creds.pppoker_username,
            "X-PPPoker-Password": creds.pppoker_password,
          },
          body: JSON.stringify({
            target_player_id: input.targetPlayerId,
            amount: input.amount,
            liga_id: input.ligaId,
          }),
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao sacar fichas: ${errText}`,
        });
      }

      return await resp.json();
    }),

  /**
   * Get live member data directly from PPPoker (bypass cache/sync)
   */
  getMemberLive: protectedProcedure
    .input(
      z.object({
        memberUid: z.number().int().positive(),
      }),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const creds = await getBridgeCredentials(teamId!);

      const resp = await fetch(
        `${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/members/${input.memberUid}`,
        {
          headers: {
            "X-PPPoker-Username": creds.pppoker_username,
            "X-PPPoker-Password": creds.pppoker_password,
          },
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao buscar membro: ${errText}`,
        });
      }

      return await resp.json();
    }),
});
