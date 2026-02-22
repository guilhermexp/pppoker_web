import { mainAgent } from "@api/ai/agents/main";
import type { NanobotSettings } from "@api/schemas/nanobot";
import {
  getChatEngineFromEnv,
  shouldFallbackToLegacyOnNanobotError,
} from "./chat-engine-config";
import { nanobotToUIMessageStream } from "./nanobot";

export type LegacyChatStreamOptions = Parameters<
  typeof mainAgent.toUIMessageStream
>[0];
type ChatResponse = Awaited<ReturnType<typeof mainAgent.toUIMessageStream>>;

function resolveRequestedEngine(options: LegacyChatStreamOptions) {
  const envEngine = getChatEngineFromEnv();
  if (envEngine === "nanobot") return "nanobot" as const;

  const teamNanobotConfig = (
    options.context as { nanobotConfig?: NanobotSettings }
  )?.nanobotConfig;
  if (teamNanobotConfig?.enabled) return "nanobot" as const;

  return "legacy" as const;
}

export async function runChatAgent(
  options: LegacyChatStreamOptions,
): Promise<ChatResponse> {
  const engine = resolveRequestedEngine(options);

  if (engine !== "nanobot") {
    return mainAgent.toUIMessageStream(options);
  }

  try {
    return await nanobotToUIMessageStream(options);
  } catch (error) {
    if (!shouldFallbackToLegacyOnNanobotError()) {
      throw error;
    }

    console.error(
      "[chat-engine] nanobot failed, falling back to legacy",
      error,
    );
    return mainAgent.toUIMessageStream(options);
  }
}
