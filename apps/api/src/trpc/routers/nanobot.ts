import {
  nanobotSettingsSchema,
  normalizeNanobotSettings,
} from "@api/schemas/nanobot";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import { z as zod } from "zod";

function normalizeNanobotSettingsFromTeamExportSettings(
  exportSettings: unknown,
): z.infer<typeof nanobotSettingsSchema> {
  const raw =
    exportSettings &&
    typeof exportSettings === "object" &&
    "nanobot" in (exportSettings as Record<string, unknown>)
      ? (exportSettings as Record<string, unknown>).nanobot
      : undefined;

  return normalizeNanobotSettings(nanobotSettingsSchema.parse(raw ?? {}));
}

function getNanobotBaseUrlOrThrow() {
  const baseUrl = (process.env.NANOBOT_BASE_URL ?? "").trim();
  if (!baseUrl) {
    throw new TRPCError({
      code: "FAILED_PRECONDITION",
      message: "NANOBOT_BASE_URL não configurado",
    });
  }
  return baseUrl.replace(/\/+$/, "");
}

async function fetchNanobotJson(path: string, init?: RequestInit) {
  const baseUrl = getNanobotBaseUrlOrThrow();
  const resp = await fetch(`${baseUrl}${path}`, init);
  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok || data.success === false) {
    const message =
      (typeof data.error === "string" && data.error) ||
      `Nanobot runtime request failed (${resp.status})`;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }
  return data;
}

export const nanobotRouter = createTRPCRouter({
  getSettings: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("teams")
      .select("export_settings")
      .eq("id", teamId)
      .single();

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to load nanobot settings: ${error.message}`,
      });
    }

    return normalizeNanobotSettingsFromTeamExportSettings(
      data?.export_settings,
    );
  }),

  updateSettings: protectedProcedure
    .input(nanobotSettingsSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: team, error: getError } = await supabase
        .from("teams")
        .select("export_settings")
        .eq("id", teamId)
        .single();

      if (getError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to read existing settings: ${getError.message}`,
        });
      }

      const exportSettings =
        team?.export_settings && typeof team.export_settings === "object"
          ? ({ ...(team.export_settings as Record<string, unknown>) } as Record<
              string,
              unknown
            >)
          : {};

      exportSettings.nanobot = normalizeNanobotSettings(input);

      const { error: updateError } = await supabase
        .from("teams")
        .update({ export_settings: exportSettings })
        .eq("id", teamId);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update nanobot settings: ${updateError.message}`,
        });
      }

      return normalizeNanobotSettings(input);
    }),

  status: protectedProcedure.query(async () => {
    return {
      engine: "nanobot" as const,
      baseUrl: process.env.NANOBOT_BASE_URL ?? "",
      chatPath: process.env.NANOBOT_CHAT_PATH ?? "/api/chat",
      hasApiKey: Boolean(process.env.NANOBOT_API_KEY),
    };
  }),

  providerAuthStatus: protectedProcedure
    .input(
      zod
        .object({
          provider: zod.enum(["openai_codex"]).default("openai_codex"),
        })
        .optional(),
    )
    .query(async ({ ctx: { teamId }, input }) => {
      const provider = input?.provider ?? "openai_codex";
      const data = await fetchNanobotJson(
        `/oauth/status?team_id=${encodeURIComponent(teamId)}&provider=${encodeURIComponent(provider)}`,
      );
      return {
        provider,
        connected: Boolean(data.connected),
        accountId: typeof data.account_id === "string" ? data.account_id : null,
        expiresAt: typeof data.expires_at === "number" ? data.expires_at : null,
        expiresInSeconds:
          typeof data.expires_in_seconds === "number"
            ? data.expires_in_seconds
            : null,
      };
    }),

  startProviderAuth: protectedProcedure
    .input(
      zod.object({
        provider: zod.enum(["openai_codex"]),
        redirectUri: zod.string().url(),
      }),
    )
    .mutation(async ({ ctx: { teamId }, input }) => {
      if (input.provider !== "openai_codex") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider não suportado",
        });
      }
      const data = await fetchNanobotJson("/oauth/openai-codex/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          redirect_uri: input.redirectUri,
        }),
      });

      return {
        provider: "openai_codex" as const,
        state: typeof data.state === "string" ? data.state : "",
        authorizeUrl:
          typeof data.authorize_url === "string" ? data.authorize_url : "",
      };
    }),

  completeProviderAuth: protectedProcedure
    .input(
      zod.object({
        provider: zod.enum(["openai_codex"]),
        code: zod.string().min(1),
        state: zod.string().min(1),
      }),
    )
    .mutation(async ({ ctx: { teamId }, input }) => {
      if (input.provider !== "openai_codex") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider não suportado",
        });
      }
      const data = await fetchNanobotJson("/oauth/openai-codex/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          code: input.code,
          state: input.state,
        }),
      });
      return {
        provider: "openai_codex" as const,
        accountId: typeof data.account_id === "string" ? data.account_id : null,
        expiresAt: typeof data.expires_at === "number" ? data.expires_at : null,
      };
    }),

  importLocalProviderAuth: protectedProcedure
    .input(zod.object({ provider: zod.enum(["openai_codex"]) }))
    .mutation(async ({ ctx: { teamId }, input }) => {
      if (input.provider !== "openai_codex") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider não suportado",
        });
      }
      const data = await fetchNanobotJson("/oauth/openai-codex/import-local", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
        }),
      });
      return {
        provider: "openai_codex" as const,
        accountId: typeof data.account_id === "string" ? data.account_id : null,
        expiresAt: typeof data.expires_at === "number" ? data.expires_at : null,
        storage: typeof data.storage === "string" ? data.storage : null,
      };
    }),

  disconnectProviderAuth: protectedProcedure
    .input(zod.object({ provider: zod.enum(["openai_codex"]) }))
    .mutation(async ({ ctx: { teamId }, input }) => {
      const data = await fetchNanobotJson("/oauth/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          provider: input.provider,
        }),
      });
      return {
        provider:
          typeof data.provider === "string" ? data.provider : input.provider,
        success: true,
      };
    }),
});
