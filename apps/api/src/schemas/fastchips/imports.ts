import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const fastchipsImportStatusSchema = z.enum([
  "pending",
  "validating",
  "validated",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const fastchipsOperationTypeSchema = z.enum(["Entrada", "Saída"]);

export const fastchipsPurposeSchema = z.enum([
  "Recebimento",
  "Pagamento",
  "Saque",
  "Serviço",
]);

// =============================================================================
// PARSED DATA SCHEMAS (for Excel sheets)
// =============================================================================

/**
 * Parsed operation from Fastchips/Chippix spreadsheet
 * Maps columns: Data, Tipo, Finalidade, Entrada bruta, Saída bruta,
 * Entrada líquida, Saída líquida, Integrante, Taxa da operação,
 * Id Jogador, Id da operação, Id do pagamento
 */
export const parsedFastchipsOperationSchema = z.object({
  // Column A: Data (DD-MM-YYYY HH:MM)
  occurredAt: z.string(),
  // Column B: Tipo (Entrada/Saída)
  operationType: fastchipsOperationTypeSchema,
  // Column C: Finalidade (Recebimento/Pagamento/Saque/Serviço)
  purpose: fastchipsPurposeSchema,
  // Column D: Entrada bruta
  grossEntry: z.number().nullable(),
  // Column E: Saída bruta
  grossExit: z.number().nullable(),
  // Column F: Entrada líquida
  netEntry: z.number().nullable(),
  // Column G: Saída líquida
  netExit: z.number().nullable(),
  // Column H: Integrante
  memberName: z.string(),
  // Column I: Taxa da operação (0, 0.5, 1.5)
  feeRate: z.number(),
  // Column J: Id Jogador (PPPoker ID)
  ppPokerId: z.string().nullable(),
  // Column K: Id da operação (24 hex chars)
  operationId: z.string(),
  // Column L: Id do pagamento
  paymentId: z.string(),
});

/**
 * Full import data structure for Fastchips
 */
export const fastchipsImportDataSchema = z
  .object({
    operations: z.array(parsedFastchipsOperationSchema),
    periodStart: z.string().nullable().optional(),
    periodEnd: z.string().nullable().optional(),
  })
  .passthrough();

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getFastchipsImportsSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  status: fastchipsImportStatusSchema.nullable().optional(),
});

export const getFastchipsImportByIdSchema = z.object({
  id: z.string().uuid(),
});

export const createFastchipsImportSchema = z.object({
  fileName: z.string(),
  fileSize: z.number().optional(),
  rawData: fastchipsImportDataSchema,
});

export const validateFastchipsImportSchema = z.object({
  id: z.string().uuid(),
});

export const processFastchipsImportSchema = z.object({
  id: z.string().uuid(),
});

export const cancelFastchipsImportSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type FastchipsImportStatus = z.infer<typeof fastchipsImportStatusSchema>;
export type FastchipsOperationType = z.infer<
  typeof fastchipsOperationTypeSchema
>;
export type FastchipsPurpose = z.infer<typeof fastchipsPurposeSchema>;
export type ParsedFastchipsOperation = z.infer<
  typeof parsedFastchipsOperationSchema
>;
export type FastchipsImportData = z.infer<typeof fastchipsImportDataSchema>;
