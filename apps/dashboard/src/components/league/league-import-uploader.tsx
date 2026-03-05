"use client";

import type {
  LeagueValidationResult,
  ParsedLeagueCashMetadata,
  ParsedLeagueGeralPPSRBloco,
  ParsedLeagueGeralPPSRLiga,
  ParsedLeagueGeralPPST,
  ParsedLeagueGeralPPSTBloco,
  ParsedLeagueImportData,
  ParsedLeagueJogadorPPSR,
  ParsedLeagueJogadorPPST,
  ParsedLeagueJogoMetadata,
  ParsedLeagueJogoPPSR,
  ParsedLeagueJogoPPST,
  ParsedLeagueTotalGeral,
  ParsedLeagueTotalGeralPPSR,
  ParsedLeagueTotalLiga,
  ParsedLeagueTotalLigaPPSR,
} from "@/lib/league/types";
import { validateLeagueImportData } from "@/lib/league/validation";
import { parseSlashValue, toNumber } from "@/lib/poker/parsers";
import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import type * as XLSX from "xlsx";
import { SUImportsList } from "../su/su-imports-list";
import { LeagueImportValidationModal } from "./league-import-validation-modal";

let xlsxModule: typeof XLSX | null = null;

function getXlsx() {
  if (!xlsxModule) {
    throw new Error("XLSX module not loaded");
  }
  return xlsxModule;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// toNumber and parseSlashValue imported from @/lib/poker/parsers

function normalizeSheetName(name: string): string {
  return name.toLowerCase().trim();
}

// ============================================================================
// PARSER: GERAL DO PPST
// ============================================================================

function parseGeralPPSTSheet(sheet: XLSX.WorkSheet): {
  blocos: ParsedLeagueGeralPPSTBloco[];
  periodStart: string | null;
  periodEnd: string | null;
} {
  // Convert sheet to array of arrays (raw data)
  // Use raw: true to get numeric values from formula cells with cached results
  const rows: any[][] = getXlsx().utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true, // Get raw numeric values (important for formula cells)
    blankrows: false,
  });

  const blocos: ParsedLeagueGeralPPSTBloco[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  let currentBloco: ParsedLeagueGeralPPSTBloco | null = null;
  let currentPeriodo: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const cellA = String(row[0] || "").trim();
    const cellB = String(row[1] || "").trim();
    const cellC = String(row[2] || "").trim();

    // Skip disclaimer line
    if (cellA.toLowerCase().includes("esta planilha é feita pelo pppoker")) {
      continue;
    }

    // Detect context line (yellow line): "Liga 1765 Taxa de câmbio das fichas 1:5"
    // or "SuperUnion 561 Taxa de câmbio das fichas 1:40"
    if (cellA.toLowerCase().includes("taxa de câmbio")) {
      const match = cellA.match(
        /(Liga|SuperUnion)\s+(\d+)\s+Taxa de câmbio das fichas\s+(\d+:\d+)/i,
      );
      if (match) {
        // Save previous bloco if exists
        if (currentBloco && currentBloco.ligas.length > 0) {
          blocos.push(currentBloco);
        }

        currentBloco = {
          contexto: {
            entidadeTipo: match[1] as "Liga" | "SuperUnion",
            entidadeId: Number.parseInt(match[2]),
            taxaCambio: match[3],
          },
          periodo: {
            dataInicio: "",
            dataFim: "",
            timezone: "UTC -0500",
          },
          ligas: [],
          total: {
            ganhosJogador: 0,
            valorTicketGanho: 0,
            buyinTicket: 0,
            valorPremioPersonalizado: 0,
            ganhosLigaGeral: 0,
            ganhosLigaTaxa: 0,
            buyinSpinup: 0,
            premiacaoSpinup: 0,
            valorTicketEntregue: 0,
            buyinTicketLiga: 0,
            gapGarantido: 0,
          },
        };
        continue;
      }
    }

    // Detect period in column A: "2025/12/08 - 2025/12/08 UTC -0500"
    const periodoMatch = cellA.match(
      /(\d{4}\/\d{2}\/\d{2})\s*-\s*(\d{4}\/\d{2}\/\d{2})/,
    );
    if (periodoMatch) {
      currentPeriodo = cellA;
      const startDate = periodoMatch[1].replace(/\//g, "-");
      const endDate = periodoMatch[2].replace(/\//g, "-");

      if (!periodStart) periodStart = startDate;
      periodEnd = endDate;

      if (currentBloco) {
        currentBloco.periodo.dataInicio = startDate;
        currentBloco.periodo.dataFim = endDate;
      }
      continue;
    }

    // Skip header rows (contain text like "ID da SuperUnion", "Nome da Liga", etc.)
    if (
      cellA.toLowerCase().includes("superunion") ||
      cellB.toLowerCase().includes("nome da liga") ||
      cellB.toLowerCase().includes("ganhos")
    ) {
      continue;
    }

    // Detect "Total" line - skip it, we'll calculate totals from liga data
    // "Total" appears in column B (Nome da Liga column)
    if (cellB.toLowerCase() === "total") {
      continue;
    }

    // Parse data row (liga data)
    // Column mapping (0-indexed) - Note: column 0 may be empty/period for data rows
    // [0]=empty/period, [1]=suId, [2]=ligaNome, [3]=ligaId, [4]=ganhosJogador, [5]=ticketGanho,
    // [6]=buyinTicket, [7]=premioPersonalizado, [8]=geral, [9]=taxa,
    // [10]=buyinSpin, [11]=premioSpin, [12]=ticketEntregue, [13]=buyinTicketLiga, [14]=gap
    const ligaId = parseSlashValue(row[3]);
    if (ligaId && !Number.isNaN(ligaId) && currentBloco) {
      // Capture gapGarantido from the FIRST row of the block (merged cell only has value in first cell)
      if (currentBloco.ligas.length === 0) {
        const gapValue = toNumber(row[14]);
        if (gapValue !== 0) {
          currentBloco.total.gapGarantido = gapValue;
        }
      }

      // Parse individual values first
      const ganhosLigaTaxa = toNumber(row[9]);
      const buyinSpinup = toNumber(row[10]);
      const premiacaoSpinup = toNumber(row[11]);
      const valorTicketEntregue = toNumber(row[12]);
      const buyinTicketLiga = toNumber(row[13]);
      let ganhosLigaGeral = toNumber(row[8]);

      // If ganhosLigaGeral is 0 but sub-columns have values, calculate it
      // This handles the case where Excel formula cells weren't cached
      // Formula: Geral = Taxa + Buy-in SPIN + Prêmio SPIN + Ticket Entreg. + Buy-in Ticket
      // (Note: premiacaoSpinup and buyinTicketLiga already have correct sign from Excel)
      if (ganhosLigaGeral === 0) {
        const hasSubValues =
          ganhosLigaTaxa !== 0 ||
          buyinSpinup !== 0 ||
          premiacaoSpinup !== 0 ||
          valorTicketEntregue !== 0 ||
          buyinTicketLiga !== 0;
        if (hasSubValues) {
          ganhosLigaGeral =
            ganhosLigaTaxa +
            buyinSpinup +
            premiacaoSpinup +
            valorTicketEntregue +
            buyinTicketLiga;
        }
      }

      const liga: ParsedLeagueGeralPPST = {
        periodo: currentPeriodo,
        superUnionId: parseSlashValue(row[1]),
        ligaNome: String(row[2] || "").trim(),
        ligaId: ligaId,
        ganhosJogador: toNumber(row[4]),
        valorTicketGanho: toNumber(row[5]),
        buyinTicket: toNumber(row[6]),
        valorPremioPersonalizado: toNumber(row[7]),
        ganhosLigaGeral,
        ganhosLigaTaxa,
        buyinSpinup,
        premiacaoSpinup,
        valorTicketEntregue,
        buyinTicketLiga,
        gapGarantido: null,
      };
      currentBloco.ligas.push(liga);
    }
  }

  // Don't forget the last bloco
  if (currentBloco && currentBloco.ligas.length > 0) {
    blocos.push(currentBloco);
  }

  // Calculate totals from liga data (since Excel formulas may not be read correctly)
  for (const bloco of blocos) {
    const savedGap = bloco.total.gapGarantido; // Preserve gap from merged cell
    bloco.total = {
      ganhosJogador: bloco.ligas.reduce((sum, l) => sum + l.ganhosJogador, 0),
      valorTicketGanho: bloco.ligas.reduce(
        (sum, l) => sum + l.valorTicketGanho,
        0,
      ),
      buyinTicket: bloco.ligas.reduce((sum, l) => sum + l.buyinTicket, 0),
      valorPremioPersonalizado: bloco.ligas.reduce(
        (sum, l) => sum + l.valorPremioPersonalizado,
        0,
      ),
      ganhosLigaGeral: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosLigaGeral,
        0,
      ),
      ganhosLigaTaxa: bloco.ligas.reduce((sum, l) => sum + l.ganhosLigaTaxa, 0),
      buyinSpinup: bloco.ligas.reduce((sum, l) => sum + l.buyinSpinup, 0),
      premiacaoSpinup: bloco.ligas.reduce(
        (sum, l) => sum + l.premiacaoSpinup,
        0,
      ),
      valorTicketEntregue: bloco.ligas.reduce(
        (sum, l) => sum + l.valorTicketEntregue,
        0,
      ),
      buyinTicketLiga: bloco.ligas.reduce(
        (sum, l) => sum + l.buyinTicketLiga,
        0,
      ),
      gapGarantido: savedGap, // Keep the gap from merged cell
    };
  }

  return { blocos, periodStart, periodEnd };
}

// ============================================================================
// PARSER: GERAL DO PPSR (Cash Games)
// ============================================================================

function parseGeralPPSRSheet(sheet: XLSX.WorkSheet): {
  blocos: ParsedLeagueGeralPPSRBloco[];
  periodStart: string | null;
  periodEnd: string | null;
} {
  // Convert sheet to array of arrays (raw data)
  const rows: any[][] = getXlsx().utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true, // Get raw numeric values (important for formula cells)
    blankrows: false,
  });

  const blocos: ParsedLeagueGeralPPSRBloco[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  let currentBloco: ParsedLeagueGeralPPSRBloco | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const cellA = String(row[0] || "").trim();
    const cellB = String(row[1] || "").trim();
    const cellC = String(row[2] || "").trim();

    // Skip disclaimer line
    if (cellA.toLowerCase().includes("esta planilha é feita pelo pppoker")) {
      continue;
    }

    // Detect context line (yellow line): "Liga 1765 Taxa de câmbio das fichas 1:5"
    // or "SuperUnion 561 Taxa de câmbio das fichas 1:0"
    // Check in cellA or cellB (might be merged differently)
    const contextText =
      cellA.toLowerCase().includes("taxa") &&
      cellA.toLowerCase().includes("câmbio")
        ? cellA
        : cellB.toLowerCase().includes("taxa") &&
            cellB.toLowerCase().includes("câmbio")
          ? cellB
          : null;
    if (contextText) {
      // Use flexible regex with \s+ between all words
      const match = contextText.match(
        /(Liga|SuperUnion)\s+(\d+)\s+Taxa\s+de\s+câmbio\s+das\s+fichas\s+(\d+:\d+)/i,
      );
      if (match) {
        // Save previous bloco if exists
        if (currentBloco && currentBloco.ligas.length > 0) {
          blocos.push(currentBloco);
        }

        currentBloco = {
          contexto: {
            entidadeTipo: match[1] as "Liga" | "SuperUnion",
            entidadeId: Number.parseInt(match[2]),
            taxaCambio: match[3],
          },
          periodo: {
            dataInicio: "",
            dataFim: "",
            timezone: "UTC -0500",
          },
          ligas: [],
          total: {
            ganhosJogadorGeral: 0,
            ganhosJogadorDeAdversarios: 0,
            ganhosJogadorDeJackpot: 0,
            ganhosJogadorDeDividirEV: 0,
            ganhosLigaGeral: 0,
            ganhosLigaTaxa: 0,
            ganhosLigaTaxaJackpot: 0,
            ganhosLigaPremioJackpot: 0,
            ganhosLigaDividirEV: 0,
          },
        };
        continue;
      }
    }

    // Detect period in column A: "2025/12/08 - 2025/12/08 UTC -0500"
    const periodoMatch = cellA.match(
      /(\d{4}\/\d{2}\/\d{2})\s*-\s*(\d{4}\/\d{2}\/\d{2})/,
    );
    if (periodoMatch) {
      const startDate = periodoMatch[1].replace(/\//g, "-");
      const endDate = periodoMatch[2].replace(/\//g, "-");

      if (!periodStart) periodStart = startDate;
      periodEnd = endDate;

      if (currentBloco) {
        currentBloco.periodo.dataInicio = startDate;
        currentBloco.periodo.dataFim = endDate;
      }
      continue;
    }

    // Skip header rows (contain text like "ID da SuperUnion", "Nome da Liga", etc.)
    // Check all cells for header content
    const rowText = row
      .map((c: any) => String(c || "").toLowerCase())
      .join(" ");
    if (
      cellA.toLowerCase().includes("superunion") ||
      cellB.toLowerCase().includes("nome da liga") ||
      cellC.toLowerCase().includes("id da liga") ||
      rowText.includes("ganhos do jogador") ||
      rowText.includes("ganhos da liga") ||
      rowText.includes("de adversários") ||
      rowText.includes("de jackpot") ||
      rowText.includes("dividir ev") ||
      rowText.includes("classificação")
    ) {
      continue;
    }

    // Detect "Total" line - skip it, we'll calculate totals from liga data
    if (cellB.toLowerCase() === "total" || cellA.toLowerCase() === "total") {
      continue;
    }

    // Parse data row (liga data)
    // Column mapping for PPSR (note: column 0 is empty for data rows, actual data starts at index 1):
    // [0]=empty, [1]=superUnionId, [2]=ligaNome, [3]=ligaId, [4]=classificacaoPPSR,
    // [5]=ganhosJogadorGeral, [6]=ganhosJogadorDeAdversarios, [7]=ganhosJogadorDeJackpot, [8]=ganhosJogadorDeDividirEV,
    // [9]=ganhosLigaGeral, [10]=ganhosLigaTaxa, [11]=ganhosLigaTaxaJackpot, [12]=ganhosLigaPremioJackpot, [13]=ganhosLigaDividirEV
    const ligaId = parseSlashValue(row[3]);

    if (ligaId && !Number.isNaN(ligaId) && currentBloco) {
      // Parse individual values first
      const ganhosJogadorDeAdversarios = toNumber(row[6]);
      const ganhosJogadorDeJackpot = toNumber(row[7]);
      const ganhosJogadorDeDividirEV = toNumber(row[8]);
      let ganhosJogadorGeral = toNumber(row[5]);

      const ganhosLigaTaxa = toNumber(row[10]);
      const ganhosLigaTaxaJackpot = toNumber(row[11]);
      const ganhosLigaPremioJackpot = toNumber(row[12]);
      const ganhosLigaDividirEV = toNumber(row[13]);
      let ganhosLigaGeral = toNumber(row[9]);

      // If ganhosJogadorGeral is 0 but sub-columns have values, calculate it
      // Formula: Geral = De adversários + De Jackpot + De Dividir EV
      if (ganhosJogadorGeral === 0) {
        const hasSubValues =
          ganhosJogadorDeAdversarios !== 0 ||
          ganhosJogadorDeJackpot !== 0 ||
          ganhosJogadorDeDividirEV !== 0;
        if (hasSubValues) {
          ganhosJogadorGeral =
            ganhosJogadorDeAdversarios +
            ganhosJogadorDeJackpot +
            ganhosJogadorDeDividirEV;
        }
      }

      // If ganhosLigaGeral is 0 but sub-columns have values, calculate it
      // Formula: Geral = Taxa + Taxa do Jackpot + Prêmio Jackpot + Dividir EV
      // (Note: values already have correct sign from Excel)
      if (ganhosLigaGeral === 0) {
        const hasSubValues =
          ganhosLigaTaxa !== 0 ||
          ganhosLigaTaxaJackpot !== 0 ||
          ganhosLigaPremioJackpot !== 0 ||
          ganhosLigaDividirEV !== 0;
        if (hasSubValues) {
          ganhosLigaGeral =
            ganhosLigaTaxa +
            ganhosLigaTaxaJackpot +
            ganhosLigaPremioJackpot +
            ganhosLigaDividirEV;
        }
      }

      const liga: ParsedLeagueGeralPPSRLiga = {
        superUnionId: parseSlashValue(row[1]),
        ligaNome: String(row[2] || "").trim(),
        ligaId: ligaId,
        classificacaoPPSR: String(row[4] || "").trim(),
        ganhosJogadorGeral,
        ganhosJogadorDeAdversarios,
        ganhosJogadorDeJackpot,
        ganhosJogadorDeDividirEV,
        ganhosLigaGeral,
        ganhosLigaTaxa,
        ganhosLigaTaxaJackpot,
        ganhosLigaPremioJackpot,
        ganhosLigaDividirEV,
      };
      currentBloco.ligas.push(liga);
    }
  }

  // Don't forget the last bloco
  if (currentBloco && currentBloco.ligas.length > 0) {
    blocos.push(currentBloco);
  }

  // Calculate totals from liga data
  for (const bloco of blocos) {
    bloco.total = {
      ganhosJogadorGeral: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosJogadorGeral,
        0,
      ),
      ganhosJogadorDeAdversarios: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosJogadorDeAdversarios,
        0,
      ),
      ganhosJogadorDeJackpot: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosJogadorDeJackpot,
        0,
      ),
      ganhosJogadorDeDividirEV: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosJogadorDeDividirEV,
        0,
      ),
      ganhosLigaGeral: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosLigaGeral,
        0,
      ),
      ganhosLigaTaxa: bloco.ligas.reduce((sum, l) => sum + l.ganhosLigaTaxa, 0),
      ganhosLigaTaxaJackpot: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosLigaTaxaJackpot,
        0,
      ),
      ganhosLigaPremioJackpot: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosLigaPremioJackpot,
        0,
      ),
      ganhosLigaDividirEV: bloco.ligas.reduce(
        (sum, l) => sum + l.ganhosLigaDividirEV,
        0,
      ),
    };
  }

  return { blocos, periodStart, periodEnd };
}

// ============================================================================
// PARSER: JOGOS PPST
// ============================================================================

function parseJogosPPSTSheet(sheet: XLSX.WorkSheet): {
  jogos: ParsedLeagueJogoPPST[];
  inicioCount: number;
} {
  const rows: any[][] = getXlsx().utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true, // Get raw numeric values (important for formula cells)
    blankrows: false,
  });

  // Count game headers for validation (cross-check with parsed games)
  // Look for the SECOND line of game headers: "ID do jogo: XXX Nome da mesa: YYY"
  // This is more reliable than counting "Início:" which may appear in other contexts
  let inicioCount = 0;
  const allGameIdsFromHeaders = new Set<string>(); // Track all game IDs found in headers
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowStr = row.map((cell: any) => String(cell || "")).join(" ");
    // Count "ID do jogo:" which uniquely identifies game headers
    if (rowStr.includes("ID do jogo:") && rowStr.includes("Nome da mesa:")) {
      inicioCount++;
      // Extract game ID for tracking
      const idMatch = rowStr.match(/ID do jogo:\s*([^\s]+)/i);
      if (idMatch) {
        allGameIdsFromHeaders.add(idMatch[1].trim());
      }
    }
  }

  const jogos: ParsedLeagueJogoPPST[] = [];
  const seenGameIds = new Set<string>(); // Track seen game IDs to avoid duplicates
  const unknownGameFormats: Array<{
    gameId: string;
    rawText: string;
    rowIndex: number;
  }> = []; // Track unrecognized formats
  let currentJogo: ParsedLeagueJogoPPST | null = null;
  let currentMetadata: Partial<ParsedLeagueJogoMetadata> = {};
  let headerLineIndex = -1;
  let gamesFoundCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Convert row to strings for easier pattern matching
    const rowStr = row.map((cell) => String(cell || "").trim());

    // Skip disclaimer
    if (
      rowStr[0].toLowerCase().includes("esta planilha é feita pelo pppoker")
    ) {
      continue;
    }

    // Detect game header line 1: "Início: 2025/12/08 00:00  By pp8590048(8590048)  Fim: 2025/12/08 03:52"
    // Made regex more flexible with \s* between components
    const rowJoined = rowStr.join(" ");
    const inicioMatch = rowJoined.match(
      /Início:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})\s*By\s*(\w+)\((\d+)\)\s*Fim:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})/i,
    );
    if (inicioMatch) {
      // Save previous game if exists
      if (currentJogo && currentJogo.jogadores.length > 0) {
        jogos.push(currentJogo);
        currentJogo = null; // Reset after saving to avoid double-push
      }

      currentMetadata = {
        dataInicio: inicioMatch[1].replace(/\//g, "-"),
        horaInicio: inicioMatch[2],
        criadorNome: inicioMatch[3],
        criadorId: inicioMatch[4],
        dataFim: inicioMatch[5].replace(/\//g, "-"),
        horaFim: inicioMatch[6],
      };
      continue;
    }

    // Detect game header line 2: "ID do jogo: 251208081611-304710  Nome da mesa: REENTRY"
    const idJogoMatch = rowJoined.match(
      /ID do jogo:\s*([^\s]+)\s+Nome da mesa:\s*(.+)/i,
    );
    if (idJogoMatch) {
      const gameId = idJogoMatch[1].trim();
      // Skip if we've already seen this game ID
      if (seenGameIds.has(gameId)) {
        currentMetadata = {}; // Reset metadata to avoid partial state
        currentJogo = null; // Prevent adding players to wrong game
        continue;
      }
      currentMetadata.idJogo = gameId;
      // Remove "?" characters (emojis that spreadsheet can't render)
      currentMetadata.nomeMesa = idJogoMatch[2].replace(/\?+/g, "").trim();
      continue;
    }

    // Detect game header line 3: Multiple formats supported:
    // - "PPST/NLH  Buy-in: 9+1  Premiação Garantida: 1000" (regular MTT with guarantee)
    // - "PPST/NLH  Buy-in: 9+1 Satellite" (satellite tournament)
    // - "PPST/SPINUP Buy-in: 5" (spin tournament - single number)
    // - "PPST/PLO5 PKO  Buy-in: 4.5+4.5+1  Premiação Garantida: 2000" (PKO with 3-part buy-in)
    // - "PPST/NLH MKO  Buy-in: 2.25+2.25+0.5  Premiação Garantida: 2000" (MKO with 3-part buy-in)
    // - "PPST/OFC Buy-in: 5+1" (Open Face Chinese)
    // - "PPST/SHORT Buy-in: 5+1" (Short Deck)
    // - "PPST/NLO Buy-in: 5+1" (No Limit Omaha)
    // - "MTT/6+  Buy-in: 9+1  Premiação Garantida: 750" (Short Deck 6+ with MTT prefix)
    // Regex captures: [1]=tipo (PPST/XXX or MTT/XXX including modifiers), [2]=buyinPart1, [3]=buyinPart2 (optional), [4]=buyinPart3 (optional)
    // Made more flexible to catch any game type after PPST/ or MTT/
    // KO variants: PKO (Progressive KO), MKO (Mystery KO), KO (regular knockout)
    const tipoJogoMatch = rowJoined.match(
      /((?:PPST|MTT)\/[A-Z0-9+]+(?:\s+(?:PKO|MKO|KO|Satellite|HYPER|TURBO))?)\s+Buy-in:?\s*(\d+(?:[.,]\d+)?)(?:\+(\d+(?:[.,]\d+)?))?(?:\+(\d+(?:[.,]\d+)?))?/i,
    );

    // Detect unknown game formats - lines that look like game type headers but don't match our regex
    // This catches new tournament types that we haven't mapped yet
    // Only match lines that start with a game type pattern: ALGO/TIPO (e.g., PPST/NLH, MTT/6+, CASH/NLH)
    if (
      !tipoJogoMatch &&
      currentMetadata.idJogo &&
      rowJoined.includes("Buy-in")
    ) {
      // Must start with a game type pattern: WORD/WORD (like PPST/NLH, MTT/6+, CASH/PLO)
      // This excludes column header lines like "ID da SuperUnion ID de Liga..."
      const gameTypePatternMatch = rowJoined.match(
        /^([A-Z]+\/[A-Z0-9+]+(?:\s+(?:PKO|MKO|KO|Satellite|HYPER|TURBO))?)\s+Buy-in/i,
      );
      if (gameTypePatternMatch) {
        const unknownFormat = {
          gameId: currentMetadata.idJogo,
          rawText: rowJoined.substring(0, 200).trim(),
          rowIndex: i,
        };
        unknownGameFormats.push(unknownFormat);
      }
    }

    if (tipoJogoMatch) {
      // Only create game if we have valid metadata (idJogo was set and not skipped as duplicate)
      if (!currentMetadata.idJogo) {
        continue;
      }

      gamesFoundCount++;

      // Detect subtipo from the rest of the line
      const isSatellite = /Satellite/i.test(rowJoined);
      const isKnockout = /\b(PKO|MKO|KO)\b/i.test(tipoJogoMatch[1]);
      const premiacaoMatch = rowJoined.match(/Premiação\s*Garantida:\s*(\d+)/i);

      // Parse buy-in parts (handle both . and , as decimal separator)
      const parseBuyinPart = (val: string) =>
        Number.parseFloat(val.replace(",", "."));
      const buyinPart1 = parseBuyinPart(tipoJogoMatch[2]);
      const buyinPart2 = tipoJogoMatch[3]
        ? parseBuyinPart(tipoJogoMatch[3])
        : undefined;
      const buyinPart3 = tipoJogoMatch[4]
        ? parseBuyinPart(tipoJogoMatch[4])
        : undefined;

      // Determine buy-in structure:
      // - PKO/MKO: base+bounty+taxa (3 parts)
      // - Regular: base+taxa (2 parts)
      // - SPINUP: base only (1 part) or base+taxa (2 parts)
      let buyInBase: number;
      let buyInBounty: number | undefined;
      let buyInTaxa: number;

      if (buyinPart3 !== undefined) {
        // 3 parts: base+bounty+taxa (PKO/MKO)
        buyInBase = buyinPart1;
        buyInBounty = buyinPart2;
        buyInTaxa = buyinPart3;
      } else if (buyinPart2 !== undefined) {
        // 2 parts: base+taxa
        buyInBase = buyinPart1;
        buyInTaxa = buyinPart2;
      } else {
        // 1 part: base only (SPINUP)
        buyInBase = buyinPart1;
        buyInTaxa = 0;
      }

      // Mark this game ID as seen
      seenGameIds.add(currentMetadata.idJogo);

      currentMetadata.tipoJogo = tipoJogoMatch[1].toUpperCase();
      currentMetadata.subtipo = isSatellite
        ? "satellite"
        : isKnockout
          ? "knockout"
          : "regular";
      currentMetadata.buyInBase = buyInBase;
      currentMetadata.buyInBounty = buyInBounty;
      currentMetadata.buyInTaxa = buyInTaxa;
      currentMetadata.premiacaoGarantida = premiacaoMatch
        ? Number.parseInt(premiacaoMatch[1])
        : null;

      // Initialize the game
      currentJogo = {
        metadata: currentMetadata as ParsedLeagueJogoMetadata,
        jogadores: [],
        totaisPorLiga: [],
        totalGeral: {
          buyinFichas: 0,
          ganhos: 0,
        },
      };
      headerLineIndex = i;
      continue;
    }

    // Skip column header row (right after tipo jogo line)
    if (headerLineIndex !== -1 && i === headerLineIndex + 1) {
      // This is the header row with "ID da SuperUnion", "ID de Liga", etc.
      continue;
    }

    // Detect "Liga Total" line (appears in column I for NLH - index 8)
    // Docs: Column I = Ranking, but "Liga Total" text appears here for totals
    // Note: We skip this parsing since we recalculate totals from player data anyway
    if (rowStr[8]?.toLowerCase() === "liga total" && currentJogo) {
      // Liga total row - skip, we'll calculate from player data
      continue;
    }

    // Detect "Total" line (total geral do jogo) - column I (index 8)
    // Note: We skip this parsing since we recalculate totals from player data anyway
    if (rowStr[8]?.toLowerCase() === "total" && currentJogo) {
      // Total geral row - skip, we'll calculate from player data
      continue;
    }

    // Parse player data row
    // Column mapping varies by game type:
    // - NLH regular:  B=SU, C=Liga, D=Clube, E=NomeClube, F=Jogador, G=Apelido, H=Memo, I=Ranking, J=BuyIn, K=Ticket, L=Ganhos, M=Taxa, N=Gap
    // - Satellite:    B=SU, C=Liga, D=Clube, E=NomeClube, F=Jogador, G=Apelido, H=Memo, I=Ranking, J=BuyIn, K=Ticket, L=Ganhos, M=NomeTicket, N=ValorTicket, O=Taxa, P=Gap
    // - SPINUP:       B=SU, C=Liga, D=Clube, E=NomeClube, F=Jogador, G=Apelido, H=Memo, I=Ranking, J=BuyIn, K=Prêmio, L=Ganhos
    // - Knockout:     B=SU, C=Liga, D=Clube, E=NomeClube, F=Jogador, G=Apelido, H=Memo, I=Ranking, J=BuyIn, K=Ticket, L=Ganhos, M=Recompensa, N=Taxa, O=Gap
    // Check if this is a player row: valid jogadorId (positive integer) + liga + clube
    const jogadorId = parseSlashValue(row[5]);
    const isPlayerRow =
      jogadorId &&
      jogadorId > 0 &&
      Number.isInteger(jogadorId) &&
      row[2] && // ligaId
      row[3] && // clubeId
      currentJogo;

    if (isPlayerRow) {
      const subtipo = currentJogo.metadata.subtipo;
      const tipoJogo = currentJogo.metadata.tipoJogo;
      const isSpinup = tipoJogo.includes("SPINUP");

      const jogador: ParsedLeagueJogadorPPST = {
        superUnionId: parseSlashValue(row[0]), // A - ID da SuperUnion (ou data)
        ligaId: toNumber(row[2]), // C - ID de Liga (B é "/" separador)
        clubeId: toNumber(row[3]), // D - ID de clube
        clubeNome: String(row[4] || "").trim(), // E - Nome do Clube
        jogadorId: jogadorId, // F - ID do jogador
        apelido: String(row[6] || "").trim(), // G - Apelido
        nomeMemorado: String(row[7] || "").trim(), // H - Nome de memorando
        ranking: toNumber(row[8]), // I - Ranking
        buyinFichas: toNumber(row[9]), // J - Buy-in de fichas
        ganhos: toNumber(row[11]), // L - Ganhos (comum a todos)
      };

      if (isSpinup) {
        // SPINUP: J=BuyIn, K=Prêmio, L=Ganhos
        jogador.premio = toNumber(row[10]); // K - Prêmio (sorteado)
      } else if (subtipo === "satellite") {
        // Satellite: J=BuyIn, K=Ticket, L=Ganhos, M=NomeTicket, N=ValorTicket, O=Taxa, P=Gap
        jogador.buyinTicket = toNumber(row[10]); // K - Buy-in de ticket
        jogador.nomeTicket = String(row[12] || "").trim(); // M - Nome do ticket
        jogador.valorTicket = toNumber(row[13]); // N - Valor do ticket
        jogador.taxa = toNumber(row[14]); // O - Taxa
        jogador.gapGarantido = parseSlashValue(row[15]); // P - gap garantido
      } else if (subtipo === "knockout") {
        // Knockout (PKO/MKO): J=BuyIn, K=Ticket, L=Ganhos, M=Recompensa, N=Taxa, O=Gap
        jogador.buyinTicket = toNumber(row[10]); // K - Buy-in de ticket
        jogador.recompensa = toNumber(row[12]); // M - De recompensa (bounty)
        jogador.taxa = toNumber(row[13]); // N - Taxa
        jogador.gapGarantido = parseSlashValue(row[14]); // O - gap garantido
      } else {
        // NLH regular: J=BuyIn, K=Ticket, L=Ganhos, M=Taxa, N=Gap
        jogador.buyinTicket = toNumber(row[10]); // K - Buy-in de ticket
        jogador.taxa = toNumber(row[12]); // M - Taxa
        jogador.gapGarantido = parseSlashValue(row[13]); // N - gap garantido
      }

      currentJogo.jogadores.push(jogador);
    }
  }

  // Don't forget the last game
  if (currentJogo && currentJogo.jogadores.length > 0) {
    jogos.push(currentJogo);
  }

  // Calculate totals from player data (since Excel formulas may not be read correctly)
  for (const jogo of jogos) {
    const subtipo = jogo.metadata.subtipo;
    const isSpinup = jogo.metadata.tipoJogo.includes("SPINUP");

    // Calculate total geral from all players
    jogo.totalGeral = {
      buyinFichas: jogo.jogadores.reduce((sum, j) => sum + j.buyinFichas, 0),
      ganhos: jogo.jogadores.reduce((sum, j) => sum + j.ganhos, 0),
    };

    if (isSpinup) {
      jogo.totalGeral.premio = jogo.jogadores.reduce(
        (sum, j) => sum + (j.premio ?? 0),
        0,
      );
    } else if (subtipo === "satellite") {
      jogo.totalGeral.buyinTicket = jogo.jogadores.reduce(
        (sum, j) => sum + (j.buyinTicket ?? 0),
        0,
      );
      jogo.totalGeral.valorTicket = jogo.jogadores.reduce(
        (sum, j) => sum + (j.valorTicket ?? 0),
        0,
      );
      jogo.totalGeral.taxa = jogo.jogadores.reduce(
        (sum, j) => sum + (j.taxa ?? 0),
        0,
      );
      jogo.totalGeral.gapGarantido = jogo.jogadores.reduce(
        (sum, j) => sum + (j.gapGarantido ?? 0),
        0,
      );
    } else if (subtipo === "knockout") {
      jogo.totalGeral.buyinTicket = jogo.jogadores.reduce(
        (sum, j) => sum + (j.buyinTicket ?? 0),
        0,
      );
      jogo.totalGeral.recompensa = jogo.jogadores.reduce(
        (sum, j) => sum + (j.recompensa ?? 0),
        0,
      );
      jogo.totalGeral.taxa = jogo.jogadores.reduce(
        (sum, j) => sum + (j.taxa ?? 0),
        0,
      );
      jogo.totalGeral.gapGarantido = jogo.jogadores.reduce(
        (sum, j) => sum + (j.gapGarantido ?? 0),
        0,
      );
    } else {
      // NLH regular
      jogo.totalGeral.buyinTicket = jogo.jogadores.reduce(
        (sum, j) => sum + (j.buyinTicket ?? 0),
        0,
      );
      jogo.totalGeral.taxa = jogo.jogadores.reduce(
        (sum, j) => sum + (j.taxa ?? 0),
        0,
      );
      jogo.totalGeral.gapGarantido = jogo.jogadores.reduce(
        (sum, j) => sum + (j.gapGarantido ?? 0),
        0,
      );
    }

    // Calculate totals per liga
    const ligaMap = new Map<number, ParsedLeagueJogadorPPST[]>();
    for (const jogador of jogo.jogadores) {
      const list = ligaMap.get(jogador.ligaId) || [];
      list.push(jogador);
      ligaMap.set(jogador.ligaId, list);
    }

    jogo.totaisPorLiga = Array.from(ligaMap.entries()).map(
      ([ligaId, jogadores]) => {
        const total: ParsedLeagueTotalLiga = {
          ligaId,
          buyinFichas: jogadores.reduce((sum, j) => sum + j.buyinFichas, 0),
          ganhos: jogadores.reduce((sum, j) => sum + j.ganhos, 0),
        };

        if (isSpinup) {
          total.premio = jogadores.reduce((sum, j) => sum + (j.premio ?? 0), 0);
        } else if (subtipo === "satellite") {
          total.buyinTicket = jogadores.reduce(
            (sum, j) => sum + (j.buyinTicket ?? 0),
            0,
          );
          total.valorTicket = jogadores.reduce(
            (sum, j) => sum + (j.valorTicket ?? 0),
            0,
          );
          total.taxa = jogadores.reduce((sum, j) => sum + (j.taxa ?? 0), 0);
          total.gapGarantido = jogadores.reduce(
            (sum, j) => sum + (j.gapGarantido ?? 0),
            0,
          );
        } else if (subtipo === "knockout") {
          total.buyinTicket = jogadores.reduce(
            (sum, j) => sum + (j.buyinTicket ?? 0),
            0,
          );
          total.recompensa = jogadores.reduce(
            (sum, j) => sum + (j.recompensa ?? 0),
            0,
          );
          total.taxa = jogadores.reduce((sum, j) => sum + (j.taxa ?? 0), 0);
          total.gapGarantido = jogadores.reduce(
            (sum, j) => sum + (j.gapGarantido ?? 0),
            0,
          );
        } else {
          // NLH regular
          total.buyinTicket = jogadores.reduce(
            (sum, j) => sum + (j.buyinTicket ?? 0),
            0,
          );
          total.taxa = jogadores.reduce((sum, j) => sum + (j.taxa ?? 0), 0);
          total.gapGarantido = jogadores.reduce(
            (sum, j) => sum + (j.gapGarantido ?? 0),
            0,
          );
        }

        return total;
      },
    );
  }

  return { jogos, inicioCount, unknownGameFormats };
}

// ============================================================================
// PARSER: JOGOS PPSR (Cash Games)
// ============================================================================

function parseJogosPPSRSheet(sheet: XLSX.WorkSheet): {
  jogos: ParsedLeagueJogoPPSR[];
  inicioCount: number;
  unknownCashFormats: Array<{
    gameId: string;
    rawText: string;
    rowIndex: number;
  }>;
} {
  const rows: any[][] = getXlsx().utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true, // Get raw numeric values (important for formula cells)
    blankrows: false,
  });

  // Count game headers for validation
  let inicioCount = 0;
  const allGameIdsFromHeaders = new Set<string>();
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowStr = row.map((cell: any) => String(cell || "")).join(" ");
    if (rowStr.includes("ID do jogo:") && rowStr.includes("Nome da mesa:")) {
      inicioCount++;
      const idMatch = rowStr.match(/ID do jogo:\s*([^\s]+)/i);
      if (idMatch) {
        allGameIdsFromHeaders.add(idMatch[1].trim());
      }
    }
  }

  const jogos: ParsedLeagueJogoPPSR[] = [];
  const seenGameIds = new Set<string>();
  const unknownCashFormats: Array<{
    gameId: string;
    rawText: string;
    rowIndex: number;
  }> = []; // Track unrecognized formats
  let currentJogo: ParsedLeagueJogoPPSR | null = null;
  let currentMetadata: Partial<ParsedLeagueCashMetadata> = {};
  let headerLineIndex = -1;
  let gamesFoundCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowStr = row.map((cell) => String(cell || "").trim());

    // Skip disclaimer
    if (
      rowStr[0].toLowerCase().includes("esta planilha é feita pelo pppoker")
    ) {
      continue;
    }

    const rowJoined = rowStr.join(" ");

    // Detect game header line 1: "Início: 2025/12/08 00:00  By SupervisorMesas(5582707)  Fim: 2025/12/08 04:00"
    const inicioMatch = rowJoined.match(
      /Início:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})\s*By\s*(\w+)\((\d+)\)\s*Fim:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})/i,
    );
    if (inicioMatch) {
      // Save previous game if exists
      if (currentJogo && currentJogo.jogadores.length > 0) {
        jogos.push(currentJogo);
        currentJogo = null;
      }

      currentMetadata = {
        dataInicio: inicioMatch[1].replace(/\//g, "-"),
        horaInicio: inicioMatch[2],
        criadorNome: inicioMatch[3],
        criadorId: inicioMatch[4],
        dataFim: inicioMatch[5].replace(/\//g, "-"),
        horaFim: inicioMatch[6],
      };
      continue;
    }

    // Detect game header line 2: "ID do jogo: 251208000222-292842  Nome da mesa: ?FIVE 100BB?"
    const idJogoMatch = rowJoined.match(
      /ID do jogo:\s*([^\s]+)\s+Nome da mesa:\s*(.+)/i,
    );
    if (idJogoMatch) {
      const gameId = idJogoMatch[1].trim();
      if (seenGameIds.has(gameId)) {
        currentMetadata = {};
        currentJogo = null;
        continue;
      }
      currentMetadata.idJogo = gameId;
      // Remove "?" characters (emojis that spreadsheet can't render)
      currentMetadata.nomeMesa = idJogoMatch[2].replace(/\?+/g, "").trim();
      continue;
    }

    // Detect game header line 3: "PPSR/<TYPE> [MODIFIERS] <BLINDS> <RAKE>% <CAP> <DURATION>h"
    // STRUCTURAL REGEX - captures ANY game type, not specific ones
    // This makes it future-proof for new game types PPPoker might add
    // Structure: PPSR/ + any chars (non-greedy) + optional modifiers + blinds + rake% + capType + durationh
    const tipoCashMatch = rowJoined.match(
      /PPSR\/(.+?)((?:\s*\([^)]+\))*)\s+(\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?)\s+(\d+(?:[.,]\d+)?)%\s*(\d+(?:[.,]\d+)?)(BB|Blinds|Ante)\s+(\d+(?:[.,]\d+)?)h/i,
    );

    if (tipoCashMatch) {
      if (!currentMetadata.idJogo) {
        continue;
      }

      gamesFoundCount++;

      // Group 1: Type (without PPSR/ prefix), Group 2: Modifiers, Group 3: Blinds
      // Group 4: Rake%, Group 5: Cap number, Group 6: Cap type, Group 7: Duration
      const rawType = tipoCashMatch[1].trim();

      // Parse blinds - can be "2.5/5" or just "1"
      const blindsStr = tipoCashMatch[3].replace(",", ".");
      const blindsParts = blindsStr.split("/");
      const smallBlind = Number.parseFloat(blindsParts[0]);
      const bigBlind =
        blindsParts.length > 1 ? Number.parseFloat(blindsParts[1]) : smallBlind;

      // Parse modifiers - extract from "(Mod1)(Mod2)" format
      const modifiersRaw = tipoCashMatch[2].trim();
      const modifiers = modifiersRaw
        ? modifiersRaw
            .match(/\(([^)]+)\)/g)
            ?.map((m) => m.slice(1, -1))
            .join(", ")
        : undefined;

      seenGameIds.add(currentMetadata.idJogo);

      currentMetadata.tipoCash = `PPSR/${rawType.toUpperCase()}`;
      currentMetadata.modificador = modifiers;
      currentMetadata.blinds = blindsStr;
      currentMetadata.smallBlind = smallBlind;
      currentMetadata.bigBlind = bigBlind;
      currentMetadata.rakePercent = Number.parseFloat(
        tipoCashMatch[4].replace(",", "."),
      );
      currentMetadata.rakeCap = Number.parseFloat(
        tipoCashMatch[5].replace(",", "."),
      );
      currentMetadata.rakeCapType = tipoCashMatch[6]; // BB, Blinds, or Ante
      currentMetadata.duracao = `${tipoCashMatch[7]}h`;
      currentMetadata.duracaoHoras = Number.parseFloat(
        tipoCashMatch[7].replace(",", "."),
      );

      currentJogo = {
        metadata: currentMetadata as ParsedLeagueCashMetadata,
        jogadores: [],
        totaisPorLiga: [],
        totalGeral: {
          buyinFichas: 0,
          maos: 0,
          ganhosJogadorGeral: 0,
          ganhosDeAdversarios: 0,
          ganhosDeJackpot: 0,
          ganhosDeDividirEV: 0,
          ganhosClubeGeral: 0,
          taxa: 0,
          taxaJackpot: 0,
          premiosJackpot: 0,
          dividirEV: 0,
        },
      };
      headerLineIndex = i;
      continue;
    }

    // Detect unknown cash game formats - lines that look like cash type headers but don't match our structural regex
    // With the new flexible regex, this should only catch truly malformed lines (missing components)
    if (
      !tipoCashMatch &&
      currentMetadata.idJogo &&
      rowJoined.includes("PPSR/")
    ) {
      // Check if this looks like a cash game header line but failed to match
      // This means the structure is different (missing rake%, cap, duration, etc.)
      const looksLikeCashHeader = /PPSR\/\S+/i.test(rowJoined);
      if (looksLikeCashHeader && !seenGameIds.has(currentMetadata.idJogo)) {
        const unknownFormat = {
          gameId: currentMetadata.idJogo,
          rawText: rowJoined.substring(0, 200),
          rowIndex: i,
        };
        unknownCashFormats.push(unknownFormat);
      }
    }

    // Skip column header row
    if (headerLineIndex !== -1 && i === headerLineIndex + 1) {
      continue;
    }

    // Detect total rows and skip
    if (
      (rowStr[7]?.toLowerCase() === "liga total" ||
        rowStr[7]?.toLowerCase() === "total") &&
      currentJogo
    ) {
      continue;
    }

    // Parse player data row
    // Columns: B=SU(1), C=Liga(2), D=Clube(3), E=NomeClube(4), F=Jogador(5), G=Apelido(6), H=Memo(7),
    //          I=BuyIn(8), J=Mãos(9), K=GanhosGeral(10), L=DeAdv(11), M=DeJackpot(12), N=DeDividir(13),
    //          O=GanhosClubeGeral(14), P=Taxa(15), Q=TaxaJackpot(16), R=PremiosJackpot(17), S=DividirEV(18)
    const jogadorId = parseSlashValue(row[5]);
    const isPlayerRow =
      jogadorId &&
      jogadorId > 0 &&
      Number.isInteger(jogadorId) &&
      row[2] && // ligaId
      row[3] && // clubeId
      currentJogo;

    if (isPlayerRow) {
      const jogador: ParsedLeagueJogadorPPSR = {
        superUnionId: parseSlashValue(row[1]),
        ligaId: toNumber(row[2]),
        clubeId: toNumber(row[3]),
        clubeNome: String(row[4] || "").trim(),
        jogadorId: jogadorId,
        apelido: String(row[6] || "").trim(),
        nomeMemorado: String(row[7] || "").trim(),
        buyinFichas: toNumber(row[8]),
        maos: toNumber(row[9]),
        ganhosJogadorGeral: toNumber(row[10]),
        ganhosDeAdversarios: toNumber(row[11]),
        ganhosDeJackpot: toNumber(row[12]),
        ganhosDeDividirEV: toNumber(row[13]),
        ganhosClubeGeral: toNumber(row[14]),
        taxa: toNumber(row[15]),
        taxaJackpot: toNumber(row[16]),
        premiosJackpot: toNumber(row[17]),
        dividirEV: toNumber(row[18]),
      };

      currentJogo.jogadores.push(jogador);
    }
  }

  // Don't forget the last game
  if (currentJogo && currentJogo.jogadores.length > 0) {
    jogos.push(currentJogo);
  }

  // Calculate totals
  for (const jogo of jogos) {
    // Calculate total geral
    jogo.totalGeral = {
      buyinFichas: jogo.jogadores.reduce((sum, j) => sum + j.buyinFichas, 0),
      maos: jogo.jogadores.reduce((sum, j) => sum + j.maos, 0),
      ganhosJogadorGeral: jogo.jogadores.reduce(
        (sum, j) => sum + j.ganhosJogadorGeral,
        0,
      ),
      ganhosDeAdversarios: jogo.jogadores.reduce(
        (sum, j) => sum + j.ganhosDeAdversarios,
        0,
      ),
      ganhosDeJackpot: jogo.jogadores.reduce(
        (sum, j) => sum + j.ganhosDeJackpot,
        0,
      ),
      ganhosDeDividirEV: jogo.jogadores.reduce(
        (sum, j) => sum + j.ganhosDeDividirEV,
        0,
      ),
      ganhosClubeGeral: jogo.jogadores.reduce(
        (sum, j) => sum + j.ganhosClubeGeral,
        0,
      ),
      taxa: jogo.jogadores.reduce((sum, j) => sum + j.taxa, 0),
      taxaJackpot: jogo.jogadores.reduce((sum, j) => sum + j.taxaJackpot, 0),
      premiosJackpot: jogo.jogadores.reduce(
        (sum, j) => sum + j.premiosJackpot,
        0,
      ),
      dividirEV: jogo.jogadores.reduce((sum, j) => sum + j.dividirEV, 0),
    };

    // Calculate totals per liga
    const ligaMap = new Map<number, ParsedLeagueJogadorPPSR[]>();
    for (const jogador of jogo.jogadores) {
      const list = ligaMap.get(jogador.ligaId) || [];
      list.push(jogador);
      ligaMap.set(jogador.ligaId, list);
    }

    jogo.totaisPorLiga = Array.from(ligaMap.entries()).map(
      ([ligaId, jogadores]) => ({
        ligaId,
        buyinFichas: jogadores.reduce((sum, j) => sum + j.buyinFichas, 0),
        maos: jogadores.reduce((sum, j) => sum + j.maos, 0),
        ganhosJogadorGeral: jogadores.reduce(
          (sum, j) => sum + j.ganhosJogadorGeral,
          0,
        ),
        ganhosDeAdversarios: jogadores.reduce(
          (sum, j) => sum + j.ganhosDeAdversarios,
          0,
        ),
        ganhosDeJackpot: jogadores.reduce(
          (sum, j) => sum + j.ganhosDeJackpot,
          0,
        ),
        ganhosDeDividirEV: jogadores.reduce(
          (sum, j) => sum + j.ganhosDeDividirEV,
          0,
        ),
        ganhosClubeGeral: jogadores.reduce(
          (sum, j) => sum + j.ganhosClubeGeral,
          0,
        ),
        taxa: jogadores.reduce((sum, j) => sum + j.taxa, 0),
        taxaJackpot: jogadores.reduce((sum, j) => sum + j.taxaJackpot, 0),
        premiosJackpot: jogadores.reduce((sum, j) => sum + j.premiosJackpot, 0),
        dividirEV: jogadores.reduce((sum, j) => sum + j.dividirEV, 0),
      }),
    );
  }

  return { jogos, inicioCount, unknownCashFormats };
}

// ============================================================================
// MAIN PARSER
// ============================================================================

function parseLeagueExcelWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  fileSize: number,
): ParsedLeagueImportData {
  const result: ParsedLeagueImportData = {
    geralPPST: [],
    jogosPPST: [],
    geralPPSR: [],
    jogosPPSR: [],
    fileName,
    fileSize,
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const normalizedName = normalizeSheetName(sheetName);

    // Parse Geral do PPST
    if (normalizedName.includes("geral") && normalizedName.includes("ppst")) {
      const { blocos, periodStart, periodEnd } = parseGeralPPSTSheet(sheet);
      result.geralPPST = blocos;
      if (periodStart) result.periodStart = periodStart;
      if (periodEnd) result.periodEnd = periodEnd;
      result.geralPPSTLigaCount = blocos.reduce(
        (sum, b) => sum + b.ligas.length,
        0,
      );
    }

    // Parse Jogos PPST
    if (normalizedName.includes("jogos") && normalizedName.includes("ppst")) {
      const { jogos, inicioCount, unknownGameFormats } =
        parseJogosPPSTSheet(sheet);
      result.jogosPPST = jogos;
      result.jogosPPSTCount = jogos.length;
      result.jogosPPSTInicioCount = inicioCount;
      result.jogosPPSTJogadorCount = jogos.reduce(
        (sum, j) => sum + j.jogadores.length,
        0,
      );
      result.unknownGameFormats = unknownGameFormats;
    }

    // Parse Geral do PPSR (Cash Games)
    if (normalizedName.includes("geral") && normalizedName.includes("ppsr")) {
      const {
        blocos,
        periodStart: ppsrPeriodStart,
        periodEnd: ppsrPeriodEnd,
      } = parseGeralPPSRSheet(sheet);
      result.geralPPSR = blocos;
      // Only use PPSR period if PPST didn't set it
      if (ppsrPeriodStart && !result.periodStart)
        result.periodStart = ppsrPeriodStart;
      if (ppsrPeriodEnd && !result.periodEnd) result.periodEnd = ppsrPeriodEnd;
      result.geralPPSRLigaCount = blocos.reduce(
        (sum, b) => sum + b.ligas.length,
        0,
      );
    }

    // Parse Jogos PPSR (Cash Games)
    if (normalizedName.includes("jogos") && normalizedName.includes("ppsr")) {
      const { jogos, inicioCount, unknownCashFormats } =
        parseJogosPPSRSheet(sheet);
      result.jogosPPSR = jogos;
      result.jogosPPSRCount = jogos.length;
      result.jogosPPSRInicioCount = inicioCount;
      result.jogosPPSRJogadorCount = jogos.reduce(
        (sum, j) => sum + j.jogadores.length,
        0,
      );
      result.unknownCashFormats = unknownCashFormats;
    }
  }

  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeagueImportUploader() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast, update } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedLeagueImportData | null>(
    null,
  );
  const [validationResult, setValidationResult] =
    useState<LeagueValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const importToastDismissRef = useRef<(() => void) | null>(null);

  // Mutations for saving data
  const createImportMutation = useMutation(
    trpc.su.imports.create.mutationOptions({
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao criar importação",
          description: error.message,
        });
      },
    }),
  );

  const processImportMutation = useMutation(
    trpc.su.imports.process.mutationOptions({
      onSuccess: (data) => {
        importToastDismissRef.current?.();
        importToastDismissRef.current = null;
        setIsProcessing(false);
        toast({
          title: "Importação concluída!",
          description: `${data.stats.totalLeagues} ligas, ${data.stats.totalGamesPPST} jogos PPST, ${data.stats.totalGamesPPSR} jogos PPSR processados.`,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.imports.list.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.analytics.getDashboardStats.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.weekPeriods.getOpenPeriods.queryKey(),
        });
      },
      onError: (error) => {
        importToastDismissRef.current?.();
        importToastDismissRef.current = null;
        setIsProcessing(false);
        toast({
          variant: "destructive",
          title: "Erro ao processar importação",
          description: error.message,
        });
      },
    }),
  );

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);

      // Show processing toast with progress variant
      const { id, dismiss } = toast({
        variant: "progress",
        title: "Processando planilha...",
        description: file.name,
        progress: 0,
        duration: Number.POSITIVE_INFINITY,
      });
      toastIdRef.current = id;

      try {
        if (!xlsxModule) {
          xlsxModule = await import("xlsx");
        }

        const arrayBuffer = await file.arrayBuffer();

        // Create Web Worker for heavy parsing (keeps UI responsive)
        const worker = new Worker(
          new URL("@/workers/excel-parser.worker.ts", import.meta.url),
          { type: "module" },
        );
        workerRef.current = worker;

        // Process in worker
        const data = await new Promise<ParsedLeagueImportData>(
          (resolve, reject) => {
            worker.onmessage = (event) => {
              const response = event.data;

              if (response.type === "progress") {
                // Update toast with progress
                update(id, {
                  variant: "progress",
                  title: response.stage,
                  description: file.name,
                  progress: response.percent,
                });
              } else if (response.type === "success") {
                resolve(response.data as ParsedLeagueImportData);
              } else if (response.type === "error") {
                reject(new Error(response.message));
              }
            };

            worker.onerror = (error) => {
              reject(new Error(error.message || "Erro no worker"));
            };

            // Send file to worker
            worker.postMessage({
              type: "parse",
              buffer: arrayBuffer,
              fileName: file.name,
              fileSize: file.size,
            });
          },
        );

        // Terminate worker after use
        worker.terminate();
        workerRef.current = null;

        // Validate the data (fast operation, can stay on main thread)
        const validation = validateLeagueImportData(data);

        setParsedData(data);
        setValidationResult(validation);
        setShowValidationModal(true);

        // Dismiss processing toast
        dismiss();

        if (validation.hasBlockingErrors) {
          toast({
            variant: "destructive",
            title: "Erros na planilha",
            description:
              "A planilha contém erros críticos que impedem a importação.",
          });
        }
      } catch (error) {
        console.error("Error processing file:", error);
        dismiss();
        toast({
          variant: "destructive",
          title: "Erro ao processar arquivo",
          description:
            error instanceof Error ? error.message : "Erro desconhecido",
        });
      } finally {
        setIsProcessing(false);
        toastIdRef.current = null;
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
      }
    },
    [toast, update],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      const validExtensions = [".xlsx", ".xls"];
      const extension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf("."));
      if (!validExtensions.includes(extension)) {
        toast({
          variant: "destructive",
          title: "Tipo de arquivo inválido",
          description: "Por favor, envie um arquivo Excel (.xlsx ou .xls)",
        });
        return;
      }

      await processFile(file);
    },
    [processFile, toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleApprove = useCallback(async () => {
    if (!parsedData || !validationResult) return;

    setIsProcessing(true);
    try {
      // Step 1: Create the import record
      const importRecord = await createImportMutation.mutateAsync({
        fileName: parsedData.fileName,
        fileSize: parsedData.fileSize,
        periodStart: parsedData.periodStart ?? "",
        periodEnd: parsedData.periodEnd ?? "",
        timezone: "UTC -0500",
        rawData: {
          geralPPSTCount: parsedData.geralPPSTLigaCount ?? 0,
          jogosPPSTCount: parsedData.jogosPPSTCount ?? 0,
          geralPPSRCount: parsedData.geralPPSRLigaCount ?? 0,
          jogosPPSRCount: parsedData.jogosPPSRCount ?? 0,
        },
        validationPassed: !validationResult.hasBlockingErrors,
        validationErrors: validationResult.checks,
        validationWarnings: validationResult.warnings,
        qualityScore: validationResult.qualityScore,
      });

      // Step 2: Show progress toast and start processing
      if (!importRecord?.id) {
        throw new Error("Failed to create import record");
      }
      setShowValidationModal(false);

      const { dismiss } = toast({
        variant: "progress",
        title: "Processando importação...",
        description: parsedData.fileName,
        progress: 40,
        duration: Number.POSITIVE_INFINITY,
      });
      importToastDismissRef.current = dismiss;

      // Step 3: Start processing in background (don't await)
      processImportMutation.mutate({
        importId: importRecord.id,
        data: {
          geralPPST: parsedData.geralPPST,
          jogosPPST: parsedData.jogosPPST,
          geralPPSR: parsedData.geralPPSR,
          jogosPPSR: parsedData.jogosPPSR,
        },
      });

      // Clear parsed data
      setParsedData(null);
      setValidationResult(null);
    } catch (error) {
      console.error("Error saving import:", error);
      // Error toast is handled by mutation callbacks
      setIsProcessing(false);
    }
  }, [
    parsedData,
    validationResult,
    createImportMutation,
    processImportMutation,
    toast,
  ]);

  const handleReject = useCallback(() => {
    setShowValidationModal(false);
    setParsedData(null);
    setValidationResult(null);
  }, []);

  return (
    <>
      {/* Drop zone wrapper */}
      <div
        className="relative h-full"
        {...getRootProps({ onClick: (evt) => evt.stopPropagation() })}
      >
        <input
          {...getInputProps()}
          id="upload-league-file"
          className="hidden"
        />
        {/* Drag overlay */}
        {isDragActive && (
          <div className="absolute top-0 right-0 left-0 z-[51] w-full pointer-events-none h-[calc(100vh-150px)]">
            <div className="bg-background h-full w-full flex items-center justify-center text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <p className="text-sm">Solte o arquivo aqui...</p>
                <span className="text-xs text-[#878787]">
                  Formatos aceitos: .xlsx, .xls
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="space-y-6 py-4">
          {/* Upload area */}
          <div className="relative z-20 flex w-full flex-col">
            <div className="flex w-full flex-col relative text-center">
              <div className="pb-4">
                <h2 className="font-medium text-lg">
                  Importar Super Union Data
                </h2>
              </div>

              <p className="pb-6 text-sm text-[#878787]">
                Arraste e solte ou faça upload da planilha PPST-PPSR exportada
                do PPPoker. Validaremos automaticamente os dados antes de
                processar.
              </p>

              <button
                type="button"
                onClick={() =>
                  document.getElementById("upload-league-file")?.click()
                }
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 mx-auto"
              >
                Upload
              </button>
            </div>
          </div>

          {/* Imports list for SU type */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-sm mb-4">
              Importações de Super Union
            </h3>
            <Suspense fallback={<SUImportsList.Skeleton />}>
              <SUImportsList compact />
            </Suspense>
          </div>
        </div>
      </div>

      {parsedData && validationResult && (
        <LeagueImportValidationModal
          open={showValidationModal}
          onOpenChange={setShowValidationModal}
          parsedData={parsedData}
          validationResult={validationResult}
          onApprove={handleApprove}
          onReject={handleReject}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
}
