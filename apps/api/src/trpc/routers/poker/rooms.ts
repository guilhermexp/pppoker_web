import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { createTRPCRouter, protectedProcedure } from "../../init";
import { createAdminClient } from "@api/services/supabase";

const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:3102";

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
      message: "Nenhuma conexao PPPoker encontrada. Faca login novamente.",
    });
  }

  return data;
}

const prizeSchema = z
  .object({
    total: z.number().optional().default(0),
    collected: z.number().optional().default(0),
    remaining: z.number().optional().default(0),
    guarantee: z.number().optional().default(0),
  })
  .passthrough();

const roomSchema = z
  .object({
    room_id: z.number(),
    nome: z.string(),
    game_type: z.string(),
    game_type_num: z.number(),
    is_tournament: z.boolean(),
    is_running: z.boolean(),
    max_players: z.number(),
    current_players: z.number(),
    registered: z.number(),
    buy_in: z.number(),
    fee: z.number(),
    starting_chips: z.number(),
    blind_duration: z.number(),
    status: z.number(),
    scheduled_ts: z.number(),
    start_ts: z.number(),
    guaranteed: z.number(),
    prize: prizeSchema.optional(),
    rake: z.number(),
    creator_uid: z.number(),
  })
  .passthrough();

const getRoomsResponse = z.object({
  success: z.boolean(),
  liga_id: z.number().nullable().optional(),
  total: z.number(),
  rooms: z.array(roomSchema),
});

export const pokerRoomsRouter = createTRPCRouter({
  getLive: protectedProcedure
    .input(
      z
        .object({
          onlyActive: z.boolean().optional().default(false),
        })
        .optional()
        .default({}),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const creds = await getBridgeCredentials(teamId!);

      const url = new URL(
        `${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/rooms`,
      );
      if (input.onlyActive) {
        url.searchParams.set("only_active", "true");
      }

      const resp = await fetch(url.toString(), {
        headers: {
          "X-PPPoker-Username": creds.pppoker_username,
          "X-PPPoker-Password": creds.pppoker_password,
        },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao buscar mesas: ${errText}`,
        });
      }

      const json = await resp.json();
      return getRoomsResponse.parse(json);
    }),
});
