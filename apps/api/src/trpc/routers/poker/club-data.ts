import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { createTRPCRouter, protectedProcedure } from "../../init";

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

  const { data: team } = await supabase
    .from("teams")
    .select("poker_liga_id")
    .eq("id", teamId)
    .single();

  return {
    ...data,
    liga_id: team?.poker_liga_id ? Number(team.poker_liga_id) : null,
  };
}

const liveMemberSchema = z
  .object({
    uid: z.number(),
    nome: z.string().optional().default(""),
    papel_num: z.number().optional().default(10),
    papel: z.string().optional().default("Membro"),
    online: z.boolean().optional().default(false),
    ganhos: z.number().nullable().optional(),
    taxa: z.number().nullable().optional(),
    maos: z.number().nullable().optional(),
  })
  .passthrough();

const clubInfoSchema = z
  .object({
    club_id: z.number().nullable().optional(),
    club_name: z.string().optional().default(""),
    fichas_disponiveis: z.number().optional().default(0),
    owner_uid: z.number().nullable().optional(),
    owner_name: z.string().optional().default(""),
    user_role: z.number().optional().default(0),
    total_members: z.number().optional().default(0),
    avatar_url: z.string().optional().default(""),
  })
  .optional();

const liveMembersResponseSchema = z.object({
  success: z.boolean(),
  total: z.number().optional().default(0),
  members: z.array(liveMemberSchema).optional().default([]),
  club_info: clubInfoSchema,
  logged_in_uid: z.number().optional(),
});

const roomPrizeSchema = z
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
    nome: z.string().optional().default(""),
    game_type: z.string().optional().default(""),
    game_type_num: z.number().optional().default(0),
    is_tournament: z.boolean().optional().default(false),
    is_running: z.boolean().optional().default(false),
    max_players: z.number().optional().default(0),
    current_players: z.number().optional().default(0),
    registered: z.number().optional().default(0),
    buy_in: z.number().optional().default(0),
    fee: z.number().optional().default(0),
    guaranteed: z.number().optional().default(0),
    prize: roomPrizeSchema.optional(),
    rake: z.number().optional().default(0),
    start_ts: z.number().nullable().optional(),
    scheduled_ts: z.number().nullable().optional(),
    status: z.number().optional().default(0),
  })
  .passthrough();

const roomsResponseSchema = z.object({
  success: z.boolean(),
  liga_id: z.number().nullable().optional(),
  total: z.number().optional().default(0),
  rooms: z.array(roomSchema).optional().default([]),
});

function formatYmd(d: Date): number {
  return Number(
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`,
  );
}

function defaultLast30dRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return {
    dateStart: formatYmd(start),
    dateEnd: formatYmd(now),
  };
}

function sumBy<T>(items: T[], pick: (item: T) => number | null | undefined) {
  let total = 0;
  for (const item of items) {
    total += Number(pick(item) ?? 0);
  }
  return total;
}

function normalizeGameType(gameType: string) {
  const t = gameType.toLowerCase();
  if (t.includes("spin")) return "spin";
  if (t.includes("sng") || t.includes("sit")) return "sit_n_go";
  if (t.includes("mtt") || t.includes("tournament") || t.includes("torneio")) {
    return "mtt";
  }
  if (t.includes("plo5")) return "plo5";
  if (t.includes("plo4")) return "plo4";
  if (t.includes("plo")) return "plo";
  if (t.includes("nlh")) return "nlh";
  if (t.includes("hold")) return "nlh";
  return "other";
}

async function fetchMembersLive(
  creds: Awaited<ReturnType<typeof getBridgeCredentials>>,
  range?: { dateStart?: number; dateEnd?: number },
) {
  const url = new URL(`${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/members`);

  if (creds.liga_id) {
    const fallback = defaultLast30dRange();
    url.searchParams.set("liga_id", String(creds.liga_id));
    url.searchParams.set(
      "date_start",
      String(range?.dateStart ?? fallback.dateStart),
    );
    url.searchParams.set("date_end", String(range?.dateEnd ?? fallback.dateEnd));
  }

  const resp = await fetch(url.toString(), {
    headers: {
      "X-PPPoker-Username": creds.pppoker_username,
      "X-PPPoker-Password": creds.pppoker_password,
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`members bridge ${resp.status}: ${errText}`);
  }

  return liveMembersResponseSchema.parse(await resp.json());
}

async function fetchRoomsLive(
  creds: Awaited<ReturnType<typeof getBridgeCredentials>>,
  onlyActive = false,
) {
  const url = new URL(`${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/rooms`);
  if (onlyActive) {
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
    throw new Error(`rooms bridge ${resp.status}: ${errText}`);
  }

  return roomsResponseSchema.parse(await resp.json());
}

export const pokerClubDataRouter = createTRPCRouter({
  getLiveOverview: protectedProcedure
    .input(
      z
        .object({
          dateStart: z.number().optional(), // YYYYMMDD
          dateEnd: z.number().optional(), // YYYYMMDD
          includeRooms: z.boolean().optional().default(true),
          onlyActiveRooms: z.boolean().optional().default(false),
        })
        .optional()
        .default({}),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const creds = await getBridgeCredentials(teamId!);
      const errors: string[] = [];

      const [membersRes, roomsRes] = await Promise.all([
        fetchMembersLive(creds, {
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
        }).catch((err) => {
          errors.push(err instanceof Error ? err.message : String(err));
          return null;
        }),
        input.includeRooms
          ? fetchRoomsLive(creds, input.onlyActiveRooms).catch((err) => {
              errors.push(err instanceof Error ? err.message : String(err));
              return null;
            })
          : Promise.resolve(null),
      ]);

      if (!membersRes && !roomsRes) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errors[0] ?? "Falha ao buscar dados do clube",
        });
      }

      const fallbackRange = defaultLast30dRange();
      const period = {
        dateStart: input.dateStart ?? fallbackRange.dateStart,
        dateEnd: input.dateEnd ?? fallbackRange.dateEnd,
      };

      const members = membersRes?.members ?? [];
      const playerMembers = members.filter((m) => (m.papel_num ?? 10) === 10);
      const onlineMembers = members.filter((m) => m.online).length;

      const rooms = roomsRes?.rooms ?? [];
      const activeRooms = rooms.filter(
        (r) => r.is_running || (r.current_players ?? 0) > 0,
      );
      const spinRooms = rooms.filter(
        (r) => normalizeGameType(r.game_type ?? "") === "spin",
      );
      const runningSpinRooms = spinRooms.filter(
        (r) => r.is_running || (r.current_players ?? 0) > 0,
      );

      const byGameType: Record<
        string,
        {
          totalRooms: number;
          activeRooms: number;
          currentPlayers: number;
          registered: number;
          visibleBuyIn: number;
          visibleRake: number;
          visibleGuaranteed: number;
          visiblePrizeCollected: number;
        }
      > = {};

      for (const room of rooms) {
        const key = normalizeGameType(room.game_type ?? "");
        const bucket =
          byGameType[key] ??
          (byGameType[key] = {
            totalRooms: 0,
            activeRooms: 0,
            currentPlayers: 0,
            registered: 0,
            visibleBuyIn: 0,
            visibleRake: 0,
            visibleGuaranteed: 0,
            visiblePrizeCollected: 0,
          });

        bucket.totalRooms += 1;
        if (room.is_running || (room.current_players ?? 0) > 0) {
          bucket.activeRooms += 1;
        }
        bucket.currentPlayers += room.current_players ?? 0;
        bucket.registered += room.registered ?? 0;
        bucket.visibleBuyIn += room.buy_in ?? 0;
        bucket.visibleRake += room.rake ?? 0;
        bucket.visibleGuaranteed += room.guaranteed ?? 0;
        bucket.visiblePrizeCollected += room.prize?.collected ?? 0;
      }

      const roomListPreview = activeRooms
        .sort((a, b) => {
          const playersDiff = (b.current_players ?? 0) - (a.current_players ?? 0);
          if (playersDiff !== 0) return playersDiff;
          return (b.start_ts ?? 0) - (a.start_ts ?? 0);
        })
        .slice(0, 20)
        .map((r) => ({
          roomId: r.room_id,
          nome: r.nome ?? "",
          gameType: r.game_type ?? "",
          normalizedGameType: normalizeGameType(r.game_type ?? ""),
          isTournament: r.is_tournament ?? false,
          isRunning: r.is_running ?? false,
          currentPlayers: r.current_players ?? 0,
          registered: r.registered ?? 0,
          buyIn: r.buy_in ?? 0,
          fee: r.fee ?? 0,
          rake: r.rake ?? 0,
          guaranteed: r.guaranteed ?? 0,
          prizeCollected: r.prize?.collected ?? 0,
          startTs: r.start_ts ?? null,
          scheduledTs: r.scheduled_ts ?? null,
          status: r.status ?? 0,
        }));

      return {
        source: "pppoker_bridge",
        bridge: {
          clubId: Number(creds.club_id),
          ligaId: creds.liga_id,
        },
        period,
        capabilities: {
          memberPeriodStats: Boolean(creds.liga_id),
          roomsLiveSnapshot: Boolean(roomsRes),
          periodSessionsCount: false,
          periodSpinStats: false,
          periodSessionList: false,
          note:
            "Ganhos/Taxa/Maos por periodo vem de members(liga_id+date range). Partidas/Spin por periodo ainda nao foram mapeados no protocolo.",
        },
        unsupported: {
          panelMetrics: [
            "partidas",
            "buyin_spinup_period",
            "premiacao_spinup_period",
            "ganhos_spinup_period",
            "lista_partidas_periodo",
          ],
          reason:
            "pb.GameDataREQ identificado mas ainda retorna zeros com payload/contexto atual (ver Ppfichas reverse engineering).",
        },
        errors,
        clubInfo: membersRes?.club_info
          ? {
              clubId: membersRes.club_info.club_id ?? Number(creds.club_id),
              clubName: membersRes.club_info.club_name ?? "",
              ownerUid: membersRes.club_info.owner_uid ?? null,
              ownerName: membersRes.club_info.owner_name ?? "",
              userRole: membersRes.club_info.user_role ?? 0,
              fichasDisponiveis: membersRes.club_info.fichas_disponiveis ?? 0,
              totalMembers: membersRes.club_info.total_members ?? members.length,
              loggedInUid: membersRes.logged_in_uid ?? null,
            }
          : null,
        membersOverview: {
          totalMembers: members.length,
          onlineMembers,
          byRole: {
            dono: members.filter((m) => (m.papel_num ?? 0) === 1).length,
            gestor: members.filter((m) => (m.papel_num ?? 0) === 2).length,
            superAgente: members.filter((m) => (m.papel_num ?? 0) === 4).length,
            agente: members.filter((m) => (m.papel_num ?? 0) === 5).length,
            membro: playerMembers.length,
          },
          periodTotalsAllMembers: {
            ganhos: sumBy(members, (m) => m.ganhos),
            taxa: sumBy(members, (m) => m.taxa),
            maos: sumBy(members, (m) => m.maos),
          },
          periodTotalsPlayersOnly: {
            ganhos: sumBy(playerMembers, (m) => m.ganhos),
            taxa: sumBy(playerMembers, (m) => m.taxa),
            maos: sumBy(playerMembers, (m) => m.maos),
          },
        },
        roomsOverview: roomsRes
          ? {
              ligaId: roomsRes.liga_id ?? creds.liga_id,
              totalRooms: rooms.length,
              activeRooms: activeRooms.length,
              currentPlayersNow: sumBy(activeRooms, (r) => r.current_players),
              registeredNow: sumBy(rooms, (r) => r.registered),
              visibleTotals: {
                buyIn: sumBy(rooms, (r) => r.buy_in),
                rake: sumBy(rooms, (r) => r.rake),
                guaranteed: sumBy(rooms, (r) => r.guaranteed),
                prizeCollected: sumBy(rooms, (r) => r.prize?.collected),
              },
              spinLiveSnapshot: {
                totalRooms: spinRooms.length,
                activeRooms: runningSpinRooms.length,
                currentPlayersNow: sumBy(runningSpinRooms, (r) => r.current_players),
                visibleTotals: {
                  buyIn: sumBy(spinRooms, (r) => r.buy_in),
                  rake: sumBy(spinRooms, (r) => r.rake),
                  guaranteed: sumBy(spinRooms, (r) => r.guaranteed),
                  prizeCollected: sumBy(spinRooms, (r) => r.prize?.collected),
                },
              },
              byGameType,
              topActiveRooms: roomListPreview,
            }
          : null,
      };
    }),
});
