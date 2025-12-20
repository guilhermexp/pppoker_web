import {
  globalSearchSchema,
  searchAttachmentsSchema,
} from "@api/schemas/search";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";

export const searchRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  global: protectedProcedure
    .input(globalSearchSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const { searchTerm, limit = 10 } = input;

      // Use Supabase REST for simple search
      const supabase = await createAdminClient();

      // Search transactions by name
      const { data: transactions } = await supabase
        .from("transactions")
        .select("id, name, amount, currency, date, category_slug")
        .eq("team_id", teamId)
        .ilike("name", `%${searchTerm ?? ""}%`)
        .limit(limit);

      // Search customers by name
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, email, website")
        .eq("team_id", teamId)
        .ilike("name", `%${searchTerm ?? ""}%`)
        .limit(limit);

      // Search invoices by invoice_number
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, status, customer_name")
        .eq("team_id", teamId)
        .or(`invoice_number.ilike.%${searchTerm ?? ""}%,customer_name.ilike.%${searchTerm ?? ""}%`)
        .limit(limit);

      return {
        transactions: transactions?.map(t => ({
          id: t.id,
          name: t.name,
          amount: t.amount,
          currency: t.currency,
          date: t.date,
          categorySlug: t.category_slug,
          type: "transaction" as const,
        })) ?? [],
        customers: customers?.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          website: c.website,
          type: "customer" as const,
        })) ?? [],
        invoices: invoices?.map(i => ({
          id: i.id,
          invoiceNumber: i.invoice_number,
          amount: i.amount,
          currency: i.currency,
          status: i.status,
          customerName: i.customer_name,
          type: "invoice" as const,
        })) ?? [],
      };
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  attachments: protectedProcedure
    .input(searchAttachmentsSchema)
    .query(async ({ input, ctx: { teamId } }) => {
      const { q, transactionId, limit = 30 } = input;
      const supabase = await createAdminClient();

      // Search inbox items
      let inboxQuery = supabase
        .from("inbox")
        .select("id, file_name, file_path, display_name, amount, currency, content_type, date, size, description, status, website, base_amount, base_currency, tax_amount, tax_rate, tax_type, created_at")
        .eq("team_id", teamId)
        .limit(limit);

      if (q) {
        inboxQuery = inboxQuery.or(`file_name.ilike.%${q}%,display_name.ilike.%${q}%,description.ilike.%${q}%`);
      }
      if (transactionId) {
        inboxQuery = inboxQuery.eq("transaction_id", transactionId);
      }

      // Search invoices
      let invoiceQuery = supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, amount, currency, file_path, due_date, status, file_size, created_at")
        .eq("team_id", teamId)
        .in("status", ["unpaid", "overdue", "paid"])
        .limit(limit);

      if (q) {
        invoiceQuery = invoiceQuery.or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%`);
      }

      const [inboxRes, invoiceRes] = await Promise.all([
        inboxQuery,
        invoiceQuery,
      ]);

      // Transform inbox results
      const inboxItems = (inboxRes.data ?? []).map((item) => ({
        type: "inbox" as const,
        id: item.id,
        fileName: item.file_name ?? null,
        filePath: item.file_path ?? [],
        displayName: item.display_name ?? null,
        amount: item.amount ?? null,
        currency: item.currency ?? null,
        contentType: item.content_type ?? null,
        date: item.date ?? null,
        size: item.size ?? null,
        description: item.description ?? null,
        status: item.status ?? null,
        website: item.website ?? null,
        baseAmount: item.base_amount ?? null,
        baseCurrency: item.base_currency ?? null,
        taxAmount: item.tax_amount ?? null,
        taxRate: item.tax_rate ?? null,
        taxType: item.tax_type ?? null,
        createdAt: item.created_at,
      }));

      // Transform invoice results
      const invoices = (invoiceRes.data ?? []).map((invoice) => ({
        type: "invoice" as const,
        id: invoice.id,
        invoiceNumber: invoice.invoice_number ?? null,
        customerName: invoice.customer_name ?? null,
        amount: invoice.amount ?? null,
        currency: invoice.currency ?? null,
        filePath: invoice.file_path ?? [],
        dueDate: invoice.due_date ?? null,
        status: invoice.status,
        size: invoice.file_size ?? null,
        createdAt: invoice.created_at,
      }));

      // Combine and return results
      return [...inboxItems, ...invoices];
    }),
});
