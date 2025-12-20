import {
  cancelScheduledInvoiceSchema,
  createInvoiceSchema,
  deleteInvoiceSchema,
  draftInvoiceSchema,
  duplicateInvoiceSchema,
  getInvoiceByIdSchema,
  getInvoiceByTokenSchema,
  getInvoicesSchema,
  invoiceSummarySchema,
  remindInvoiceSchema,
  searchInvoiceNumberSchema,
  updateInvoiceSchema,
  updateScheduledInvoiceSchema,
} from "@api/schemas/invoice";
import { createAdminClient } from "@api/services/supabase";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@api/trpc/init";
import { parseInputValue } from "@api/utils/parse";
import { UTCDate } from "@date-fns/utc";
import {
  deleteInvoice,
  draftInvoice,
  duplicateInvoice,
  getCustomerById,
  getInvoiceById,
  getInvoiceTemplate,
  getNextInvoiceNumber,
  getPaymentStatus,
  getTeamById,
  getTrackerProjectById,
  getTrackerRecordsByRange,
  getUserById,
  searchInvoiceNumber,
  updateInvoice,
} from "@midday/db/queries";
import { verify } from "@midday/invoice/token";
import { transformCustomerToContent } from "@midday/invoice/utils";
import type {
  GenerateInvoicePayload,
  SendInvoiceReminderPayload,
} from "@midday/jobs/schema";
import { runs, tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";
import { addMonths, format, parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const defaultTemplate = {
  title: "Invoice",
  customerLabel: "To",
  fromLabel: "From",
  invoiceNoLabel: "Invoice No",
  issueDateLabel: "Issue Date",
  dueDateLabel: "Due Date",
  descriptionLabel: "Description",
  priceLabel: "Price",
  quantityLabel: "Quantity",
  totalLabel: "Total",
  totalSummaryLabel: "Total",
  subtotalLabel: "Subtotal",
  vatLabel: "VAT",
  taxLabel: "Tax",
  paymentLabel: "Payment Details",
  paymentDetails: undefined,
  noteLabel: "Note",
  noteDetails: undefined,
  logoUrl: undefined,
  currency: "USD",
  fromDetails: undefined,
  size: "a4",
  includeVat: true,
  includeTax: true,
  discountLabel: "Discount",
  includeDiscount: false,
  includeUnits: false,
  includeDecimals: false,
  includePdf: false,
  sendCopy: false,
  includeQr: true,
  dateFormat: "dd/MM/yyyy",
  taxRate: 0,
  vatRate: 0,
  deliveryType: "create",
  timezone: undefined,
  locale: undefined,
};

export const invoiceRouter = createTRPCRouter({
  // Use Supabase REST directly to avoid Drizzle connection pool issues
  get: protectedProcedure
    .input(getInvoicesSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          amount,
          currency,
          issue_date,
          due_date,
          paid_at,
          customer_id,
          customer_name,
          file_path,
          sent_to,
          viewed_at,
          reminder_sent_at,
          created_at,
          updated_at
        `)
        .eq("team_id", teamId);

      // Apply search filter
      if (input?.q) {
        query = query.or(`invoice_number.ilike.%${input.q}%,customer_name.ilike.%${input.q}%`);
      }

      // Apply date range filter
      if (input?.start) {
        query = query.gte("issue_date", input.start);
      }
      if (input?.end) {
        query = query.lte("issue_date", input.end);
      }

      // Apply status filter (exclude 'scheduled' if not in DB)
      if (input?.statuses?.length) {
        const validStatuses = input.statuses.filter(s => s !== "scheduled");
        if (validStatuses.length) {
          query = query.in("status", validStatuses);
        }
      }

      // Apply customer filter
      if (input?.customers?.length) {
        query = query.in("customer_id", input.customers);
      }

      // Apply sorting
      if (input?.sort && input.sort.length === 2) {
        const [field, direction] = input.sort;
        const dbField = field === "createdAt" ? "created_at" :
                        field === "dueDate" ? "due_date" :
                        field === "issueDate" ? "issue_date" :
                        field === "invoiceNumber" ? "invoice_number" :
                        field === "customerName" ? "customer_name" :
                        field;
        query = query.order(dbField, { ascending: direction === "asc" });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Apply cursor-based pagination
      const pageSize = input?.pageSize ?? 25;
      const cursor = input?.cursor ? Number.parseInt(input.cursor, 10) : 0;
      query = query.range(cursor, cursor + pageSize);

      const { data: invoices, error } = await query;

      if (error) {
        console.log("[invoice.get] Supabase REST error:", error.message);
        return {
          data: [],
          meta: {
            cursor: null,
            hasNextPage: false,
            hasPreviousPage: cursor > 0,
          },
        };
      }

      const allInvoices = invoices ?? [];
      const hasNextPage = allInvoices.length > pageSize;
      const invoicesToReturn = hasNextPage ? allInvoices.slice(0, pageSize) : allInvoices;
      const nextCursor = hasNextPage ? String(cursor + pageSize) : null;

      return {
        data: invoicesToReturn.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          status: inv.status,
          amount: inv.amount,
          currency: inv.currency,
          issueDate: inv.issue_date,
          dueDate: inv.due_date,
          paidAt: inv.paid_at,
          customerId: inv.customer_id,
          customerName: inv.customer_name,
          filePath: inv.file_path,
          sentTo: inv.sent_to,
          viewedAt: inv.viewed_at,
          reminderSentAt: inv.reminder_sent_at,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at,
        })),
        meta: {
          cursor: nextCursor,
          hasNextPage,
          hasPreviousPage: cursor > 0,
        },
      };
    }),

  getById: protectedProcedure
    .input(getInvoiceByIdSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      return getInvoiceById(db, {
        id: input.id,
        teamId: teamId!,
      });
    }),

  getInvoiceByToken: publicProcedure
    .input(getInvoiceByTokenSchema)
    .query(async ({ input, ctx: { db } }) => {
      const { id } = (await verify(decodeURIComponent(input.token))) as {
        id: string;
      };

      if (!id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return getInvoiceById(db, {
        id,
      });
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  paymentStatus: protectedProcedure.query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();
    const today = new Date().toISOString().split("T")[0];

    // Get paid invoices
    const { data: paidInvoices } = await supabase
      .from("invoices")
      .select("id, due_date, paid_at, status, amount, currency")
      .eq("team_id", teamId)
      .not("due_date", "is", null)
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .order("due_date", { ascending: false })
      .limit(50);

    // Get overdue invoices (unpaid with past due date)
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("id, due_date, paid_at, status, amount, currency")
      .eq("team_id", teamId)
      .not("due_date", "is", null)
      .in("status", ["unpaid", "overdue"])
      .is("paid_at", null)
      .lt("due_date", today)
      .order("due_date", { ascending: false })
      .limit(50);

    // Combine and process results
    const allInvoices = [...(paidInvoices ?? []), ...(overdueInvoices ?? [])];

    // Calculate payment score based on on-time payments
    let onTimeCount = 0;
    let lateCount = 0;

    for (const invoice of paidInvoices ?? []) {
      if (invoice.paid_at && invoice.due_date) {
        const paidDate = new Date(invoice.paid_at);
        const dueDate = new Date(invoice.due_date);
        if (paidDate <= dueDate) {
          onTimeCount++;
        } else {
          lateCount++;
        }
      }
    }

    const overdueCount = overdueInvoices?.length ?? 0;
    const totalPaid = paidInvoices?.length ?? 0;
    const score = totalPaid > 0 ? Math.round((onTimeCount / totalPaid) * 100) : 100;

    return {
      score,
      onTimeCount,
      lateCount,
      overdueCount,
      totalPaid,
      invoices: allInvoices.slice(0, 50).map((inv: any) => ({
        id: inv.id,
        dueDate: inv.due_date,
        paidAt: inv.paid_at,
        status: inv.status,
        amount: inv.amount,
        currency: inv.currency,
      })),
    };
  }),

  searchInvoiceNumber: protectedProcedure
    .input(searchInvoiceNumberSchema)
    .query(async ({ input, ctx: { db, teamId } }) => {
      return searchInvoiceNumber(db, {
        teamId: teamId!,
        query: input.query,
      });
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  invoiceSummary: protectedProcedure
    .input(invoiceSummarySchema.optional())
    .query(async ({ ctx: { teamId }, input }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("invoices")
        .select("amount, currency")
        .eq("team_id", teamId);

      if (input?.statuses?.length) {
        // Filter out 'scheduled' status as it may not exist in the database enum
        const validStatuses = input.statuses.filter(s => s !== "scheduled");
        if (validStatuses.length) {
          query = query.in("status", validStatuses);
        }
      }

      const { data: invoices, error } = await query;

      if (error) {
        console.log("[invoice.invoiceSummary] Supabase REST error:", error.message);
        return { totalAmount: 0, currency: "USD", invoiceCount: 0 };
      }

      // Calculate totals grouped by currency
      const currencyTotals: Record<string, number> = {};
      let totalCount = 0;

      for (const invoice of invoices ?? []) {
        const currency = invoice.currency || "USD";
        currencyTotals[currency] = (currencyTotals[currency] || 0) + (Number(invoice.amount) || 0);
        totalCount++;
      }

      // Return the primary currency total (most common or first one)
      const primaryCurrency = Object.keys(currencyTotals)[0] || "USD";
      return {
        totalAmount: currencyTotals[primaryCurrency] || 0,
        currency: primaryCurrency,
        invoiceCount: totalCount,
        currencyTotals,
      };
    }),

  createFromTracker: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        dateFrom: z.string(),
        dateTo: z.string(),
      }),
    )
    .mutation(async ({ ctx: { db, teamId, session }, input }) => {
      const { projectId, dateFrom, dateTo } = input;

      // Get project data and tracker entries
      const [projectData, trackerData] = await Promise.all([
        getTrackerProjectById(db, { id: projectId, teamId: teamId! }),
        getTrackerRecordsByRange(db, {
          teamId: teamId!,
          projectId,
          from: dateFrom,
          to: dateTo,
        }),
      ]);

      if (!projectData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PROJECT_NOT_FOUND",
        });
      }

      // Check if project is billable
      if (!projectData.billable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PROJECT_NOT_BILLABLE",
        });
      }

      // Check if project has a rate
      if (!projectData.rate || projectData.rate <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PROJECT_NO_RATE",
        });
      }

      // Calculate total hours from tracker entries
      const allEntries = Object.values(trackerData.result || {}).flat();
      const totalDuration = allEntries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0,
      );
      const totalHours = Math.round((totalDuration / 3600) * 100) / 100;

      if (totalHours === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "NO_TRACKED_HOURS",
        });
      }

      // Get default invoice settings and customer details
      const [nextInvoiceNumber, template, team, fullCustomer, user] =
        await Promise.all([
          getNextInvoiceNumber(db, teamId!),
          getInvoiceTemplate(db, teamId!),
          getTeamById(db, teamId!),
          projectData.customerId
            ? getCustomerById(db, {
                id: projectData.customerId,
                teamId: teamId!,
              })
            : null,
          getUserById(db, session?.user.id!),
        ]);

      const invoiceId = uuidv4();
      const currency = projectData.currency || team?.baseCurrency || "USD";
      const amount = totalHours * Number(projectData.rate);

      // Get user's preferred date format
      const userDateFormat =
        template?.dateFormat ?? user?.dateFormat ?? defaultTemplate.dateFormat;

      // Format the date range for the line item description
      // Use parseISO to avoid timezone shifts when parsing date strings
      const formattedDateFrom = format(parseISO(dateFrom), userDateFormat);
      const formattedDateTo = format(parseISO(dateTo), userDateFormat);
      const dateRangeDescription = `${projectData.name} (${formattedDateFrom} - ${formattedDateTo})`;

      // Create draft invoice with tracker data
      const templateData = {
        ...defaultTemplate,
        currency: currency.toUpperCase(),
        ...(template
          ? Object.fromEntries(
              Object.entries(template).map(([key, value]) => [
                key,
                value === null ? undefined : value,
              ]),
            )
          : {}),
        size: (template?.size === "a4" || template?.size === "letter"
          ? template.size
          : defaultTemplate.size) as "a4" | "letter",
        deliveryType: (template?.deliveryType === "create" ||
        template?.deliveryType === "create_and_send"
          ? template.deliveryType
          : defaultTemplate.deliveryType) as
          | "create"
          | "create_and_send"
          | undefined,
      };

      const invoiceData = {
        id: invoiceId,
        teamId: teamId!,
        userId: session?.user.id!,
        customerId: projectData.customerId,
        customerName: fullCustomer?.name,
        invoiceNumber: nextInvoiceNumber,
        currency: currency.toUpperCase(),
        amount,
        lineItems: [
          {
            name: dateRangeDescription,
            quantity: totalHours,
            price: Number(projectData.rate),
            vat: 0,
          },
        ],
        issueDate: new Date().toISOString(),
        dueDate: addMonths(new Date(), 1).toISOString(),
        template: templateData,
        fromDetails: (template?.fromDetails || null) as string | null,
        paymentDetails: (template?.paymentDetails || null) as string | null,
        customerDetails: fullCustomer
          ? JSON.stringify(transformCustomerToContent(fullCustomer))
          : null,
        noteDetails: null,
        topBlock: null,
        bottomBlock: null,
        vat: null,
        tax: null,
        discount: null,
        subtotal: null,
      };

      return draftInvoice(db, invoiceData);
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  defaultSettings: protectedProcedure.query(
    async ({ ctx: { teamId, session, geo } }) => {
      const supabase = await createAdminClient();

      // Fetch data concurrently via Supabase REST
      const [teamResult, userResult, templateResult] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, base_currency")
          .eq("id", teamId)
          .single(),
        supabase
          .from("users")
          .select("id, locale, timezone, date_format")
          .eq("id", session?.user.id)
          .single(),
        supabase
          .from("invoice_templates")
          .select("*")
          .eq("team_id", teamId)
          .single(),
      ]);

      // Get next invoice number (simple query)
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId);
      const nextInvoiceNumber = (count ?? 0) + 1;

      const team = teamResult.data ? { baseCurrency: teamResult.data.base_currency } : null;
      const user = userResult.data ? {
        locale: userResult.data.locale,
        timezone: userResult.data.timezone,
        dateFormat: userResult.data.date_format,
      } : null;

      // Transform template from snake_case
      const templateData = templateResult.data;
      const template = templateData ? {
        title: templateData.title,
        logoUrl: templateData.logo_url,
        currency: templateData.currency,
        size: templateData.size,
        includeTax: templateData.include_tax,
        includeVat: templateData.include_vat,
        includeDiscount: templateData.include_discount,
        includeDecimals: templateData.include_decimals,
        includeUnits: templateData.include_units,
        includeQr: templateData.include_qr,
        includePdf: templateData.include_pdf,
        sendCopy: templateData.send_copy,
        customerLabel: templateData.customer_label,
        fromLabel: templateData.from_label,
        invoiceNoLabel: templateData.invoice_no_label,
        subtotalLabel: templateData.subtotal_label,
        issueDateLabel: templateData.issue_date_label,
        totalSummaryLabel: templateData.total_summary_label,
        dueDateLabel: templateData.due_date_label,
        discountLabel: templateData.discount_label,
        descriptionLabel: templateData.description_label,
        priceLabel: templateData.price_label,
        quantityLabel: templateData.quantity_label,
        totalLabel: templateData.total_label,
        vatLabel: templateData.vat_label,
        taxLabel: templateData.tax_label,
        paymentLabel: templateData.payment_label,
        noteLabel: templateData.note_label,
        dateFormat: templateData.date_format,
        deliveryType: templateData.delivery_type,
        taxRate: templateData.tax_rate,
        vatRate: templateData.vat_rate,
        fromDetails: templateData.from_details,
        paymentDetails: templateData.payment_details,
        noteDetails: templateData.note_details,
      } : null;

      const locale = user?.locale ?? geo?.locale ?? "en";
      const timezone = user?.timezone ?? geo?.timezone ?? "America/New_York";
      const currency =
        template?.currency ?? team?.baseCurrency ?? defaultTemplate.currency;
      const dateFormat =
        template?.dateFormat ?? user?.dateFormat ?? defaultTemplate.dateFormat;
      const logoUrl = template?.logoUrl ?? defaultTemplate.logoUrl;
      const countryCode = geo?.country ?? "US";

      // Default to letter size for US/CA, A4 for rest of world
      const size = ["US", "CA"].includes(countryCode) ? "letter" : "a4";

      // Default to include sales tax for countries where it's common
      const includeTax = ["US", "CA", "AU", "NZ", "SG", "MY", "IN"].includes(
        countryCode,
      );

      const savedTemplate = {
        title: template?.title ?? defaultTemplate.title,
        logoUrl,
        currency,
        size: template?.size ?? defaultTemplate.size,
        includeTax: template?.includeTax ?? includeTax,
        includeVat: template?.includeVat ?? !includeTax,
        includeDiscount:
          template?.includeDiscount ?? defaultTemplate.includeDiscount,
        includeDecimals:
          template?.includeDecimals ?? defaultTemplate.includeDecimals,
        includeUnits: template?.includeUnits ?? defaultTemplate.includeUnits,
        includeQr: template?.includeQr ?? defaultTemplate.includeQr,
        includePdf: template?.includePdf ?? defaultTemplate.includePdf,
        sendCopy: template?.sendCopy ?? defaultTemplate.sendCopy,
        customerLabel: template?.customerLabel ?? defaultTemplate.customerLabel,
        fromLabel: template?.fromLabel ?? defaultTemplate.fromLabel,
        invoiceNoLabel:
          template?.invoiceNoLabel ?? defaultTemplate.invoiceNoLabel,
        subtotalLabel: template?.subtotalLabel ?? defaultTemplate.subtotalLabel,
        issueDateLabel:
          template?.issueDateLabel ?? defaultTemplate.issueDateLabel,
        totalSummaryLabel:
          template?.totalSummaryLabel ?? defaultTemplate.totalSummaryLabel,
        dueDateLabel: template?.dueDateLabel ?? defaultTemplate.dueDateLabel,
        discountLabel: template?.discountLabel ?? defaultTemplate.discountLabel,
        descriptionLabel:
          template?.descriptionLabel ?? defaultTemplate.descriptionLabel,
        priceLabel: template?.priceLabel ?? defaultTemplate.priceLabel,
        quantityLabel: template?.quantityLabel ?? defaultTemplate.quantityLabel,
        totalLabel: template?.totalLabel ?? defaultTemplate.totalLabel,
        vatLabel: template?.vatLabel ?? defaultTemplate.vatLabel,
        taxLabel: template?.taxLabel ?? defaultTemplate.taxLabel,
        paymentLabel: template?.paymentLabel ?? defaultTemplate.paymentLabel,
        noteLabel: template?.noteLabel ?? defaultTemplate.noteLabel,
        dateFormat,
        deliveryType: template?.deliveryType ?? defaultTemplate.deliveryType,
        taxRate: template?.taxRate ?? defaultTemplate.taxRate,
        vatRate: template?.vatRate ?? defaultTemplate.vatRate,
        fromDetails: template?.fromDetails ?? defaultTemplate.fromDetails,
        paymentDetails:
          template?.paymentDetails ?? defaultTemplate.paymentDetails,
        noteDetails: template?.noteDetails ?? defaultTemplate.noteDetails,
        timezone,
        locale,
      };

      return {
        // Default values first
        id: uuidv4(),
        currency,
        status: "draft",
        size,
        includeTax: savedTemplate?.includeTax ?? includeTax,
        includeVat: savedTemplate?.includeVat ?? !includeTax,
        includeDiscount: false,
        includeDecimals: false,
        includePdf: false,
        sendCopy: false,
        includeUnits: false,
        includeQr: true,
        invoiceNumber: nextInvoiceNumber,
        timezone,
        locale,
        fromDetails: savedTemplate.fromDetails,
        paymentDetails: savedTemplate.paymentDetails,
        customerDetails: undefined,
        noteDetails: savedTemplate.noteDetails,
        customerId: undefined,
        issueDate: new UTCDate().toISOString(),
        dueDate: addMonths(new UTCDate(), 1).toISOString(),
        lineItems: [{ name: "", quantity: 0, price: 0, vat: 0 }],
        tax: undefined,
        token: undefined,
        discount: undefined,
        subtotal: undefined,
        topBlock: undefined,
        bottomBlock: undefined,
        amount: undefined,
        customerName: undefined,
        logoUrl: undefined,
        vat: undefined,
        template: savedTemplate,
      };
    },
  ),

  update: protectedProcedure
    .input(updateInvoiceSchema)
    .mutation(async ({ input, ctx: { db, teamId, session } }) => {
      return updateInvoice(db, {
        ...input,
        teamId: teamId!,
        userId: session.user.id,
      });
    }),

  delete: protectedProcedure
    .input(deleteInvoiceSchema)
    .mutation(async ({ input, ctx: { db, teamId } }) => {
      return deleteInvoice(db, {
        id: input.id,
        teamId: teamId!,
      });
    }),

  draft: protectedProcedure
    .input(draftInvoiceSchema)
    .mutation(async ({ input, ctx: { db, teamId, session } }) => {
      // Generate invoice number if not provided
      const invoiceNumber =
        input.invoiceNumber || (await getNextInvoiceNumber(db, teamId!));

      return draftInvoice(db, {
        ...input,
        invoiceNumber,
        teamId: teamId!,
        userId: session?.user.id!,
        paymentDetails: parseInputValue(input.paymentDetails),
        fromDetails: parseInputValue(input.fromDetails),
        customerDetails: parseInputValue(input.customerDetails),
        noteDetails: parseInputValue(input.noteDetails),
      });
    }),

  create: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ input, ctx: { db, teamId, session } }) => {
      // Handle different delivery types
      if (input.deliveryType === "scheduled") {
        if (!input.scheduledAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "scheduledAt is required for scheduled delivery",
          });
        }

        // Convert to Date object and validate it's in the future
        const scheduledDate = new Date(input.scheduledAt);
        const now = new Date();

        if (scheduledDate <= now) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "scheduledAt must be in the future",
          });
        }

        // Check if this is an existing scheduled invoice
        const existingInvoice = await getInvoiceById(db, {
          id: input.id,
          teamId: teamId!,
        });

        let scheduledJobId: string | null = null;

        try {
          if (existingInvoice?.scheduledJobId) {
            // Reschedule the existing job instead of creating a new one
            await runs.reschedule(existingInvoice.scheduledJobId, {
              delay: scheduledDate,
            });
            scheduledJobId = existingInvoice.scheduledJobId;
          } else {
            // Create a new scheduled job
            const scheduledRun = await tasks.trigger(
              "schedule-invoice",
              {
                invoiceId: input.id,
                scheduledAt: input.scheduledAt,
              },
              {
                delay: scheduledDate,
              },
            );

            if (!scheduledRun?.id) {
              throw new Error(
                "Failed to create scheduled job - no job ID returned",
              );
            }

            scheduledJobId = scheduledRun.id;
          }
        } catch (error) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            cause: error,
          });
        }

        // Only update the invoice status to "scheduled" if we successfully created/rescheduled the job
        if (!scheduledJobId) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
          });
        }

        // Update the invoice with scheduling information
        const data = await updateInvoice(db, {
          id: input.id,
          status: "scheduled",
          scheduledAt: input.scheduledAt,
          scheduledJobId,
          teamId: teamId!,
        });

        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        tasks.trigger("notification", {
          type: "invoice_scheduled",
          teamId: teamId!,
          invoiceId: input.id,
          invoiceNumber: data.invoiceNumber,
          scheduledAt: input.scheduledAt,
          customerName: data.customerName,
        });

        return data;
      }

      const data = await updateInvoice(db, {
        id: input.id,
        status: "unpaid",
        teamId: teamId!,
        userId: session.user.id,
      });

      if (!data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      await tasks.trigger("generate-invoice", {
        invoiceId: data.id,
        deliveryType: input.deliveryType,
      } satisfies GenerateInvoicePayload);

      return data;
    }),

  remind: protectedProcedure
    .input(remindInvoiceSchema)
    .mutation(async ({ input, ctx: { db, teamId } }) => {
      await tasks.trigger("send-invoice-reminder", {
        invoiceId: input.id,
      } satisfies SendInvoiceReminderPayload);

      return updateInvoice(db, {
        id: input.id,
        teamId: teamId!,
        reminderSentAt: input.date,
      });
    }),

  duplicate: protectedProcedure
    .input(duplicateInvoiceSchema)
    .mutation(async ({ input, ctx: { db, session, teamId } }) => {
      const nextInvoiceNumber = await getNextInvoiceNumber(db, teamId!);

      return duplicateInvoice(db, {
        id: input.id,
        userId: session?.user.id!,
        invoiceNumber: nextInvoiceNumber!,
        teamId: teamId!,
      });
    }),

  updateSchedule: protectedProcedure
    .input(updateScheduledInvoiceSchema)
    .mutation(async ({ input, ctx: { db, teamId } }) => {
      // Get the current invoice to find the old scheduled job ID
      const invoice = await getInvoiceById(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (!invoice || !invoice.scheduledJobId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scheduled invoice not found",
        });
      }

      // Convert to Date object and validate it's in the future
      const scheduledDate = new Date(input.scheduledAt);
      const now = new Date();

      if (scheduledDate <= now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "scheduledAt must be in the future",
        });
      }

      // Reschedule the existing job with the new date
      await runs.reschedule(invoice.scheduledJobId, {
        delay: scheduledDate,
      });

      // Update the scheduled date in the database
      const updatedInvoice = await updateInvoice(db, {
        id: input.id,
        scheduledAt: input.scheduledAt,
        teamId: teamId!,
      });

      return updatedInvoice;
    }),

  cancelSchedule: protectedProcedure
    .input(cancelScheduledInvoiceSchema)
    .mutation(async ({ input, ctx: { db, teamId } }) => {
      // Get the current invoice to find the scheduled job ID
      const invoice = await getInvoiceById(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scheduled invoice not found",
        });
      }

      if (invoice.scheduledJobId) {
        // Cancel the scheduled job
        await runs.cancel(invoice.scheduledJobId);
      }

      // Update the invoice status back to draft and clear scheduling fields
      const updatedInvoice = await updateInvoice(db, {
        id: input.id,
        status: "draft",
        scheduledAt: null,
        scheduledJobId: null,
        teamId: teamId!,
      });

      return updatedInvoice;
    }),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  mostActiveClient: protectedProcedure.query(
    async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get all invoices with customer info
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("customer_id, customer_name")
        .eq("team_id", teamId)
        .not("customer_id", "is", null);

      if (error || !invoices?.length) {
        return null;
      }

      // Count invoices per customer
      const customerCounts: Record<string, { count: number; name: string }> = {};
      for (const inv of invoices) {
        if (inv.customer_id) {
          if (!customerCounts[inv.customer_id]) {
            customerCounts[inv.customer_id] = { count: 0, name: inv.customer_name || "" };
          }
          customerCounts[inv.customer_id].count++;
        }
      }

      // Find the customer with most invoices
      let maxCustomer: { customerId: string; customerName: string; invoiceCount: number } | null = null;
      for (const [customerId, data] of Object.entries(customerCounts)) {
        if (!maxCustomer || data.count > maxCustomer.invoiceCount) {
          maxCustomer = { customerId, customerName: data.name, invoiceCount: data.count };
        }
      }

      return maxCustomer;
    },
  ),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  inactiveClientsCount: protectedProcedure.query(
    async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get customers with no recent invoices (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().split("T")[0];

      // Get all customers for this team
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("team_id", teamId);

      if (!customers?.length) {
        return { count: 0 };
      }

      // Get customers with recent invoices
      const { data: recentInvoices } = await supabase
        .from("invoices")
        .select("customer_id")
        .eq("team_id", teamId)
        .gte("issue_date", cutoffDate)
        .not("customer_id", "is", null);

      const activeCustomerIds = new Set(recentInvoices?.map(inv => inv.customer_id) || []);
      const inactiveCount = customers.filter(c => !activeCustomerIds.has(c.id)).length;

      return { count: inactiveCount };
    },
  ),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  averageDaysToPayment: protectedProcedure.query(
    async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get paid invoices with issue_date and paid_at
      const { data: paidInvoices, error } = await supabase
        .from("invoices")
        .select("issue_date, paid_at")
        .eq("team_id", teamId)
        .eq("status", "paid")
        .not("paid_at", "is", null);

      if (error || !paidInvoices?.length) {
        return { averageDays: 0 };
      }

      // Calculate average days to payment
      let totalDays = 0;
      let count = 0;

      for (const inv of paidInvoices) {
        if (inv.issue_date && inv.paid_at) {
          const issueDate = new Date(inv.issue_date);
          const paidDate = new Date(inv.paid_at);
          const diffDays = Math.floor((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
            totalDays += diffDays;
            count++;
          }
        }
      }

      return { averageDays: count > 0 ? Math.round(totalDays / count) : 0 };
    },
  ),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  averageInvoiceSize: protectedProcedure.query(
    async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get all invoices with amounts
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("amount, currency")
        .eq("team_id", teamId)
        .not("amount", "is", null);

      if (error || !invoices?.length) {
        return { averageAmount: 0, currency: "USD" };
      }

      // Calculate average amount (grouped by currency, return first)
      const currencyTotals: Record<string, { total: number; count: number }> = {};

      for (const inv of invoices) {
        const currency = inv.currency || "USD";
        if (!currencyTotals[currency]) {
          currencyTotals[currency] = { total: 0, count: 0 };
        }
        currencyTotals[currency].total += Number(inv.amount) || 0;
        currencyTotals[currency].count++;
      }

      const primaryCurrency = Object.keys(currencyTotals)[0] || "USD";
      const data = currencyTotals[primaryCurrency];

      return {
        averageAmount: data ? Math.round(data.total / data.count) : 0,
        currency: primaryCurrency,
      };
    },
  ),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  topRevenueClient: protectedProcedure.query(
    async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get all paid invoices with customer info
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("customer_id, customer_name, amount, currency")
        .eq("team_id", teamId)
        .eq("status", "paid")
        .not("customer_id", "is", null);

      if (error || !invoices?.length) {
        return null;
      }

      // Sum revenue per customer
      const customerRevenue: Record<string, { total: number; name: string; currency: string }> = {};

      for (const inv of invoices) {
        if (inv.customer_id) {
          if (!customerRevenue[inv.customer_id]) {
            customerRevenue[inv.customer_id] = {
              total: 0,
              name: inv.customer_name || "",
              currency: inv.currency || "USD"
            };
          }
          customerRevenue[inv.customer_id].total += Number(inv.amount) || 0;
        }
      }

      // Find the customer with highest revenue
      let topCustomer: { customerId: string; customerName: string; totalRevenue: number; currency: string } | null = null;

      for (const [customerId, data] of Object.entries(customerRevenue)) {
        if (!topCustomer || data.total > topCustomer.totalRevenue) {
          topCustomer = {
            customerId,
            customerName: data.name,
            totalRevenue: data.total,
            currency: data.currency,
          };
        }
      }

      return topCustomer;
    },
  ),

  // Use Supabase REST directly to avoid Drizzle connection pool issues
  newCustomersCount: protectedProcedure.query(
    async ({ ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Count customers created in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString();

      const { count, error } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .gte("created_at", cutoffDate);

      if (error) {
        return { count: 0 };
      }

      return { count: count ?? 0 };
    },
  ),
});
