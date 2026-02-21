import {
  createImportInput,
  deleteImportInput,
  getImportByIdInput,
  listImportsInput,
  processImportInput,
} from "@api/schemas/su/imports";
import { createAdminClient } from "@api/services/supabase";
import { logger } from "@midpoker/logger";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const suImportsRouter = createTRPCRouter({
  /**
   * List all imports for the team
   */
  list: protectedProcedure
    .input(listImportsInput)
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
          message: "Erro ao buscar importacoes",
        });
      }

      return data ?? [];
    }),

  /**
   * Get a specific import by ID
   */
  getById: protectedProcedure
    .input(getImportByIdInput)
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
          message: "Importacao nao encontrada",
        });
      }

      return data;
    }),

  /**
   * Create a new import record
   */
  create: protectedProcedure
    .input(createImportInput)
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
            message: "Erro ao criar periodo semanal",
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
          message: "Erro ao criar importacao",
        });
      }

      return data;
    }),

  /**
   * Process an import - insert data into database
   */
  process: protectedProcedure
    .input(processImportInput)
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
          message: "Importacao nao encontrada",
        });
      }

      if (importRecord.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Importacao ja foi processada",
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

        // Helper to split array into chunks for batch operations
        const chunkArray = <T>(array: T[], size: number): T[][] => {
          const chunks: T[][] = [];
          for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
          }
          return chunks;
        };

        const BATCH_SIZE = 500; // Supabase recommends max 1000, using 500 for safety

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

        // Process Jogos PPST - create games and game players (with batching)
        if (jogosPPST && jogosPPST.length > 0) {
          // Phase 1: Collect all games to insert
          const gamesToInsert: any[] = [];
          const gameMetadataMap = new Map<string, any>(); // game_id -> {metadata, jogadores}

          for (const jogo of jogosPPST) {
            totalGamesPPST++;
            const metadata = jogo.metadata ?? {};
            const jogadores = jogo.jogadores ?? [];
            totalPlayersPPST += jogadores.length;

            // Store for later use
            gameMetadataMap.set(metadata.idJogo, { metadata, jogadores });

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

            gamesToInsert.push({
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
            });
          }

          // Phase 2: Batch insert games
          for (const batch of chunkArray(gamesToInsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_su_games")
              .upsert(batch, { onConflict: "team_id,game_type,game_id" });

            if (error) {
              logger.error({ error }, "Failed to insert PPST games batch");
            }
          }

          // Phase 3: Fetch inserted game IDs (map game_id -> id)
          const gameIdMap = new Map<string, string>();
          const gameIds = Array.from(gameMetadataMap.keys());

          for (const batch of chunkArray(gameIds, 1000)) {
            const { data: games } = await supabase
              .from("poker_su_games")
              .select("id, game_id")
              .eq("team_id", teamId)
              .eq("game_type", "ppst")
              .in("game_id", batch);

            if (games) {
              for (const game of games) {
                gameIdMap.set(game.game_id, game.id);
              }
            }
          }

          // Phase 4: Collect all game players
          const gamePlayersToInsert: any[] = [];

          for (const [externalGameId, data] of gameMetadataMap) {
            const dbGameId = gameIdMap.get(externalGameId);
            if (!dbGameId) {
              logger.error(
                { externalGameId },
                "Game ID not found for external ID",
              );
              continue;
            }

            const { jogadores } = data;
            for (const j of jogadores) {
              gamePlayersToInsert.push({
                team_id: teamId,
                game_id: dbGameId,
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
              });
            }
          }

          // Phase 5: Batch insert game players
          for (const batch of chunkArray(gamePlayersToInsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_su_game_players")
              .upsert(batch, { onConflict: "game_id,jogador_id" });

            if (error) {
              logger.error(
                { error },
                "Failed to insert PPST game players batch",
              );
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

        // Process Jogos PPSR (Cash Games) - with batching
        if (jogosPPSR && jogosPPSR.length > 0) {
          // Phase 1: Collect all games to insert
          const gamesPPSRToInsert: any[] = [];
          const gamePPSRMetadataMap = new Map<string, any>(); // game_id -> {metadata, jogadores}

          for (const jogo of jogosPPSR) {
            totalGamesPPSR++;
            const metadata = jogo.metadata ?? {};
            const jogadores = jogo.jogadores ?? [];
            totalPlayersPPSR += jogadores.length;

            // Store for later use
            gamePPSRMetadataMap.set(metadata.idJogo, { metadata, jogadores });

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

            gamesPPSRToInsert.push({
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
            });
          }

          // Phase 2: Batch insert games
          for (const batch of chunkArray(gamesPPSRToInsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_su_games")
              .upsert(batch, { onConflict: "team_id,game_type,game_id" });

            if (error) {
              logger.error({ error }, "Failed to insert PPSR games batch");
            }
          }

          // Phase 3: Fetch inserted game IDs (map game_id -> id)
          const gamePPSRIdMap = new Map<string, string>();
          const gamePPSRIds = Array.from(gamePPSRMetadataMap.keys());

          for (const batch of chunkArray(gamePPSRIds, 1000)) {
            const { data: games } = await supabase
              .from("poker_su_games")
              .select("id, game_id")
              .eq("team_id", teamId)
              .eq("game_type", "ppsr")
              .in("game_id", batch);

            if (games) {
              for (const game of games) {
                gamePPSRIdMap.set(game.game_id, game.id);
              }
            }
          }

          // Phase 4: Collect all game players
          const gamePlayersPPSRToInsert: any[] = [];

          for (const [externalGameId, data] of gamePPSRMetadataMap) {
            const dbGameId = gamePPSRIdMap.get(externalGameId);
            if (!dbGameId) {
              logger.error(
                { externalGameId },
                "PPSR Game ID not found for external ID",
              );
              continue;
            }

            const { jogadores } = data;
            for (const j of jogadores) {
              gamePlayersPPSRToInsert.push({
                team_id: teamId,
                game_id: dbGameId,
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
              });
            }
          }

          // Phase 5: Batch insert game players
          for (const batch of chunkArray(gamePlayersPPSRToInsert, BATCH_SIZE)) {
            const { error } = await supabase
              .from("poker_su_game_players")
              .upsert(batch, { onConflict: "game_id,jogador_id" });

            if (error) {
              logger.error(
                { error },
                "Failed to insert PPSR game players batch",
              );
            }
          }
        }

        // Update import with stats and mark as completed
        // IMPORTANT: committed = false means data is processed but not yet finalized
        // It will only appear in "current week" view until week is closed
        await supabase
          .from("poker_su_imports")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            processed_by_id: userId,
            committed: false, // Mark as uncommitted - will be committed when week closes
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
          message: `Erro ao processar importacao: ${error}`,
        });
      }
    }),

  /**
   * Delete an import and its associated data
   */
  delete: protectedProcedure
    .input(deleteImportInput)
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
          message: "Importacao nao encontrada",
        });
      }

      // Delete associated data (need to delete game_players first due to FK constraints)
      // Step 1: Get all game IDs for this import
      const { data: games } = await supabase
        .from("poker_su_games")
        .select("id")
        .eq("import_id", input.id);

      const gameIds = games?.map((g) => g.id) ?? [];

      // Step 2: Delete game players for these games
      if (gameIds.length > 0) {
        await supabase
          .from("poker_su_game_players")
          .delete()
          .in("game_id", gameIds);
      }

      // Step 3: Delete league summaries
      await supabase
        .from("poker_su_league_summary")
        .delete()
        .eq("import_id", input.id);

      // Step 4: Delete games
      await supabase.from("poker_su_games").delete().eq("import_id", input.id);

      // Delete the import
      const { error: deleteError } = await supabase
        .from("poker_su_imports")
        .delete()
        .eq("id", input.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao excluir importacao",
        });
      }

      // Clean up orphaned week period if no other imports reference it
      if (importRecord.week_period_id) {
        const { count } = await supabase
          .from("poker_su_imports")
          .select("id", { count: "exact", head: true })
          .eq("week_period_id", importRecord.week_period_id);

        if (count === 0) {
          await supabase
            .from("poker_su_week_periods")
            .delete()
            .eq("id", importRecord.week_period_id);
        }
      }

      return { success: true };
    }),
});
