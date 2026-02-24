import type { Database } from "@db/client";
import {
  type ChatUserContext,
  chatCache,
} from "@midpoker/cache/chat-cache";
import { logger } from "@midpoker/logger";

interface GetUserContextParams {
  db: Database;
  userId: string;
  teamId: string;
  country?: string;
  city?: string;
  timezone?: string;
}

/**
 * Gets user context for chat operations, with caching support.
 *
 * Note: bank_accounts / bank_connections tables do not exist in the poker
 * project schema (legacy from Midday fintech template). hasBankAccounts is
 * always false.
 */
export async function getUserContext({
  db,
  userId,
  teamId,
  country,
  city,
  timezone,
}: GetUserContextParams): Promise<ChatUserContext> {
  // Try to get cached context first
  const cached = await chatCache.getUserContext(userId, teamId);
  if (cached) {
    return { ...cached, hasBankAccounts: false };
  }

  // Build context with poker-project defaults (no bank_accounts query needed)
  const context: ChatUserContext = {
    userId,
    teamId,
    teamName: "Xperience Poker",
    fullName: "User",
    baseCurrency: "USD",
    locale: "pt-BR",
    dateFormat: "DD/MM/YYYY",
    country,
    city,
    timezone,
    hasBankAccounts: false,
  };

  // Cache for future requests (non-blocking)
  chatCache.setUserContext(userId, teamId, context).catch((err) => {
    logger.warn({
      msg: "Failed to cache user context",
      userId,
      teamId,
      error: err.message,
    });
  });

  return context;
}
