import type { Session } from "@api/utils/auth";
import { rateLimitCache } from "@midpoker/cache/rate-limit-cache";
import { TRPCError } from "@trpc/server";

// Rate limiting middleware - protects against abuse
// Uses Redis-backed store with fixed window (10 min, 1000 requests per user)
export const withRateLimiting = async <TReturn>(opts: {
  ctx: {
    session?: Session | null;
  };
  next: (opts: {
    ctx: {
      session?: Session | null;
    };
  }) => Promise<TReturn>;
}) => {
  const { ctx, next } = opts;

  const userId = ctx.session?.user?.id ?? "anonymous";

  // Check rate limit using Redis
  const result = await rateLimitCache.checkAndIncrement(userId);

  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Try again later.",
    });
  }

  return next({ ctx });
};
