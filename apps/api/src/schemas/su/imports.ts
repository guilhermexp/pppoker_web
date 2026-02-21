import { z } from "@hono/zod-openapi";

export const listImportsInput = z
  .object({
    status: z
      .enum([
        "pending",
        "validating",
        "validated",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ])
      .optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  })
  .optional();

export const getImportByIdInput = z.object({
  id: z.string().uuid(),
});

export const createImportInput = z.object({
  fileName: z.string(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  timezone: z.string().optional(),
  rawData: z.any(),
  validationPassed: z.boolean().optional(),
  validationErrors: z.any().optional(),
  validationWarnings: z.any().optional(),
  qualityScore: z.number().optional(),
});

export const processImportInput = z.object({
  importId: z.string().uuid(),
  data: z.object({
    geralPPST: z.array(z.any()).optional(),
    jogosPPST: z.array(z.any()).optional(),
    geralPPSR: z.array(z.any()).optional(),
    jogosPPSR: z.array(z.any()).optional(),
  }),
});

export const deleteImportInput = z.object({
  id: z.string().uuid(),
});
