import {
  createBankAccountSchema,
  deleteBankAccountSchema,
  getBankAccountsSchema,
  updateBankAccountSchema,
} from "@api/schemas/bank-accounts";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { logger } from "@midpoker/logger";
import { nanoid } from "nanoid";

export const bankAccountsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getBankAccountsSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("bank_accounts")
        .select(`
          id,
          created_at,
          created_by,
          team_id,
          name,
          currency,
          bank_connection_id,
          enabled,
          account_id,
          balance,
          manual,
          type,
          base_currency,
          base_balance,
          error_details,
          error_retries,
          account_reference
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (input?.enabled !== undefined) {
        query = query.eq("enabled", input.enabled);
      }
      if (input?.manual !== undefined) {
        query = query.eq("manual", input.manual);
      }

      const { data: accounts, error } = await query;

      if (error) {
        logger.error(
          { error: error.message },
          "bankAccounts.get Supabase REST error",
        );
        return [];
      }

      // Transform snake_case to camelCase
      return (accounts ?? []).map((acc: any) => ({
        id: acc.id,
        createdAt: acc.created_at,
        createdBy: acc.created_by,
        teamId: acc.team_id,
        name: acc.name,
        currency: acc.currency,
        bankConnectionId: acc.bank_connection_id,
        enabled: acc.enabled,
        accountId: acc.account_id,
        balance: acc.balance,
        manual: acc.manual,
        type: acc.type,
        baseCurrency: acc.base_currency,
        baseBalance: acc.base_balance,
        errorDetails: acc.error_details,
        errorRetries: acc.error_retries,
        accountReference: acc.account_reference,
      }));
    }),

  // Use Supabase REST directly
  currencies: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("bank_accounts")
      .select("currency")
      .eq("team_id", teamId)
      .eq("enabled", true);

    if (error) {
      logger.error(
        { error: error.message },
        "bankAccounts.currencies Supabase REST error",
      );
      return [];
    }

    // Get unique currencies
    const currencies = [
      ...new Set((data ?? []).map((d: any) => d.currency).filter(Boolean)),
    ];
    return currencies;
  }),

  // Use Supabase REST directly
  balances: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("bank_accounts")
      .select("id, name, currency, balance, base_currency, base_balance")
      .eq("team_id", teamId)
      .eq("enabled", true);

    if (error) {
      logger.error(
        { error: error.message },
        "bankAccounts.balances Supabase REST error",
      );
      return [];
    }

    return (data ?? []).map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      balance: acc.balance,
      baseCurrency: acc.base_currency,
      baseBalance: acc.base_balance,
    }));
  }),

  // Use Supabase REST directly
  delete: protectedProcedure
    .input(deleteBankAccountSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", input.id)
        .eq("team_id", teamId);

      if (error) {
        logger.error(
          { error: error.message },
          "bankAccounts.delete Supabase REST error",
        );
        throw new Error(`Failed to delete bank account: ${error.message}`);
      }

      return { success: true };
    }),

  // Use Supabase REST directly
  update: protectedProcedure
    .input(updateBankAccountSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.balance !== undefined) updateData.balance = input.balance;
      if (input.type !== undefined) updateData.type = input.type;

      const { data, error } = await supabase
        .from("bank_accounts")
        .update(updateData)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select()
        .single();

      if (error) {
        logger.error(
          { error: error.message },
          "bankAccounts.update Supabase REST error",
        );
        throw new Error(`Failed to update bank account: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        enabled: data.enabled,
        balance: data.balance,
        type: data.type,
      };
    }),

  // Use Supabase REST directly
  create: protectedProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("bank_accounts")
        .insert({
          team_id: teamId,
          created_by: session.user.id,
          name: input.name,
          currency: input.currency,
          account_id: nanoid(),
          manual: input.manual ?? true,
          enabled: true,
          balance: 0,
        })
        .select()
        .single();

      if (error) {
        logger.error(
          { error: error.message },
          "bankAccounts.create Supabase REST error",
        );
        throw new Error(`Failed to create bank account: ${error.message}`);
      }

      return {
        id: data.id,
        createdAt: data.created_at,
        createdBy: data.created_by,
        teamId: data.team_id,
        name: data.name,
        currency: data.currency,
        accountId: data.account_id,
        manual: data.manual,
        enabled: data.enabled,
        balance: data.balance,
      };
    }),
});
