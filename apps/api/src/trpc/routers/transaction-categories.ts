import {
  createTransactionCategorySchema,
  deleteTransactionCategorySchema,
  getCategoriesSchema,
  getCategoryByIdSchema,
  updateTransactionCategorySchema,
} from "@api/schemas/transaction-categories";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";

export const transactionCategoriesRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getCategoriesSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("transaction_categories")
        .select(`
          id,
          name,
          slug,
          color,
          description,
          system,
          vat,
          team_id,
          created_at
        `)
        .or(`team_id.eq.${teamId},team_id.is.null`)
        .order("name", { ascending: true });

      if (input?.limit) {
        query = query.limit(input.limit);
      }

      const { data: categories, error } = await query;

      if (error) {
        console.log(
          "[transactionCategories.get] Supabase REST error:",
          error.message,
        );
        return [];
      }

      // Transform snake_case to camelCase
      return (categories ?? []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        description: cat.description,
        system: cat.system,
        vat: cat.vat,
        teamId: cat.team_id,
        createdAt: cat.created_at,
      }));
    }),

  // Use Supabase REST directly
  getById: protectedProcedure
    .input(getCategoryByIdSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("transaction_categories")
        .select(`
          id,
          name,
          slug,
          color,
          description,
          system,
          vat,
          team_id,
          created_at
        `)
        .eq("id", input.id)
        .or(`team_id.eq.${teamId},team_id.is.null`)
        .single();

      if (error) {
        console.log(
          "[transactionCategories.getById] Supabase REST error:",
          error.message,
        );
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        color: data.color,
        description: data.description,
        system: data.system,
        vat: data.vat,
        teamId: data.team_id,
        createdAt: data.created_at,
      };
    }),

  // Use Supabase REST directly
  create: protectedProcedure
    .input(createTransactionCategorySchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Generate slug from name
      const slug = input.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const { data, error } = await supabase
        .from("transaction_categories")
        .insert({
          team_id: teamId,
          name: input.name,
          slug: slug,
          color: input.color ?? "#808080",
          description: input.description,
          vat: input.vat,
          system: false,
        })
        .select()
        .single();

      if (error) {
        console.log(
          "[transactionCategories.create] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to create category: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        color: data.color,
        description: data.description,
        system: data.system,
        vat: data.vat,
        teamId: data.team_id,
        createdAt: data.created_at,
      };
    }),

  // Use Supabase REST directly
  update: protectedProcedure
    .input(updateTransactionCategorySchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) {
        updateData.name = input.name;
        updateData.slug = input.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      }
      if (input.color !== undefined) updateData.color = input.color;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.vat !== undefined) updateData.vat = input.vat;

      const { data, error } = await supabase
        .from("transaction_categories")
        .update(updateData)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select()
        .single();

      if (error) {
        console.log(
          "[transactionCategories.update] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to update category: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        color: data.color,
        description: data.description,
        vat: data.vat,
      };
    }),

  // Use Supabase REST directly
  delete: protectedProcedure
    .input(deleteTransactionCategorySchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("transaction_categories")
        .delete()
        .eq("id", input.id)
        .eq("team_id", teamId);

      if (error) {
        console.log(
          "[transactionCategories.delete] Supabase REST error:",
          error.message,
        );
        throw new Error(`Failed to delete category: ${error.message}`);
      }

      return { success: true };
    }),
});
