import { createAdminClient } from "@api/services/supabase";
import { TRPCError } from "@trpc/server";
import { z } from "@hono/zod-openapi";
import { createTRPCRouter, protectedProcedure } from "../../init";

const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:8000";

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

const liveMemberSchema = z
  .object({
    uid: z.number(),
    nome: z.string(),
    papel_num: z.number(),
    papel: z.string(),
    avatar_url: z.string().optional().default(""),
    join_ts: z.number(),
    last_active_ts: z.number(),
    titulo: z.string().optional().default(""),
    online: z.boolean(),
    saldo_caixa: z.number().nullable().optional(),
    credito_linha: z.number().optional().default(-1),
    agente_uid: z.number().nullable().optional(),
    agente_nome: z.string().optional().default(""),
    super_agente_uid: z.number().nullable().optional(),
    super_agente_nome: z.string().optional().default(""),
    downlines: z.array(z.unknown()).optional().default([]),
  })
  .passthrough();

const clubInfoSchema = z.object({
  club_id: z.number().nullable().optional(),
  club_name: z.string().optional().default(""),
  fichas_disponiveis: z.number().optional().default(0),
  owner_uid: z.number().nullable().optional(),
  owner_name: z.string().optional().default(""),
  user_role: z.number().optional().default(0),
  total_members: z.number().optional().default(0),
  avatar_url: z.string().optional().default(""),
}).optional();

const getLiveMembersResponse = z.object({
  success: z.boolean(),
  total: z.number(),
  members: z.array(liveMemberSchema),
  club_info: clubInfoSchema,
  logged_in_uid: z.number().optional(),
});

export const pokerMembersRouter = createTRPCRouter({
  /**
   * Get live member list directly from PPPoker bridge (real-time)
   */
  getLive: protectedProcedure
    .input(
      z
        .object({
          q: z.string().optional(),
        })
        .optional()
        .default({}),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const creds = await getBridgeCredentials(teamId!);

      const resp = await fetch(
        `${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/members`,
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
          message: `Falha ao buscar membros ao vivo: ${errText}`,
        });
      }

      const json = await resp.json();
      const parsed = getLiveMembersResponse.parse(json);

      let members = parsed.members;

      // Client-side search filter
      if (input.q) {
        const q = input.q.toLowerCase();
        members = members.filter(
          (m) =>
            m.nome.toLowerCase().includes(q) ||
            m.titulo.toLowerCase().includes(q) ||
            String(m.uid).includes(q),
        );
      }

      return {
        total: members.length,
        members,
        clubInfo: parsed.club_info
          ? {
              fichasDisponiveis: parsed.club_info.fichas_disponiveis ?? 0,
              clubName: parsed.club_info.club_name ?? "",
              ownerName: parsed.club_info.owner_name ?? "",
              totalMembers: parsed.club_info.total_members ?? 0,
            }
          : undefined,
        loggedInUid: parsed.logged_in_uid ?? undefined,
      };
    }),
});
