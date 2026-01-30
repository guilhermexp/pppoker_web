import { createAdminClient } from "@api/services/supabase";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

// =============================================================================
// Schemas
// =============================================================================

const createMetaGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  metaPercent: z.number().min(0).max(100),
  memberIds: z
    .array(
      z.object({
        superUnionId: z.number(),
        suLeagueId: z.string().uuid().optional(),
        displayName: z.string().optional(),
      }),
    )
    .optional(),
});

const updateMetaGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  metaPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

const createTimeSlotSchema = z.object({
  metaGroupId: z.string().uuid(),
  name: z.string().min(1).max(100),
  hourStart: z.number().int().min(0).max(23),
  hourEnd: z.number().int().min(0).max(23),
  metaPercent: z.number().min(0).max(100),
  isActive: z.boolean().optional(),
});

const updateTimeSlotSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  hourStart: z.number().int().min(0).max(23).optional(),
  hourEnd: z.number().int().min(0).max(23).optional(),
  metaPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

const createClubMetaSchema = z.object({
  superUnionId: z.number(),
  clubId: z.number(),
  weekYear: z.number(),
  weekNumber: z.number(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
  targetType: z.enum(["players", "buyins"]),
  targetValue: z.number().min(0),
  referenceBuyin: z.number().nullable().optional(),
  note: z.string().optional(),
});

const updateClubMetaSchema = z.object({
  id: z.string().uuid(),
  targetValue: z.number().min(0).optional(),
  referenceBuyin: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
});

// =============================================================================
// Helper: validate sum of active group percentages
// =============================================================================

async function validateGroupPercentSum(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  teamId: string,
  excludeGroupId?: string,
  newPercent?: number,
) {
  const { data: groups } = await supabase
    .from("poker_su_meta_groups")
    .select("id, meta_percent")
    .eq("team_id", teamId)
    .eq("is_active", true);

  let totalPercent = 0;
  for (const g of groups ?? []) {
    if (g.id === excludeGroupId) continue;
    totalPercent += Number(g.meta_percent);
  }

  if (newPercent !== undefined) {
    totalPercent += newPercent;
  }

  if (totalPercent > 100) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `A soma dos percentuais dos grupos ativos seria ${totalPercent.toFixed(2)}%, que excede 100%.`,
    });
  }
}

// =============================================================================
// Router
// =============================================================================

export const suMetasRouter = createTRPCRouter({
  // ===========================================================================
  // Meta Groups
  // ===========================================================================

  "metaGroups.list": protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_su_meta_groups")
        .select("*, poker_su_meta_group_members(count)")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });

      if (input?.activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch meta groups",
        });
      }

      return (data ?? []).map((g: any) => ({
        ...g,
        metaPercent: Number(g.meta_percent),
        membersCount: g.poker_su_meta_group_members?.[0]?.count ?? 0,
      }));
    }),

  "metaGroups.getById": protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data: group, error } = await supabase
        .from("poker_su_meta_groups")
        .select("*")
        .eq("team_id", teamId)
        .eq("id", input.id)
        .single();

      if (error || !group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const { data: members } = await supabase
        .from("poker_su_meta_group_members")
        .select("*")
        .eq("meta_group_id", input.id)
        .order("created_at", { ascending: true });

      const { data: timeSlots } = await supabase
        .from("poker_su_meta_group_time_slots")
        .select("*")
        .eq("meta_group_id", input.id)
        .order("hour_start", { ascending: true });

      return {
        ...group,
        metaPercent: Number(group.meta_percent),
        members: members ?? [],
        timeSlots: (timeSlots ?? []).map((ts: any) => ({
          ...ts,
          metaPercent: Number(ts.meta_percent),
        })),
      };
    }),

  "metaGroups.create": protectedProcedure
    .input(createMetaGroupSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();
      const userId = session?.user?.id;

      // Validate percent sum
      await validateGroupPercentSum(
        supabase,
        teamId,
        undefined,
        input.metaPercent,
      );

      // Create group
      const { data: group, error } = await supabase
        .from("poker_su_meta_groups")
        .insert({
          team_id: teamId,
          name: input.name,
          description: input.description,
          meta_percent: input.metaPercent,
          created_by_id: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Ja existe um grupo com o nome "${input.name}"`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create meta group",
        });
      }

      // Add members if provided
      if (input.memberIds && input.memberIds.length > 0) {
        const membersToInsert = input.memberIds.map((m) => ({
          team_id: teamId,
          meta_group_id: group.id,
          super_union_id: m.superUnionId,
          su_league_id: m.suLeagueId ?? null,
          display_name: m.displayName ?? null,
        }));

        const { error: memberError } = await supabase
          .from("poker_su_meta_group_members")
          .insert(membersToInsert);

        if (memberError) {
          // Rollback: delete the group if members fail
          await supabase
            .from("poker_su_meta_groups")
            .delete()
            .eq("id", group.id);

          if (memberError.code === "23505") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Uma ou mais SuperUnions ja estao associadas a outro grupo",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add members to group",
          });
        }
      }

      return group;
    }),

  "metaGroups.update": protectedProcedure
    .input(updateMetaGroupSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // If updating percent, validate sum
      if (input.metaPercent !== undefined) {
        await validateGroupPercentSum(
          supabase,
          teamId,
          input.id,
          input.metaPercent,
        );
      }

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.metaPercent !== undefined)
        updateData.meta_percent = input.metaPercent;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from("poker_su_meta_groups")
        .update(updateData)
        .eq("team_id", teamId)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Ja existe um grupo com o nome "${input.name}"`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update meta group",
        });
      }

      return data;
    }),

  "metaGroups.delete": protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_su_meta_groups")
        .delete()
        .eq("team_id", teamId)
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete meta group",
        });
      }

      return { success: true };
    }),

  // ===========================================================================
  // Meta Group Members
  // ===========================================================================

  "metaGroupMembers.add": protectedProcedure
    .input(
      z.object({
        metaGroupId: z.string().uuid(),
        superUnionId: z.number(),
        suLeagueId: z.string().uuid().optional(),
        displayName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_su_meta_group_members")
        .insert({
          team_id: teamId,
          meta_group_id: input.metaGroupId,
          super_union_id: input.superUnionId,
          su_league_id: input.suLeagueId ?? null,
          display_name: input.displayName ?? null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: `SuperUnion ${input.superUnionId} ja esta associada a outro grupo`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add member",
        });
      }

      return data;
    }),

  "metaGroupMembers.remove": protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_su_meta_group_members")
        .delete()
        .eq("team_id", teamId)
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove member",
        });
      }

      return { success: true };
    }),

  "metaGroupMembers.bulk": protectedProcedure
    .input(
      z.object({
        metaGroupId: z.string().uuid(),
        members: z.array(
          z.object({
            superUnionId: z.number(),
            suLeagueId: z.string().uuid().optional(),
            displayName: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Delete all existing members for this group
      await supabase
        .from("poker_su_meta_group_members")
        .delete()
        .eq("team_id", teamId)
        .eq("meta_group_id", input.metaGroupId);

      // Insert new members
      if (input.members.length > 0) {
        const membersToInsert = input.members.map((m) => ({
          team_id: teamId,
          meta_group_id: input.metaGroupId,
          super_union_id: m.superUnionId,
          su_league_id: m.suLeagueId ?? null,
          display_name: m.displayName ?? null,
        }));

        const { error } = await supabase
          .from("poker_su_meta_group_members")
          .insert(membersToInsert);

        if (error) {
          if (error.code === "23505") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Uma ou mais SuperUnions ja estao associadas a outro grupo",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to bulk update members",
          });
        }
      }

      return { success: true };
    }),

  // ===========================================================================
  // Meta Group Time Slots
  // ===========================================================================

  "metaGroupTimeSlots.list": protectedProcedure
    .input(z.object({ metaGroupId: z.string().uuid() }))
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_su_meta_group_time_slots")
        .select("*")
        .eq("team_id", teamId)
        .eq("meta_group_id", input.metaGroupId)
        .order("hour_start", { ascending: true });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch time slots",
        });
      }

      return (data ?? []).map((ts: any) => ({
        ...ts,
        metaPercent: Number(ts.meta_percent),
      }));
    }),

  "metaGroupTimeSlots.create": protectedProcedure
    .input(createTimeSlotSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Validate no overlap with existing active slots in same group
      const { data: existingSlots } = await supabase
        .from("poker_su_meta_group_time_slots")
        .select("id, hour_start, hour_end, name")
        .eq("team_id", teamId)
        .eq("meta_group_id", input.metaGroupId)
        .eq("is_active", true);

      for (const slot of existingSlots ?? []) {
        const overlaps =
          input.hourStart < slot.hour_end && input.hourEnd > slot.hour_start;
        if (overlaps) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Horario ${input.hourStart}h-${input.hourEnd}h conflita com "${slot.name}" (${slot.hour_start}h-${slot.hour_end}h)`,
          });
        }
      }

      const { data, error } = await supabase
        .from("poker_su_meta_group_time_slots")
        .insert({
          team_id: teamId,
          meta_group_id: input.metaGroupId,
          name: input.name,
          hour_start: input.hourStart,
          hour_end: input.hourEnd,
          meta_percent: input.metaPercent,
          is_active: input.isActive ?? true,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create time slot",
        });
      }

      return { ...data, metaPercent: Number(data.meta_percent) };
    }),

  "metaGroupTimeSlots.update": protectedProcedure
    .input(updateTimeSlotSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get the current slot to know its group
      const { data: currentSlot } = await supabase
        .from("poker_su_meta_group_time_slots")
        .select("meta_group_id, hour_start, hour_end")
        .eq("team_id", teamId)
        .eq("id", input.id)
        .single();

      if (!currentSlot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time slot not found",
        });
      }

      // If hours are changing, validate no overlap
      const newStart = input.hourStart ?? currentSlot.hour_start;
      const newEnd = input.hourEnd ?? currentSlot.hour_end;

      if (input.hourStart !== undefined || input.hourEnd !== undefined) {
        const { data: existingSlots } = await supabase
          .from("poker_su_meta_group_time_slots")
          .select("id, hour_start, hour_end, name")
          .eq("team_id", teamId)
          .eq("meta_group_id", currentSlot.meta_group_id)
          .eq("is_active", true)
          .neq("id", input.id);

        for (const slot of existingSlots ?? []) {
          const overlaps = newStart < slot.hour_end && newEnd > slot.hour_start;
          if (overlaps) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Horario ${newStart}h-${newEnd}h conflita com "${slot.name}" (${slot.hour_start}h-${slot.hour_end}h)`,
            });
          }
        }
      }

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.hourStart !== undefined)
        updateData.hour_start = input.hourStart;
      if (input.hourEnd !== undefined) updateData.hour_end = input.hourEnd;
      if (input.metaPercent !== undefined)
        updateData.meta_percent = input.metaPercent;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from("poker_su_meta_group_time_slots")
        .update(updateData)
        .eq("team_id", teamId)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update time slot",
        });
      }

      return { ...data, metaPercent: Number(data.meta_percent) };
    }),

  "metaGroupTimeSlots.delete": protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_su_meta_group_time_slots")
        .delete()
        .eq("team_id", teamId)
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete time slot",
        });
      }

      return { success: true };
    }),

  // ===========================================================================
  // Club Metas
  // ===========================================================================

  "clubMetas.getByWeek": protectedProcedure
    .input(
      z.object({
        weekYear: z.number(),
        weekNumber: z.number(),
        superUnionId: z.number().optional(),
        clubId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_su_club_metas")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_year", input.weekYear)
        .eq("week_number", input.weekNumber)
        .order("super_union_id", { ascending: true });

      if (input.superUnionId) {
        query = query.eq("super_union_id", input.superUnionId);
      }
      if (input.clubId) {
        query = query.eq("club_id", input.clubId);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch club metas",
        });
      }

      return (data ?? []).map((m: any) => ({
        ...m,
        targetValue: Number(m.target_value),
        referenceBuyin: m.reference_buyin ? Number(m.reference_buyin) : null,
      }));
    }),

  "clubMetas.create": protectedProcedure
    .input(createClubMetaSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();
      const userId = session?.user?.id;

      const { data, error } = await supabase
        .from("poker_su_club_metas")
        .insert({
          team_id: teamId,
          super_union_id: input.superUnionId,
          club_id: input.clubId,
          week_year: input.weekYear,
          week_number: input.weekNumber,
          day_of_week: input.dayOfWeek ?? null,
          hour_start: input.hourStart ?? null,
          hour_end: input.hourEnd ?? null,
          target_type: input.targetType,
          target_value: input.targetValue,
          reference_buyin: input.referenceBuyin ?? null,
          note: input.note ?? null,
          created_by_id: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ja existe uma meta com esses parametros",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create club meta",
        });
      }

      return {
        ...data,
        targetValue: Number(data.target_value),
        referenceBuyin: data.reference_buyin
          ? Number(data.reference_buyin)
          : null,
      };
    }),

  "clubMetas.update": protectedProcedure
    .input(updateClubMetaSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const updateData: Record<string, unknown> = {};
      if (input.targetValue !== undefined)
        updateData.target_value = input.targetValue;
      if (input.referenceBuyin !== undefined)
        updateData.reference_buyin = input.referenceBuyin;
      if (input.note !== undefined) updateData.note = input.note;
      if (input.dayOfWeek !== undefined)
        updateData.day_of_week = input.dayOfWeek;
      if (input.hourStart !== undefined)
        updateData.hour_start = input.hourStart;
      if (input.hourEnd !== undefined) updateData.hour_end = input.hourEnd;

      const { data, error } = await supabase
        .from("poker_su_club_metas")
        .update(updateData)
        .eq("team_id", teamId)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update club meta",
        });
      }

      return {
        ...data,
        targetValue: Number(data.target_value),
        referenceBuyin: data.reference_buyin
          ? Number(data.reference_buyin)
          : null,
      };
    }),

  "clubMetas.delete": protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { error } = await supabase
        .from("poker_su_club_metas")
        .delete()
        .eq("team_id", teamId)
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete club meta",
        });
      }

      return { success: true };
    }),

  "clubMetas.bulkCreate": protectedProcedure
    .input(z.object({ metas: z.array(createClubMetaSchema) }))
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();
      const userId = session?.user?.id;

      const metasToInsert = input.metas.map((m) => ({
        team_id: teamId,
        super_union_id: m.superUnionId,
        club_id: m.clubId,
        week_year: m.weekYear,
        week_number: m.weekNumber,
        day_of_week: m.dayOfWeek ?? null,
        hour_start: m.hourStart ?? null,
        hour_end: m.hourEnd ?? null,
        target_type: m.targetType,
        target_value: m.targetValue,
        reference_buyin: m.referenceBuyin ?? null,
        note: m.note ?? null,
        created_by_id: userId,
      }));

      const { data, error } = await supabase
        .from("poker_su_club_metas")
        .upsert(metasToInsert, {
          onConflict:
            "team_id,super_union_id,club_id,week_year,week_number,day_of_week,hour_start,hour_end,target_type",
        })
        .select();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk create club metas",
        });
      }

      return data ?? [];
    }),

  "clubMetas.inheritFromPrevious": protectedProcedure
    .input(
      z.object({
        targetWeekYear: z.number(),
        targetWeekNumber: z.number(),
        sourceWeekYear: z.number(),
        sourceWeekNumber: z.number(),
      }),
    )
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const supabase = await createAdminClient();
      const userId = session?.user?.id;

      // Fetch previous week metas
      const { data: previousMetas } = await supabase
        .from("poker_su_club_metas")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_year", input.sourceWeekYear)
        .eq("week_number", input.sourceWeekNumber);

      if (!previousMetas || previousMetas.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhuma meta encontrada na semana anterior",
        });
      }

      const newMetas = previousMetas.map((m: any) => ({
        team_id: teamId,
        super_union_id: m.super_union_id,
        club_id: m.club_id,
        week_year: input.targetWeekYear,
        week_number: input.targetWeekNumber,
        day_of_week: m.day_of_week,
        hour_start: m.hour_start,
        hour_end: m.hour_end,
        target_type: m.target_type,
        target_value: m.target_value,
        reference_buyin: m.reference_buyin,
        note: m.note,
        created_by_id: userId,
      }));

      const { data, error } = await supabase
        .from("poker_su_club_metas")
        .upsert(newMetas, {
          onConflict:
            "team_id,super_union_id,club_id,week_year,week_number,day_of_week,hour_start,hour_end,target_type",
        })
        .select();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to inherit metas from previous week",
        });
      }

      return { count: data?.length ?? 0 };
    }),
});
