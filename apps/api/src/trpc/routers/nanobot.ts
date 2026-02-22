import { getLegacyToolManifest } from "@api/ai/runtime/legacy-tool-gateway";
import {
  nanobotSettingsSchema,
  normalizeNanobotSettings,
} from "@api/schemas/nanobot";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";

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
      engine: (process.env.CHAT_AGENT_ENGINE ?? "legacy").toLowerCase(),
      fallbackToLegacy:
        (process.env.NANOBOT_FALLBACK_TO_LEGACY ?? "true").toLowerCase() !==
        "false",
      baseUrl: process.env.NANOBOT_BASE_URL ?? "",
      chatPath: process.env.NANOBOT_CHAT_PATH ?? "/api/chat",
      hasApiKey: Boolean(process.env.NANOBOT_API_KEY),
    };
  }),

  toolsManifest: protectedProcedure.query(async () => {
    return {
      tools: getLegacyToolManifest(),
    };
  }),
});
