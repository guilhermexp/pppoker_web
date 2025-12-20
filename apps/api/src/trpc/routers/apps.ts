import {
  disconnectAppSchema,
  updateAppSettingsSchema,
} from "@api/schemas/apps";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";

export const appsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: apps, error } = await supabase
      .from("apps")
      .select("app_id, settings")
      .eq("team_id", teamId);

    if (error) {
      console.log("[apps.get] Supabase REST error:", error.message);
      return [];
    }

    return apps?.map((app) => ({
      appId: app.app_id,
      settings: app.settings,
    })) ?? [];
  }),

  disconnect: protectedProcedure
    .input(disconnectAppSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const { appId } = input;
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("apps")
        .delete()
        .eq("app_id", appId)
        .eq("team_id", teamId);

      if (error) {
        console.log("[apps.disconnect] Supabase REST error:", error.message);
        throw new Error(`Failed to disconnect app: ${error.message}`);
      }

      return { success: true };
    }),

  update: protectedProcedure
    .input(updateAppSettingsSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const { appId, option } = input;
      const supabase = await createAdminClient();

      // Get current settings
      const { data: app } = await supabase
        .from("apps")
        .select("settings")
        .eq("app_id", appId)
        .eq("team_id", teamId)
        .single();

      const currentSettings = (app?.settings as Record<string, unknown>) ?? {};
      const newSettings = { ...currentSettings, ...option };

      const { data, error } = await supabase
        .from("apps")
        .update({ settings: newSettings })
        .eq("app_id", appId)
        .eq("team_id", teamId)
        .select()
        .single();

      if (error) {
        console.log("[apps.update] Supabase REST error:", error.message);
        throw new Error(`Failed to update app settings: ${error.message}`);
      }

      return data;
    }),
});
