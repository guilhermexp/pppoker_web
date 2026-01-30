import {
  createInvoiceProductSchema,
  deleteInvoiceProductSchema,
  getInvoiceProductSchema,
  getInvoiceProductsSchema,
  saveLineItemAsProductSchema,
  updateInvoiceProductSchema,
  upsertInvoiceProductSchema,
} from "@api/schemas/invoice";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

export const invoiceProductsRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getInvoiceProductsSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      const {
        sortBy = "popular",
        limit = 50,
        includeInactive = false,
        currency,
      } = input || {};

      let query = supabase
        .from("invoice_products")
        .select(`
          id,
          name,
          description,
          price,
          currency,
          unit,
          is_active,
          usage_count,
          last_used_at,
          created_at,
          updated_at
        `)
        .eq("team_id", teamId);

      // Apply filters
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      if (currency) {
        query = query.eq("currency", currency);
      }

      // Apply sorting
      if (sortBy === "popular") {
        query = query.order("usage_count", { ascending: false });
      } else if (sortBy === "recent") {
        query = query.order("last_used_at", {
          ascending: false,
          nullsFirst: false,
        });
      } else {
        query = query.order("name", { ascending: true });
      }

      query = query.limit(limit);

      const { data: products, error } = await query;

      if (error) {
        console.log(
          "[invoiceProducts.get] Supabase REST error:",
          error.message,
        );
        return [];
      }

      return (products ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        unit: p.unit,
        isActive: p.is_active,
        usageCount: p.usage_count,
        lastUsedAt: p.last_used_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getById: protectedProcedure
    .input(getInvoiceProductSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data: product, error } = await supabase
        .from("invoice_products")
        .select(`
          id,
          name,
          description,
          price,
          currency,
          unit,
          is_active,
          usage_count,
          last_used_at,
          created_at,
          updated_at
        `)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        console.log(
          "[invoiceProducts.getById] Supabase REST error:",
          error.message,
        );
        return null;
      }

      return product
        ? {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            unit: product.unit,
            isActive: product.is_active,
            usageCount: product.usage_count,
            lastUsedAt: product.last_used_at,
            createdAt: product.created_at,
            updatedAt: product.updated_at,
          }
        : null;
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  create: protectedProcedure
    .input(createInvoiceProductSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      const { data: product, error } = await supabase
        .from("invoice_products")
        .insert({
          team_id: teamId,
          name: input.name,
          description: input.description ?? null,
          price: input.price ?? null,
          currency: input.currency ?? null,
          unit: input.unit ?? null,
          is_active: true,
          usage_count: 0,
          created_by: session.user.id,
        })
        .select(
          "id, name, description, price, currency, unit, is_active, usage_count, created_at",
        )
        .single();

      if (error) {
        console.log(
          "[invoiceProducts.create] Supabase REST error:",
          error.message,
        );
        throw new TRPCError({
          code: error.code === "23505" ? "CONFLICT" : "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        unit: product.unit,
        isActive: product.is_active,
        usageCount: product.usage_count,
        createdAt: product.created_at,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  upsert: protectedProcedure
    .input(upsertInvoiceProductSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      const upsertData: Record<string, unknown> = {
        team_id: teamId,
        name: input.name,
        created_by: session.user.id,
      };

      if (input.id) upsertData.id = input.id;
      if (input.description !== undefined)
        upsertData.description = input.description;
      if (input.price !== undefined) upsertData.price = input.price;
      if (input.currency !== undefined) upsertData.currency = input.currency;
      if (input.unit !== undefined) upsertData.unit = input.unit;

      const { data: product, error } = await supabase
        .from("invoice_products")
        .upsert(upsertData, { onConflict: "id" })
        .select(
          "id, name, description, price, currency, unit, is_active, usage_count, created_at",
        )
        .single();

      if (error) {
        console.log(
          "[invoiceProducts.upsert] Supabase REST error:",
          error.message,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        unit: product.unit,
        isActive: product.is_active,
        usageCount: product.usage_count,
        createdAt: product.created_at,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  updateProduct: protectedProcedure
    .input(updateInvoiceProductSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.unit !== undefined) updateData.unit = input.unit;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data: product, error } = await supabase
        .from("invoice_products")
        .update(updateData)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select(
          "id, name, description, price, currency, unit, is_active, usage_count, created_at",
        )
        .single();

      if (error) {
        console.log(
          "[invoiceProducts.updateProduct] Supabase REST error:",
          error.message,
        );
        throw new TRPCError({
          code: error.code === "23505" ? "CONFLICT" : "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        unit: product.unit,
        isActive: product.is_active,
        usageCount: product.usage_count,
        createdAt: product.created_at,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  delete: protectedProcedure
    .input(deleteInvoiceProductSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("invoice_products")
        .delete()
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select("id")
        .single();

      if (error) {
        console.log(
          "[invoiceProducts.delete] Supabase REST error:",
          error.message,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { id: data?.id };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  incrementUsage: protectedProcedure
    .input(getInvoiceProductSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // First get current usage count
      const { data: current } = await supabase
        .from("invoice_products")
        .select("usage_count")
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      const newCount = (current?.usage_count ?? 0) + 1;

      const { error } = await supabase
        .from("invoice_products")
        .update({
          usage_count: newCount,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("team_id", teamId);

      if (error) {
        console.log(
          "[invoiceProducts.incrementUsage] Supabase REST error:",
          error.message,
        );
      }

      return { success: true };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  saveLineItemAsProduct: protectedProcedure
    .input(saveLineItemAsProductSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();

      // If name is empty, signal to clear productId (don't save anything)
      if (!input.name || input.name.trim().length === 0) {
        return { product: null, shouldClearProductId: true };
      }

      const trimmedName = input.name.trim();

      try {
        // If line item has a productId, update the existing product
        if (input.productId) {
          const { data: existingProduct } = await supabase
            .from("invoice_products")
            .select("id, name, price, currency, unit")
            .eq("id", input.productId)
            .eq("team_id", teamId)
            .single();

          if (existingProduct) {
            // Update the existing product with new values
            const { data: updatedProduct, error: updateError } = await supabase
              .from("invoice_products")
              .update({
                name: trimmedName,
                price:
                  input.price !== undefined
                    ? input.price
                    : existingProduct.price,
                currency: input.currency || existingProduct.currency,
                unit:
                  input.unit !== undefined ? input.unit : existingProduct.unit,
                last_used_at: new Date().toISOString(),
              })
              .eq("id", input.productId)
              .eq("team_id", teamId)
              .select(
                "id, name, description, price, currency, unit, is_active, usage_count, created_at",
              )
              .single();

            if (updateError) {
              console.log(
                "[invoiceProducts.saveLineItemAsProduct] Update error:",
                updateError.message,
              );
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: updateError.message,
              });
            }

            return {
              product: updatedProduct
                ? {
                    id: updatedProduct.id,
                    name: updatedProduct.name,
                    description: updatedProduct.description,
                    price: updatedProduct.price,
                    currency: updatedProduct.currency,
                    unit: updatedProduct.unit,
                    isActive: updatedProduct.is_active,
                    usageCount: updatedProduct.usage_count,
                    createdAt: updatedProduct.created_at,
                  }
                : null,
              shouldClearProductId: false,
            };
          }
        }

        // No productId or product not found - create new product
        const { data: newProduct, error: insertError } = await supabase
          .from("invoice_products")
          .upsert(
            {
              team_id: teamId,
              created_by: session.user.id,
              name: trimmedName,
              description: null,
              price: input.price !== undefined ? input.price : null,
              currency: input.currency || null,
              unit: input.unit !== undefined ? input.unit : null,
              is_active: true,
              usage_count: 0,
            },
            { onConflict: "team_id,name" },
          )
          .select(
            "id, name, description, price, currency, unit, is_active, usage_count, created_at",
          )
          .single();

        if (insertError) {
          console.log(
            "[invoiceProducts.saveLineItemAsProduct] Insert error:",
            insertError.message,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: insertError.message,
          });
        }

        return {
          product: newProduct
            ? {
                id: newProduct.id,
                name: newProduct.name,
                description: newProduct.description,
                price: newProduct.price,
                currency: newProduct.currency,
                unit: newProduct.unit,
                isActive: newProduct.is_active,
                usageCount: newProduct.usage_count,
                createdAt: newProduct.created_at,
              }
            : null,
          shouldClearProductId: false,
        };
      } catch (error) {
        console.error(
          `[invoiceProducts.saveLineItemAsProduct] Failed to save "${trimmedName}":`,
          error,
        );
        throw error;
      }
    }),
});
