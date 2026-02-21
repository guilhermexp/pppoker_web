import {
  deleteCustomerSchema,
  getCustomerByIdSchema,
  getCustomersSchema,
  upsertCustomerSchema,
} from "@api/schemas/customers";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { logger } from "@midpoker/logger";

export const customersRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getCustomersSchema.optional())
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("customers")
        .select(`
          id,
          name,
          email,
          country,
          address_line_1,
          address_line_2,
          city,
          state,
          zip,
          phone,
          website,
          vat_number,
          country_code,
          contact,
          note,
          created_at
        `)
        .eq("team_id", teamId);

      // Apply search filter
      if (input?.q) {
        query = query.or(
          `name.ilike.%${input.q}%,email.ilike.%${input.q}%,contact.ilike.%${input.q}%`,
        );
      }

      query = query.order("name", { ascending: true });

      // Apply cursor-based pagination
      const pageSize = input?.pageSize ?? 50;
      const cursor = input?.cursor ? Number.parseInt(input.cursor, 10) : 0;
      // Fetch one extra to check if there's a next page
      query = query.range(cursor, cursor + pageSize);

      const { data: customers, error } = await query;

      if (error) {
        logger.error(
          { error: error.message },
          "customers.get Supabase REST error",
        );
        return {
          data: [],
          meta: {
            cursor: null,
            hasNextPage: false,
            hasPreviousPage: cursor > 0,
          },
        };
      }

      const allItems = customers ?? [];
      const hasNextPage = allItems.length > pageSize;
      const itemsToReturn = hasNextPage
        ? allItems.slice(0, pageSize)
        : allItems;
      const nextCursor = hasNextPage ? String(cursor + pageSize) : null;

      return {
        data: itemsToReturn.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          country: c.country,
          addressLine1: c.address_line_1,
          addressLine2: c.address_line_2,
          city: c.city,
          state: c.state,
          zip: c.zip,
          phone: c.phone,
          website: c.website,
          vatNumber: c.vat_number,
          countryCode: c.country_code,
          contact: c.contact,
          note: c.note,
          createdAt: c.created_at,
        })),
        meta: {
          cursor: nextCursor,
          hasNextPage,
          hasPreviousPage: cursor > 0,
        },
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  getById: protectedProcedure
    .input(getCustomerByIdSchema)
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data: customer, error } = await supabase
        .from("customers")
        .select(`
          id,
          name,
          email,
          country,
          address_line_1,
          address_line_2,
          city,
          state,
          zip,
          phone,
          website,
          vat_number,
          country_code,
          contact,
          note,
          created_at
        `)
        .eq("id", input.id)
        .eq("team_id", teamId)
        .single();

      if (error || !customer) {
        logger.error(
          { error: error?.message },
          "customers.getById Supabase REST error",
        );
        return null;
      }

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        country: customer.country,
        addressLine1: customer.address_line_1,
        addressLine2: customer.address_line_2,
        city: customer.city,
        state: customer.state,
        zip: customer.zip,
        phone: customer.phone,
        website: customer.website,
        vatNumber: customer.vat_number,
        countryCode: customer.country_code,
        contact: customer.contact,
        note: customer.note,
        createdAt: customer.created_at,
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  delete: protectedProcedure
    .input(deleteCustomerSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("customers")
        .delete()
        .eq("id", input.id)
        .eq("team_id", teamId)
        .select("id")
        .single();

      if (error) {
        logger.error(
          { error: error.message },
          "customers.delete Supabase REST error",
        );
        throw new Error(`Failed to delete customer: ${error.message}`);
      }

      return { id: data?.id };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  upsert: protectedProcedure
    .input(upsertCustomerSchema)
    .mutation(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      // Build upsert object (snake_case)
      const upsertData: Record<string, unknown> = {
        team_id: teamId,
        name: input.name,
        email: input.email,
      };

      if (input.id) upsertData.id = input.id;
      if (input.country !== undefined) upsertData.country = input.country;
      if (input.addressLine1 !== undefined)
        upsertData.address_line_1 = input.addressLine1;
      if (input.addressLine2 !== undefined)
        upsertData.address_line_2 = input.addressLine2;
      if (input.city !== undefined) upsertData.city = input.city;
      if (input.state !== undefined) upsertData.state = input.state;
      if (input.zip !== undefined) upsertData.zip = input.zip;
      if (input.phone !== undefined) upsertData.phone = input.phone;
      if (input.website !== undefined) upsertData.website = input.website;
      if (input.vatNumber !== undefined)
        upsertData.vat_number = input.vatNumber;
      if (input.countryCode !== undefined)
        upsertData.country_code = input.countryCode;
      if (input.contact !== undefined) upsertData.contact = input.contact;
      if (input.note !== undefined) upsertData.note = input.note;

      const { data: customer, error } = await supabase
        .from("customers")
        .upsert(upsertData, { onConflict: "id" })
        .select(
          "id, name, email, country, address_line_1, address_line_2, city, state, zip, phone, website, vat_number, country_code, contact, note, created_at",
        )
        .single();

      if (error) {
        logger.error(
          { error: error.message },
          "customers.upsert Supabase REST error",
        );
        throw new Error(`Failed to upsert customer: ${error.message}`);
      }

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        country: customer.country,
        addressLine1: customer.address_line_1,
        addressLine2: customer.address_line_2,
        city: customer.city,
        state: customer.state,
        zip: customer.zip,
        phone: customer.phone,
        website: customer.website,
        vatNumber: customer.vat_number,
        countryCode: customer.country_code,
        contact: customer.contact,
        note: customer.note,
        createdAt: customer.created_at,
      };
    }),
});
