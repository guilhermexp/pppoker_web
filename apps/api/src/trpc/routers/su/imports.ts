import { createAdminClient } from "@api/services/supabase";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

const createImportSchema = z.object({
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

const processImportSchema = z.object({
  importId: z.string().uuid(),
  data: z.object({
    geralPPST: z.array(z.any()).optional(),
    jogosPPST: z.array(z.any()).optional(),
    geralPPSR: z.array(z.any()).optional(),
    jogosPPSR: z.array(z.any()).optional(),
  }),
});

export const suImportsRouter = createTRPCRouter({
  /**
   * List all imports for the team
   */
  list: protectedProcedure
    .input(
      z
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
        .optional(),
    )
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      let query = supabase
        .from("poker_su_imports")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (input?.status) {
        query = query.eq("status", input.status);
      }

      if (input?.limit) {
        query = query.limit(input.limit);
      }

      if (input?.offset) {
        query = query.range(
          input.offset,
          input.offset + (input.limit ?? 10) - 1,
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch imports",
        });
      }

      return data ?? [];
    }),

  /**
   * Get a specific import by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      const { data, error } = await supabase
        .from("poker_su_imports")
        .select("*")
        .eq("team_id", teamId)
        .eq("id", input.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Import not found",
        });
      }

      return data;
    }),

  /**
   * Create a new import record
   */
  create: protectedProcedure
    .input(createImportSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Check/create week period for this import
      const { data: existingPeriod } = await supabase
        .from("poker_su_week_periods")
        .select("id")
        .eq("team_id", teamId)
        .eq("week_start", input.periodStart)
        .single();

      let weekPeriodId = existingPeriod?.id;

      if (!weekPeriodId) {
        const { data: newPeriod, error: periodError } = await supabase
          .from("poker_su_week_periods")
          .insert({
            team_id: teamId,
            week_start: input.periodStart,
            week_end: input.periodEnd,
            timezone: input.timezone ?? "UTC -0500",
            status: "open",
          })
          .select()
          .single();

        if (periodError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create week period",
          });
        }

        weekPeriodId = newPeriod.id;
      }

      // Create import record
      const { data, error } = await supabase
        .from("poker_su_imports")
        .insert({
          team_id: teamId,
          file_name: input.fileName,
          file_size: input.fileSize,
          file_type: input.fileType,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          timezone: input.timezone,
          week_period_id: weekPeriodId,
          status: "validated",
          validation_passed: input.validationPassed ?? true,
          validation_errors: input.validationErrors,
          validation_warnings: input.validationWarnings,
          quality_score: input.qualityScore ?? 100,
          raw_data: input.rawData,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create import",
        });
      }

      return data;
    }),

  /**
   * Process an import - insert data into database
   */
  process: protectedProcedure
    .input(processImportSchema)
    .mutation(async ({ input, ctx: { teamId, session } }) => {
      const userId = session?.user?.id;
      const supabase = await createAdminClient();

      // Get the import
      const { data: importRecord, error: importError } = await supabase
        .from("poker_su_imports")
        .select("*")
        .eq("team_id", teamId)
        .eq("id", input.importId)
        .single();

      if (importError || !importRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Import not found",
        });
      }

      if (importRecord.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Import already processed",
        });
      }

      // Update status to processing
      await supabase
        .from("poker_su_imports")
        .update({ status: "processing" })
        .eq("id", input.importId);

      try {
        const { geralPPST, jogosPPST, geralPPSR, jogosPPSR } = input.data;

        let totalLeagues = 0;
        let totalGamesPPST = 0;
        let totalGamesPPSR = 0;
        let totalPlayersPPST = 0;
        let totalPlayersPPSR = 0;

        // Process Geral PPST - create league summaries
        if (geralPPST && geralPPST.length > 0) {
          for (const bloco of geralPPST) {
            const ligas = bloco.ligas ?? [];
            totalLeagues += ligas.length;

            for (const liga of ligas) {
              // Upsert league
              const { data: suLeague } = await supabase
                .from("poker_su_leagues")
                .upsert(
                  {
                    team_id: teamId,
                    liga_id: liga.ligaId,
                    liga_nome: liga.ligaNome,
                    super_union_id: liga.superUnionId ?? null,
                    taxa_cambio: bloco.contexto?.taxaCambio ?? null,
                  },
                  { onConflict: "team_id,liga_id" },
                )
                .select()
                .single();

              // Insert league summary
              await supabase.from("poker_su_league_summary").upsert(
                {
                  team_id: teamId,
                  period_start: importRecord.period_start,
                  period_end: importRecord.period_end,
                  import_id: input.importId,
                  week_period_id: importRecord.week_period_id,
                  su_league_id: suLeague?.id ?? null,
                  liga_id: liga.ligaId,
                  liga_nome: liga.ligaNome,
                  super_union_id: liga.superUnionId ?? null,
                  taxa_cambio: bloco.contexto?.taxaCambio ?? null,
                  ppst_ganhos_jogador: liga.ganhosJogador ?? 0,
                  ppst_valor_ticket_ganho: liga.valorTicketGanho ?? 0,
                  ppst_buyin_ticket: liga.buyinTicket ?? 0,
                  ppst_valor_premio_personalizado:
                    liga.valorPremioPersonalizado ?? 0,
                  ppst_ganhos_liga_geral: liga.ganhosLigaGeral ?? 0,
                  ppst_ganhos_liga_taxa: liga.ganhosLigaTaxa ?? 0,
                  ppst_buyin_spinup: liga.buyinSpinup ?? 0,
                  ppst_premiacao_spinup: liga.premiacaoSpinup ?? 0,
                  ppst_valor_ticket_entregue: liga.valorTicketEntregue ?? 0,
                  ppst_buyin_ticket_liga: liga.buyinTicketLiga ?? 0,
                  ppst_gap_garantido: liga.gapGarantido ?? 0,
                },
                {
                  onConflict: "team_id,liga_id,period_start,period_end",
                },
              );
            }
          }
        }

        // Process Jogos PPST - create games and game players
        if (jogosPPST && jogosPPST.length > 0) {
          for (const jogo of jogosPPST) {
            totalGamesPPST++;
            const metadata = jogo.metadata ?? {};
            const jogadores = jogo.jogadores ?? [];
            totalPlayersPPST += jogadores.length;

            // Determine game variant
            let gameVariant = "nlh";
            const tipoJogo = metadata.tipoJogo?.toLowerCase() ?? "";
            if (tipoJogo.includes("spinup")) gameVariant = "spinup";
            else if (tipoJogo.includes("pko")) gameVariant = "pko";
            else if (tipoJogo.includes("mko")) gameVariant = "mko";
            else if (tipoJogo.includes("plo5")) gameVariant = "plo5";
            else if (tipoJogo.includes("plo4")) gameVariant = "plo4";
            else if (tipoJogo.includes("ofc")) gameVariant = "ofc";
            else if (tipoJogo.includes("short")) gameVariant = "short";
            else if (tipoJogo.includes("6+")) gameVariant = "6plus";

            // Calculate totals
            const totalBuyin = jogadores.reduce(
              (sum: number, j: any) =>
                sum + (j.buyinFichas ?? 0) + (j.buyinTicket ?? 0),
              0,
            );
            const totalGanhosJogador = jogadores.reduce(
              (sum: number, j: any) => sum + (j.ganhos ?? 0),
              0,
            );
            const totalTaxa = jogadores.reduce(
              (sum: number, j: any) => sum + (j.taxa ?? 0),
              0,
            );
            const totalGapGarantido = jogadores.reduce(
              (sum: number, j: any) => sum + (j.gapGarantido ?? 0),
              0,
            );
            const totalRecompensa = jogadores.reduce(
              (sum: number, j: any) => sum + (j.recompensa ?? 0),
              0,
            );

            // Insert game
            const { data: gameRecord, error: gameError } = await supabase
              .from("poker_su_games")
              .upsert(
                {
                  team_id: teamId,
                  import_id: input.importId,
                  week_period_id: importRecord.week_period_id,
                  game_type: "ppst",
                  game_variant: gameVariant,
                  game_id: metadata.idJogo,
                  table_name: metadata.nomeMesa,
                  started_at: `${metadata.dataInicio}T${metadata.horaInicio ?? "00:00"}:00`,
                  ended_at: metadata.dataFim
                    ? `${metadata.dataFim}T${metadata.horaFim ?? "23:59"}:00`
                    : null,
                  creator_id: metadata.criadorId,
                  creator_name: metadata.criadorNome,
                  buyin_base: metadata.buyInBase ?? 0,
                  buyin_bounty: metadata.buyInBounty ?? 0,
                  buyin_taxa: metadata.buyInTaxa ?? 0,
                  premiacao_garantida: metadata.premiacaoGarantida ?? 0,
                  is_satellite: metadata.subtipo === "satellite",
                  player_count: jogadores.length,
                  total_buyin: totalBuyin,
                  total_ganhos_jogador: totalGanhosJogador,
                  total_taxa: totalTaxa,
                  total_gap_garantido: totalGapGarantido,
                  total_recompensa: totalRecompensa,
                },
                { onConflict: "team_id,game_type,game_id" },
              )
              .select()
              .single();

            if (gameError || !gameRecord) {
              console.error("Failed to insert game:", gameError);
              continue;
            }

            // Insert game players
            const gamePlayers = jogadores.map((j: any) => ({
              team_id: teamId,
              game_id: gameRecord.id,
              super_union_id: j.superUnionId ?? null,
              liga_id: j.ligaId,
              clube_id: j.clubeId,
              clube_nome: j.clubeNome,
              jogador_id: j.jogadorId,
              apelido: j.apelido,
              nome_memorado: j.nomeMemorado,
              ranking: j.ranking ?? null,
              buyin_fichas: j.buyinFichas ?? 0,
              buyin_ticket: j.buyinTicket ?? 0,
              ganhos: j.ganhos ?? 0,
              taxa: j.taxa ?? 0,
              gap_garantido: j.gapGarantido ?? 0,
              premio: j.premio ?? 0,
              recompensa: j.recompensa ?? 0,
              nome_ticket: j.nomeTicket ?? null,
              valor_ticket: j.valorTicket ?? 0,
            }));

            if (gamePlayers.length > 0) {
              await supabase.from("poker_su_game_players").upsert(gamePlayers, {
                onConflict: "game_id,jogador_id",
              });
            }
          }
        }

        // Process Geral PPSR
        if (geralPPSR && geralPPSR.length > 0) {
          for (const bloco of geralPPSR) {
            const ligas = bloco.ligas ?? [];

            for (const liga of ligas) {
              // Upsert league first (in case PPST didn't create it)
              const { data: suLeague } = await supabase
                .from("poker_su_leagues")
                .upsert(
                  {
                    team_id: teamId,
                    liga_id: liga.ligaId,
                    liga_nome: liga.ligaNome,
                    super_union_id: liga.superUnionId ?? null,
                    taxa_cambio: bloco.contexto?.taxaCambio ?? null,
                  },
                  { onConflict: "team_id,liga_id" },
                )
                .select()
                .single();

              // Check if summary exists from PPST
              const { data: existingSummary } = await supabase
                .from("poker_su_league_summary")
                .select("id")
                .eq("team_id", teamId)
                .eq("liga_id", liga.ligaId)
                .eq("period_start", importRecord.period_start)
                .eq("period_end", importRecord.period_end)
                .single();

              if (existingSummary) {
                // Update existing record with PPSR data
                await supabase
                  .from("poker_su_league_summary")
                  .update({
                    ppsr_ganhos_jogador: liga.ganhosJogadorGeral ?? 0,
                    ppsr_ganhos_liga_geral: liga.ganhosLigaGeral ?? 0,
                    ppsr_ganhos_liga_taxa: liga.ganhosLigaTaxa ?? 0,
                    ppsr_rake_total:
                      (liga.ganhosLigaTaxa ?? 0) +
                      (liga.ganhosLigaTaxaJackpot ?? 0),
                  })
                  .eq("id", existingSummary.id);
              } else {
                // Create new record for PPSR-only data
                await supabase.from("poker_su_league_summary").insert({
                  team_id: teamId,
                  period_start: importRecord.period_start,
                  period_end: importRecord.period_end,
                  import_id: input.importId,
                  week_period_id: importRecord.week_period_id,
                  su_league_id: suLeague?.id ?? null,
                  liga_id: liga.ligaId,
                  liga_nome: liga.ligaNome,
                  super_union_id: liga.superUnionId ?? null,
                  taxa_cambio: bloco.contexto?.taxaCambio ?? null,
                  // PPSR values
                  ppsr_ganhos_jogador: liga.ganhosJogadorGeral ?? 0,
                  ppsr_ganhos_liga_geral: liga.ganhosLigaGeral ?? 0,
                  ppsr_ganhos_liga_taxa: liga.ganhosLigaTaxa ?? 0,
                  ppsr_rake_total:
                    (liga.ganhosLigaTaxa ?? 0) +
                    (liga.ganhosLigaTaxaJackpot ?? 0),
                });
              }
            }
          }
        }

        // Process Jogos PPSR (Cash Games)
        if (jogosPPSR && jogosPPSR.length > 0) {
          for (const jogo of jogosPPSR) {
            totalGamesPPSR++;
            const metadata = jogo.metadata ?? {};
            const jogadores = jogo.jogadores ?? [];
            totalPlayersPPSR += jogadores.length;

            // Determine game variant from tipoCash
            let gameVariant = "nlh";
            const tipoCash = metadata.tipoCash?.toUpperCase() ?? "";
            if (tipoCash.includes("PLO5")) gameVariant = "plo5";
            else if (tipoCash.includes("PLO6")) gameVariant = "plo6";
            else if (tipoCash.includes("PLO")) gameVariant = "plo4";
            else if (tipoCash.includes("OFC")) gameVariant = "ofc";
            else if (tipoCash.includes("6+") || tipoCash.includes("SHORT"))
              gameVariant = "short";

            // Calculate totals
            const totalBuyin = jogadores.reduce(
              (sum: number, j: any) => sum + (j.buyinFichas ?? 0),
              0,
            );
            const totalGanhosJogador = jogadores.reduce(
              (sum: number, j: any) => sum + (j.ganhosJogadorGeral ?? 0),
              0,
            );
            const totalTaxa = jogadores.reduce(
              (sum: number, j: any) => sum + (j.taxa ?? 0),
              0,
            );

            // Insert game
            const { data: gameRecord, error: gameError } = await supabase
              .from("poker_su_games")
              .upsert(
                {
                  team_id: teamId,
                  import_id: input.importId,
                  week_period_id: importRecord.week_period_id,
                  game_type: "ppsr",
                  game_variant: gameVariant,
                  game_id: metadata.idJogo,
                  table_name: metadata.nomeMesa,
                  started_at: `${metadata.dataInicio}T${metadata.horaInicio ?? "00:00"}:00`,
                  ended_at: metadata.dataFim
                    ? `${metadata.dataFim}T${metadata.horaFim ?? "23:59"}:00`
                    : null,
                  creator_id: metadata.criadorId,
                  creator_name: metadata.criadorNome,
                  // PPSR-specific fields
                  blinds: metadata.blinds,
                  min_buyin: metadata.smallBlind ?? 0,
                  max_buyin: metadata.bigBlind ?? 0,
                  // Aggregated stats
                  player_count: jogadores.length,
                  total_buyin: totalBuyin,
                  total_ganhos_jogador: totalGanhosJogador,
                  total_taxa: totalTaxa,
                },
                { onConflict: "team_id,game_type,game_id" },
              )
              .select()
              .single();

            if (gameError || !gameRecord) {
              console.error("Failed to insert PPSR game:", gameError);
              continue;
            }

            // Insert game players
            const gamePlayers = jogadores.map((j: any) => ({
              team_id: teamId,
              game_id: gameRecord.id,
              super_union_id: j.superUnionId ?? null,
              liga_id: j.ligaId,
              clube_id: j.clubeId,
              clube_nome: j.clubeNome,
              jogador_id: j.jogadorId,
              apelido: j.apelido,
              nome_memorado: j.nomeMemorado,
              buyin_fichas: j.buyinFichas ?? 0,
              ganhos: j.ganhosJogadorGeral ?? 0,
              taxa: j.taxa ?? 0,
              // PPSR-specific fields
              hands_played: j.maos ?? 0,
              rake_paid: j.taxa ?? 0,
            }));

            if (gamePlayers.length > 0) {
              await supabase.from("poker_su_game_players").upsert(gamePlayers, {
                onConflict: "game_id,jogador_id",
              });
            }
          }
        }

        // Update import with stats and mark as completed
        await supabase
          .from("poker_su_imports")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            processed_by_id: userId,
            total_leagues: totalLeagues,
            total_games_ppst: totalGamesPPST,
            total_games_ppsr: totalGamesPPSR,
            total_players_ppst: totalPlayersPPST,
            total_players_ppsr: totalPlayersPPSR,
          })
          .eq("id", input.importId);

        return {
          success: true,
          stats: {
            totalLeagues,
            totalGamesPPST,
            totalGamesPPSR,
            totalPlayersPPST,
            totalPlayersPPSR,
          },
        };
      } catch (error) {
        // Mark import as failed
        await supabase
          .from("poker_su_imports")
          .update({
            status: "failed",
            processing_errors: { message: String(error) },
          })
          .eq("id", input.importId);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to process import: ${error}`,
        });
      }
    }),

  /**
   * Delete an import and its associated data
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();

      // Get the import
      const { data: importRecord, error: importError } = await supabase
        .from("poker_su_imports")
        .select("week_period_id")
        .eq("team_id", teamId)
        .eq("id", input.id)
        .single();

      if (importError || !importRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Import not found",
        });
      }

      // Delete associated data (cascades will handle most)
      await supabase
        .from("poker_su_league_summary")
        .delete()
        .eq("import_id", input.id);

      await supabase.from("poker_su_games").delete().eq("import_id", input.id);

      // Delete the import
      const { error: deleteError } = await supabase
        .from("poker_su_imports")
        .delete()
        .eq("id", input.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete import",
        });
      }

      return { success: true };
    }),
});
