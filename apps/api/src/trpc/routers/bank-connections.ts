import {
  createBankConnectionSchema,
  deleteBankConnectionSchema,
  getBankConnectionsSchema,
} from "@api/schemas/bank-connections";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

export const bankConnectionsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getBankConnectionsSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("bank_connections")
        .select(`
          id,
          created_at,
          team_id,
          institution_id,
          name,
          logo_url,
          provider,
          expires_at,
          enrollment_id,
          reference_id,
          status,
          error_details,
          last_accessed,
          error_retries,
          access_token
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (input?.enabled !== undefined) {
        query = query.eq("status", input.enabled ? "connected" : "disconnected");
      }

      const { data: connections, error } = await query;

      if (error) {
        console.log("[bankConnections.get] Supabase REST error:", error.message);
        return [];
      }

      // Transform snake_case to camelCase
      return (connections ?? []).map((conn: any) => ({
        id: conn.id,
        createdAt: conn.created_at,
        teamId: conn.team_id,
        institutionId: conn.institution_id,
        name: conn.name,
        logoUrl: conn.logo_url,
        provider: conn.provider,
        expiresAt: conn.expires_at,
        enrollmentId: conn.enrollment_id,
        referenceId: conn.reference_id,
        status: conn.status,
        errorDetails: conn.error_details,
        lastAccessed: conn.last_accessed,
        errorRetries: conn.error_retries,
        accessToken: conn.access_token,
      }));
    }),

  // Use Supabase REST directly
  create: protectedProcedure
    .input(createBankConnectionSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("bank_connections")
        .insert({
          team_id: teamId,
          institution_id: input.institutionId,
          name: input.name,
          logo_url: input.logoUrl,
          provider: input.provider,
          enrollment_id: input.enrollmentId,
          reference_id: input.referenceId,
          access_token: input.accessToken,
          status: "connected",
        })
        .select()
        .single();

      if (error) {
        console.log("[bankConnections.create] Supabase REST error:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create bank connection: ${error.message}`,
        });
      }

      return {
        id: data.id,
        createdAt: data.created_at,
        teamId: data.team_id,
        institutionId: data.institution_id,
        name: data.name,
        logoUrl: data.logo_url,
        provider: data.provider,
        status: data.status,
      };
    }),

  // Use Supabase REST directly
  delete: protectedProcedure
    .input(deleteBankConnectionSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("bank_connections")
        .delete()
        .eq("id", input.id)
        .eq("team_id", teamId);

      if (error) {
        console.log("[bankConnections.delete] Supabase REST error:", error.message);
        throw new Error(`Failed to delete bank connection: ${error.message}`);
      }

      return { success: true };
    }),
});
