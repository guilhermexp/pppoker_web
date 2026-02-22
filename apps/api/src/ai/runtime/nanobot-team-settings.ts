import {
  type NanobotSettings,
  nanobotSettingsSchema,
  normalizeNanobotSettings,
} from "@api/schemas/nanobot";
import { createAdminClient } from "@api/services/supabase";

export async function getNanobotSettingsForTeam(
  teamId: string,
): Promise<NanobotSettings | null> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("teams")
      .select("export_settings")
      .eq("id", teamId)
      .single();

    if (error) {
      return null;
    }

    const raw =
      data?.export_settings &&
      typeof data.export_settings === "object" &&
      "nanobot" in (data.export_settings as Record<string, unknown>)
        ? (data.export_settings as Record<string, unknown>).nanobot
        : undefined;

    return normalizeNanobotSettings(nanobotSettingsSchema.parse(raw ?? {}));
  } catch {
    return null;
  }
}
