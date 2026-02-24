import {
  type NanobotSettings,
  nanobotSettingsSchema,
  normalizeNanobotSettings,
} from "@api/schemas/nanobot";
import { createAdminClient } from "@api/services/supabase";

const CACHE_TTL_MS = 60_000;
const _cache = new Map<string, { settings: NanobotSettings | null; expiresAt: number }>();

export async function getNanobotSettingsForTeam(
  teamId: string,
): Promise<NanobotSettings | null> {
  const now = Date.now();
  const cached = _cache.get(teamId);
  if (cached && cached.expiresAt > now) {
    return cached.settings;
  }

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("teams")
      .select("export_settings")
      .eq("id", teamId)
      .single();

    if (error) {
      _cache.set(teamId, { settings: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const raw =
      data?.export_settings &&
      typeof data.export_settings === "object" &&
      "nanobot" in (data.export_settings as Record<string, unknown>)
        ? (data.export_settings as Record<string, unknown>).nanobot
        : undefined;

    const settings = normalizeNanobotSettings(nanobotSettingsSchema.parse(raw ?? {}));
    _cache.set(teamId, { settings, expiresAt: now + CACHE_TTL_MS });
    return settings;
  } catch {
    _cache.set(teamId, { settings: null, expiresAt: now + CACHE_TTL_MS });
    return null;
  }
}
