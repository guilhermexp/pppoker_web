import {
  PPPOKER_BRIDGE_URL,
  bridgeFetch,
  getBridgeCredentials,
} from "@api/lib/bridge";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

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
    scheduled_ts: z.number().nullable().optional(),
    start_ts: z.number().nullable().optional(),
    next_start_ts: z.number().nullable().optional(),
    last_update_ts: z.number().nullable().optional(),
    creation_ts: z.number().nullable().optional(),
    late_reg_level: z.number().optional().default(0),
    re_entry_min: z.number().optional().default(0),
    guaranteed: z.number(),
    prize: prizeSchema.optional(),
    rake: z.number(),
    creator_uid: z.number().nullable().optional(),
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

      const url = new URL(`${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/rooms`);
      if (input.onlyActive) {
        url.searchParams.set("only_active", "true");
      }

      const resp = await bridgeFetch(url.toString(), {
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
