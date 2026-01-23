import { z } from "@hono/zod-openapi";
import {
  fastchipsOperationTypeSchema,
  fastchipsPurposeSchema,
} from "./imports";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getFastchipsOperationsSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  operationType: fastchipsOperationTypeSchema.nullable().optional(),
  purpose: fastchipsPurposeSchema.nullable().optional(),
  memberId: z.string().uuid().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
});

export const getFastchipsOperationByIdSchema = z.object({
  id: z.string().uuid(),
});

export const getFastchipsOperationStatsSchema = z.object({
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  memberId: z.string().uuid().nullable().optional(),
});
