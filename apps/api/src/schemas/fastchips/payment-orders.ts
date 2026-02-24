import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const paymentOrderStatusSchema = z.enum([
  "link_gerado",
  "pago",
  "fichas_enviadas",
  "cancelado",
  "erro",
]);

// =============================================================================
// INPUT SCHEMAS — REST (MCP sync)
// =============================================================================

export const upsertPaymentOrderSchema = z.object({
  teamId: z.string().uuid(),
  orderNsu: z.string().min(1),
  status: paymentOrderStatusSchema.optional(),
  fichas: z.number().int().positive().optional(),
  valorReais: z.number().positive().optional(),
  checkoutUrl: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  playerUid: z.number().int().nullable().optional(),
  playerNome: z.string().nullable().optional(),
  playerEmail: z.string().nullable().optional(),
  playerTelefone: z.string().nullable().optional(),
  transactionNsu: z.string().nullable().optional(),
  captureMethod: z.string().nullable().optional(),
  paidAmount: z.number().nullable().optional(),
  installments: z.number().int().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// INPUT SCHEMAS — tRPC (Dashboard)
// =============================================================================

export const getPaymentOrdersSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  status: paymentOrderStatusSchema.nullable().optional(),
  search: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
});

export const updatePaymentOrderStatusSchema = z.object({
  id: z.string().uuid(),
  status: paymentOrderStatusSchema,
  errorMessage: z.string().nullable().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PaymentOrderStatus = z.infer<typeof paymentOrderStatusSchema>;
export type UpsertPaymentOrder = z.infer<typeof upsertPaymentOrderSchema>;
export type GetPaymentOrders = z.infer<typeof getPaymentOrdersSchema>;
