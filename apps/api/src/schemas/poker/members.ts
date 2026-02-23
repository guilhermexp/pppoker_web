import { z } from "zod";

export const getMembersListSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().min(1).max(100).optional(),
  q: z.string().optional(),
  sort: z.tuple([z.string(), z.string()]).nullable().optional(),
});

export const listPendingMembersSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().min(1).max(100).optional(),
});

export const reviewMemberSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approved", "rejected"]),
  note: z.string().optional(),
});

export const listCreditRequestsSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().min(1).max(100).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const reviewCreditSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approved", "rejected"]),
  approvedAmount: z.number().optional(),
  note: z.string().optional(),
});

export const createCreditRequestSchema = z.object({
  playerId: z.string().uuid(),
  requestedAmount: z.number().min(0),
  note: z.string().optional(),
});

export const createMemberRequestSchema = z.object({
  ppPokerId: z.string(),
  nickname: z.string(),
  playerId: z.string().uuid().optional(),
  note: z.string().optional(),
});
