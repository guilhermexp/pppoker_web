import { createClient } from "@api/services/supabase";
import { verifyAccessToken } from "@api/utils/auth";
import type { Session } from "@api/utils/auth";
import { getGeoContext } from "@api/utils/geo";
import type { Database } from "@midpoker/db/client";
import { db } from "@midpoker/db/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "hono";
import superjson from "superjson";
import { withPrimaryReadAfterWrite } from "./middleware/primary-read-after-write";
import { withTeamPermission } from "./middleware/team-permission";

type TRPCContext = {
  session: Session | null;
  supabase: SupabaseClient;
  db: Database;
  geo: ReturnType<typeof getGeoContext>;
  teamId?: string;
};

export const createTRPCContext = async (
  _: unknown,
  c: Context,
): Promise<TRPCContext> => {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const session = await verifyAccessToken(accessToken);
  const supabase = await createClient(accessToken);

  // Use the singleton database instance - no need for caching
  const geo = getGeoContext(c.req);

  return {
    session,
    supabase,
    db,
    geo,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

const withPrimaryDbMiddleware = t.middleware(async (opts) => {
  return withPrimaryReadAfterWrite({
    ctx: opts.ctx,
    type: opts.type,
    next: opts.next,
  });
});

const withTeamPermissionMiddleware = t.middleware(async (opts) => {
  return withTeamPermission({
    ctx: opts.ctx,
    next: opts.next,
  });
});

// Rate limiting middleware - protects against abuse
// Uses in-memory store with sliding window (10 min, 100 requests per user)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const withRateLimiting = t.middleware(async (opts) => {
  const userId = opts.ctx.session?.user?.id ?? "anonymous";
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

  return opts.next();
});

export const publicProcedure = t.procedure.use(withPrimaryDbMiddleware);

// Procedure that only requires authentication but not team membership
// Used for endpoints that need to work for new users without a team
export const authProcedure = t.procedure
  .use(withRateLimiting)
  .use(withPrimaryDbMiddleware)
  .use(async (opts) => {
    const { session } = opts.ctx;

    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Auth required (authProcedure)",
      });
    }

    return opts.next({
      ctx: {
        session,
      },
    });
  });

export const protectedProcedure = t.procedure
  .use(withRateLimiting)
  .use(withTeamPermissionMiddleware) // NOTE: This is needed to ensure that the teamId is set in the context
  .use(withPrimaryDbMiddleware)
  .use(async (opts) => {
    const { teamId, session } = opts.ctx;

    if (!session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return opts.next({
      ctx: {
        teamId,
        session,
      },
    });
  });
