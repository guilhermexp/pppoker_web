import {
  connectInboxAccountSchema,
  deleteInboxAccountSchema,
  exchangeCodeForAccountSchema,
  syncInboxAccountSchema,
} from "@api/schemas/inbox-accounts";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { deleteInboxAccount } from "@midpoker/db/queries";
import { InboxConnector } from "@midpoker/inbox/connector";
import { logger } from "@midpoker/logger";
import { schedules, tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";

export const inboxAccountsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data: accounts, error } = await supabase
      .from("inbox_accounts")
      .select(`
        id,
        email,
        provider,
        schedule_id,
        last_sync_at,
        created_at
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(
        { error: error.message },
        "inboxAccounts.get Supabase REST error",
      );
      return [];
    }

    return (accounts ?? []).map((acc: any) => ({
      id: acc.id,
      email: acc.email,
      provider: acc.provider,
      scheduleId: acc.schedule_id,
      lastSyncAt: acc.last_sync_at,
      createdAt: acc.created_at,
    }));
  }),

  connect: protectedProcedure
    .input(connectInboxAccountSchema)
    .mutation(async ({ ctx: { db }, input }) => {
      try {
        const connector = new InboxConnector(input.provider, db);

        return connector.connect();
      } catch (error) {
        logger.error({ error }, "Failed to connect to inbox account");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to inbox account",
        });
      }
    }),

  exchangeCodeForAccount: protectedProcedure
    .input(exchangeCodeForAccountSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      try {
        const connector = new InboxConnector(input.provider, db);

        const account = await connector.exchangeCodeForAccount({
          code: input.code,
          teamId: teamId!,
        });

        return account;
      } catch (error) {
        logger.error({ error }, "Failed to exchange code for account");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exchange code for account",
        });
      }
    }),

  delete: protectedProcedure
    .input(deleteInboxAccountSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      const data = await deleteInboxAccount(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (data?.scheduleId) {
        await schedules.del(data.scheduleId);
      }

      return data;
    }),

  sync: protectedProcedure
    .input(syncInboxAccountSchema)
    .mutation(async ({ input }) => {
      const event = await tasks.trigger("sync-inbox-account", {
        id: input.id,
        manualSync: input.manualSync || false,
      });

      return event;
    }),
});
