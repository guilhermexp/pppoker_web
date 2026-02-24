import type { Database } from "@db/client";
import {
  type ChatTeamContext,
  type ChatUserContext,
  chatCache,
} from "@midpoker/cache/chat-cache";
import {
  getBankAccounts,
  getTeamById,
  getUserById,
} from "@midpoker/db/queries";
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
 * Gets user context for chat operations, with caching support
 * Fetches team and user data if not cached, then caches the result
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

  // Get team context (cached separately)
  let teamContext = await chatCache.getTeamContext(teamId);

  // If team context not cached, fetch bank account status
  if (!teamContext) {
    let hasBankAccounts = false;
    try {
      const bankAccounts = await getBankAccounts(db, {
        teamId,
        enabled: true,
      });
      hasBankAccounts = bankAccounts.length > 0;
    } catch (error) {
      logger.warn({
        msg: "Failed to load bank account context, continuing with fallback",
        teamId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    teamContext = {
      teamId,
      hasBankAccounts,
    };

    // Cache team context (non-blocking)
    chatCache.setTeamContext(teamId, teamContext).catch((err) => {
      logger.warn({
        msg: "Failed to cache team context",
        teamId,
        error: err.message,
      });
    });
  }

  // If user context is cached, merge team context and return
  if (cached) {
    return {
      ...cached,
      hasBankAccounts: teamContext.hasBankAccounts,
    };
  }

  // If not cached, fetch team and user data in parallel.
  // If DB is unavailable, continue with a degraded context so chat does not break.
  let team:
    | Awaited<ReturnType<typeof getTeamById>>
    | null
    | undefined;
  let user:
    | Awaited<ReturnType<typeof getUserById>>
    | null
    | undefined;

  try {
    [team, user] = await Promise.all([
      getTeamById(db, teamId),
      getUserById(db, userId),
    ]);
  } catch (error) {
    logger.warn({
      msg: "Failed to load full user context, using fallback",
      userId,
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!team || !user) {
    const fallbackContext: ChatUserContext = {
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
      hasBankAccounts: teamContext.hasBankAccounts,
    };

    chatCache.setUserContext(userId, teamId, fallbackContext).catch((err) => {
      logger.warn({
        msg: "Failed to cache fallback user context",
        userId,
        teamId,
        error: err.message,
      });
    });

    return fallbackContext;
  }

  const context: ChatUserContext = {
    userId,
    teamId,
    teamName: team.name,
    fullName: user.fullName,
    fiscalYearStartMonth: team.fiscalYearStartMonth,
    baseCurrency: team.baseCurrency,
    locale: user.locale ?? "en-US",
    dateFormat: user.dateFormat,
    country,
    city,
    timezone,
    hasBankAccounts: teamContext.hasBankAccounts,
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
