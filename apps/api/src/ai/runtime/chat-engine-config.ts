export type ChatEngine = "legacy" | "nanobot";

export function getChatEngineFromEnv(
  env: Record<string, string | undefined> = process.env,
): ChatEngine {
  const raw = (env.CHAT_AGENT_ENGINE ?? env.AI_AGENT_ENGINE ?? "nanobot")
    .trim()
    .toLowerCase();

  if (raw === "legacy") return "legacy";
  return "nanobot";
}

export function shouldFallbackToLegacyOnNanobotError(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (env.NANOBOT_FALLBACK_TO_LEGACY ?? "false").toLowerCase() === "true";
}
