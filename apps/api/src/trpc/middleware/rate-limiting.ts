import type { Session } from "@api/utils/auth";
import { TRPCError } from "@trpc/server";

// In-memory rate limit tracking
// TODO: Replace with Redis-based rate limiting for distributed deployment
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Rate limiting middleware - protects against abuse
// Uses in-memory store with sliding window (10 min, 1000 requests per user)
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
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const limit = 1000; // Increased for development

  const entry = rateLimitMap.get(userId);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
  } else if (entry.count >= limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Try again later.",
    });
  } else {
    entry.count++;
  }

  return next({ ctx });
};
