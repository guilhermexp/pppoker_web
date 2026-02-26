import { RedisProvider } from "@ai-sdk-tools/memory/redis";
import type { ChatUserContext } from "@midpoker/cache/chat-cache";
import { getSharedRedisClient } from "@midpoker/cache/shared-redis";

export interface AppContext {
  userId: string;
  fullName: string;
  companyName: string;
  baseCurrency: string;
  locale: string;
  currentDateTime: string;
  country?: string;
  city?: string;
  region?: string;
  timezone: string;
  chatId: string;
  fiscalYearStartMonth?: number | null;
  hasBankAccounts?: boolean;
  // Allow additional properties to satisfy Record<string, unknown> constraint
  [key: string]: unknown;
}

export function buildAppContext(
  context: ChatUserContext,
  chatId: string,
): AppContext {
  // Combine userId and teamId to scope chats by both user and team
  const scopedUserId = `${context.userId}:${context.teamId}`;

  return {
    userId: scopedUserId,
    fullName: context.fullName ?? "",
    companyName: context.teamName ?? "",
    country: context.country ?? undefined,
    city: context.city ?? undefined,
    region: context.region ?? undefined,
    chatId,
    baseCurrency: context.baseCurrency ?? "USD",
    locale: context.locale ?? "en-US",
    currentDateTime: new Date().toISOString(),
    timezone:
      context.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    teamId: context.teamId,
    fiscalYearStartMonth: context.fiscalYearStartMonth ?? undefined,
    hasBankAccounts: context.hasBankAccounts ?? false,
  };
}

export const memoryProvider = new RedisProvider(getSharedRedisClient());
