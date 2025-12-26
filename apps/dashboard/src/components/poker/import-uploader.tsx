"use client";

import { useI18n } from "@/locales/client";
import type { ParsedImportData, ValidationResult } from "@/lib/poker/types";
import { validateImportData } from "@/lib/poker/validation";
import { useTRPC } from "@/trpc/client";
import { cn } from "@midday/ui/cn";
import { Skeleton } from "@midday/ui/skeleton";
import { useToast } from "@midday/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { ImportValidationModal } from "./import-validation-modal";

// Parser for PPPoker Club Member export
function parseClubMemberSheet(data: any[]): any[] {
  return data
    .filter((row) => row["PPPoker ID"] || row["pppoker_id"] || row["ID"])
    .map((row) => ({
      ppPokerId: String(row["PPPoker ID"] || row["pppoker_id"] || row["ID"] || ""),
      nickname: row["Nickname"] || row["nickname"] || row["Name"] || "",
      memoName: row["Memo Name"] || row["memo_name"] || row["Memo"] || null,
      country: row["Country"] || row["country"] || null,
      agentNickname: row["Agent Nickname"] || row["agent_nickname"] || row["Agent"] || null,
      agentPpPokerId: row["Agent ID"] || row["agent_pppoker_id"] || null,
      superAgentNickname: row["Super Agent Nickname"] || row["super_agent_nickname"] || null,
      superAgentPpPokerId: row["Super Agent ID"] || row["super_agent_pppoker_id"] || null,
      chipBalance: parseFloat(row["Chip Balance"] || row["chips"] || row["balance"] || 0),
      agentCreditBalance: parseFloat(row["Agent Credit"] || row["agent_credit"] || 0),
      lastActiveAt: row["Last Active"] || row["last_active_at"] || null,
    }));
}

// Parser for Credit/Chip transaction export
function parseTransactionSheet(data: any[]): any[] {
  return data
    .filter((row) => row["Date"] || row["occurred_at"] || row["Timestamp"])
    .map((row) => ({
      occurredAt: row["Date"] || row["occurred_at"] || row["Timestamp"] || "",
      clubId: row["Sender Club ID"] || row["sender_club_id"] || null,
      senderClubId: row["Sender Club ID"] || row["sender_club_id"] || null,
      playerId: row["Player ID"] || row["player_id"] || null,
      senderPlayerId: row["Sender ID"] || row["sender_player_id"] || null,
      senderNickname: row["Sender Nickname"] || row["sender_nickname"] || null,
      senderMemoName: row["Sender Memo"] || row["sender_memo"] || null,
      recipientNickname: row["Recipient Nickname"] || row["recipient_nickname"] || null,
      recipientMemoName: row["Recipient Memo"] || row["recipient_memo"] || null,
      recipientPlayerId: row["Recipient ID"] || row["recipient_player_id"] || null,
      creditSent: parseFloat(row["Credit Sent"] || row["credit_sent"] || 0),
      creditRedeemed: parseFloat(row["Credit Redeemed"] || row["credit_redeemed"] || 0),
      creditLeftClub: parseFloat(row["Credit Left Club"] || row["credit_left_club"] || 0),
      chipsSent: parseFloat(row["Chips Sent"] || row["chips_sent"] || 0),
      classificationPpsr: parseFloat(row["Classificação PPSR"] || 0),
      classificationRing: parseFloat(row["Classificação Ring Game"] || 0),
      classificationCustomRing: parseFloat(row["Classificação de RG Personalizado"] || 0),
      classificationMtt: parseFloat(row["Classificação MTT"] || 0),
      chipsRedeemed: parseFloat(row["Chips Redeemed"] || row["chips_redeemed"] || 0),
      chipsLeftClub: parseFloat(row["Chips Left Club"] || row["chips_left_club"] || 0),
      ticketSent: parseFloat(row["Ticket Sent"] || row["ticket_sent"] || 0),
      ticketRedeemed: parseFloat(row["Ticket Redeemed"] || row["ticket_redeemed"] || 0),
      ticketExpired: parseFloat(row["Ticket Expired"] || row["ticket_expired"] || 0),
    }));
}

// Parser for Session/Game Result export
function parseSessionSheet(data: any[]): any[] {
  return data
    .filter((row) => row["Session ID"] || row["Game ID"] || row["external_id"])
    .map((row) => ({
      externalId: row["Session ID"] || row["Game ID"] || row["external_id"] || "",
      tableName: row["Table Name"] || row["table_name"] || null,
      sessionType: row["Game Type"] || row["session_type"] || "ring",
      gameVariant: row["Variant"] || row["game_variant"] || "nlh",
      startedAt: row["Start Time"] || row["started_at"] || null,
      endedAt: row["End Time"] || row["ended_at"] || null,
      blinds: row["Blinds"] || row["blinds"] || null,
      buyInAmount: parseFloat(row["Buy-In"] || row["buy_in_amount"] || 0) || null,
      guaranteedPrize: parseFloat(row["GTD"] || row["guaranteed_prize"] || 0) || null,
      createdByNickname: row["Created By"] || row["created_by_nickname"] || null,
      createdByPpPokerId: row["Created By ID"] || row["created_by_pppoker_id"] || null,
    }));
}

// Parser for Summary/Results export
function parseSummarySheet(data: any[]): any[] {
  return data
    .filter((row) => row["PPPoker ID"] || row["pppoker_id"] || row["Player ID"])
    .map((row) => ({
      ppPokerId: String(row["PPPoker ID"] || row["pppoker_id"] || row["Player ID"] || ""),
      country: row["Country"] || row["country"] || null,
      nickname: row["Nickname"] || row["nickname"] || row["Player"] || "",
      memoName: row["Memo Name"] || row["memo_name"] || null,
      agentNickname: row["Agent"] || row["agent_nickname"] || null,
      agentPpPokerId: row["Agent ID"] || row["agent_pppoker_id"] || null,
      superAgentNickname: row["Super Agent"] || row["super_agent_nickname"] || null,
      superAgentPpPokerId: row["Super Agent ID"] || row["super_agent_pppoker_id"] || null,
      playerWinningsTotal: toNumber(row["Total Winnings"] || row["winnings_total"] || 0),
      classificationPpsr: toNumber(row["Classificação PPSR"] || 0),
      classificationRing: toNumber(row["Classificação Ring Game"] || 0),
      classificationCustomRing: toNumber(row["Classificação de RG Personalizado"] || 0),
      classificationMtt: toNumber(row["Classificação MTT"] || 0),
      generalTotal: toNumber(row["Total"] || row["Geral"] || 0),
    }));
}

function normalizeDateTime(value: string | null): string | null {
  if (!value || typeof value !== "string") return value;
  const match = value.match(/(\d{4})[/-](\d{2})[/-](\d{2})\s+(\d{2}:\d{2})/);
  if (!match) return value.trim();
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:00`;
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleaned = value.toString().replace(",", ".").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseBuyInValue(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const cleaned = value.toString().trim();
  if (!cleaned) return null;
  const parts = cleaned.split("+").map((p) => toNumber(p));
  const total = parts.reduce((sum, part) => sum + part, 0);
  return total || null;
}

function normalizeSessionType(rawType: string): string {
  const value = rawType.toLowerCase();

  // PPST = Tournament (MTT, SITNG, ou SPIN)
  if (value.includes("ppst")) {
    // SPINUP dentro de PPST
    if (value.includes("spin")) return "spin";
    // Sit & Go dentro de PPST
    if (value.includes("sit") || value.includes("sng")) return "sit_n_go";
    // Default PPST = MTT
    return "mtt";
  }

  // PPSR = Cash Game
  if (value.includes("ppsr")) return "cash_game";

  // Outros indicadores (sem prefixo PPST/PPSR)
  if (value.includes("mtt") || value.includes("tournament")) return "mtt";
  if (value.includes("sit") || value.includes("sng")) return "sit_n_go";
  if (value.includes("spin")) return "spin";

  return "cash_game";
}

function normalizeGameVariant(rawType: string): string {
  const value = rawType.toLowerCase();
  if (value.includes("plo6")) return "plo6";
  if (value.includes("plo5")) return "plo5";
  if (value.includes("plo4")) return "plo4";
  if (value.includes("ofc")) return "ofc";
  if (value.includes("6+")) return "nlh_6plus";
  if (value.includes("aof")) return "nlh_aof";
  if (value.includes("spin")) return "spin"; // SPINUP tournaments
  if (value.includes("nlh") || value.includes("holdem")) return "nlh";
  return "other";
}

// Detect game type based on organizer prefix
// PPSR = CASH, PPST = Tournament (MTT/SITNG/SPIN)
function detectGameType(gameInfo: string): "MTT" | "SITNG" | "SPIN" | "CASH" {
  const info = gameInfo.toLowerCase();

  // PPSR = CASH (sempre)
  if (info.includes("ppsr")) {
    return "CASH";
  }

  // PPST = Tournament - need to determine if MTT, SITNG, or SPIN
  if (info.includes("ppst")) {
    // SPINUP
    if (info.includes("spinup") || info.includes("spin")) {
      return "SPIN";
    }
    // Sit & Go indicators
    if (
      info.includes("sitng") ||
      info.includes("sit n go") ||
      info.includes("sit&go") ||
      info.includes("sng")
    ) {
      return "SITNG";
    }
    // Default PPST to MTT
    return "MTT";
  }

  // Additional MTT indicators (without PPST prefix)
  if (
    info.includes("mtt/") ||
    info.includes("royal showdown") ||
    info.includes("free roll") ||
    info.includes("freeroll") ||
    info.includes("stack attack") ||
    info.includes("premiação garantida")
  ) {
    return "MTT";
  }

  // SPINUP indicators (without PPST prefix)
  if (info.includes("spinup") || info.includes("spin")) {
    return "SPIN";
  }

  // Sit & Go indicators (without PPST prefix)
  if (
    info.includes("sitng") ||
    info.includes("sit n go") ||
    info.includes("sit&go")
  ) {
    return "SITNG";
  }

  // Default to CASH
  return "CASH";
}

// Check if row is a player row (valid positive integer ID)
function isPlayerRow(row: Array<string | number | null>): boolean {
  const playerId = row[1];
  return (
    typeof playerId === "number" &&
    playerId > 0 &&
    Number.isInteger(playerId)
  );
}

// Extract time from "Início: 2024-01-15 14:30" or "Início: 2024-01-15 14:30:00" format
function extractTime(timeStr: string): string | null {
  if (!timeStr) return null;

  // Try with seconds first (HH:mm:ss)
  let match = timeStr.match(/(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}:\d{2})/);
  if (match) return match[1];

  // Try without seconds (HH:mm)
  match = timeStr.match(/(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2})/);
  if (match) return match[1];

  // Try dd/MM/yyyy HH:mm format (Brazilian format)
  match = timeStr.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
  if (match) return match[1];

  // No valid timestamp found - return null instead of empty string
  return null;
}

// Get blinds from game type string (e.g., "0.1/0.2")
function getBlinds(tipoJogo: string): string | null {
  const match = tipoJogo.match(/(\d+(?:\.\d+)?\/\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

// Get rake percentage from game type string (e.g., "5%")
function getRakePercent(tipoJogo: string): number | null {
  const match = tipoJogo.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

// Get rake cap from game type string (e.g., "3BB")
function getRakeCap(tipoJogo: string): string | null {
  const match = tipoJogo.match(/(\d+(?:\.\d+)?)\s*BB/i);
  return match ? `${match[1]}BB` : null;
}

// Get time limit from game type string (e.g., "0.5h")
function getTimeLimit(tipoJogo: string): string | null {
  const match = tipoJogo.match(/(\d+(?:\.\d+)?)\s*h(?:\s|$)/i);
  return match ? `${match[1]}h` : null;
}

// Get organizer from game type string
// PPSR = Ring games by PPPoker, PPST = Tournament by PPPoker
// Sem prefixo = Liga (interno) - pode ser Ring Game ou Tournament
function getOrganizador(tipoJogo: string): string {
  if (tipoJogo.includes("PPSR")) return "PPSR";
  if (tipoJogo.includes("PPST")) return "PPST";
  // Sem prefixo PPSR/PPST = criado pela Liga (interno)
  // Pode ser MTT (torneio) ou Ring Game (PLO5, NLH, etc.)
  return "Liga";
}

function parsePartidasSheet(sheet: XLSX.Sheet): { sessions: ParsedImportData["sessions"]; utcCount: number } {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as Array<
    Array<string | number | null>
  >;

  const sessions: ParsedImportData["sessions"] = [];

  // Count UTC markers: only count rows where column A has "UTC" AND column B has "Início:"
  // This ensures we count only actual session markers, not stray UTC text
  let utcCount = 0;
  for (const row of rows) {
    const cellA = row[0];
    const cellB = row[1];
    if (cellA && String(cellA).includes("UTC") && cellB && String(cellB).includes("Início:")) {
      utcCount += 1;
    }
  }

  let rowIndex = 0;
  let matchNumber = 0;

  while (rowIndex < rows.length) {
    const row = rows[rowIndex];

    // Check if column B (index 1) contains "Início:"
    const cellB = row[1];
    if (!cellB || !String(cellB).includes("Início:")) {
      rowIndex += 1;
      continue;
    }

    matchNumber += 1;

    // Line N: row[1] = "Início: ...", row[2] = "By pp...(ID)", row[3] = "Fim: ..."
    const startStr = String(row[1] || "");
    const creatorStr = String(row[2] || "");
    const endStr = String(row[3] || "");
    const startedAt = extractTime(startStr);
    const endedAt = extractTime(endStr);

    // Extract creator info from:
    // - "By pp8590048(8590048)" or "By ppNickname(12345678)" (com prefixo pp)
    // - "By SupervisorMesas(5582707)" (sem prefixo pp)
    let createdByNicknameRaw: string | null = null;
    let createdByPpPokerIdRaw: string | null = null;

    // Try with "pp" prefix first
    let creatorMatch = creatorStr.match(/By\s+pp([^(]+)\((\d+)\)/i);
    if (creatorMatch) {
      createdByNicknameRaw = creatorMatch[1].trim();
      createdByPpPokerIdRaw = creatorMatch[2];
    } else {
      // Try without "pp" prefix: "By Name(ID)"
      creatorMatch = creatorStr.match(/By\s+([^(]+)\((\d+)\)/i);
      if (creatorMatch) {
        createdByNicknameRaw = creatorMatch[1].trim();
        createdByPpPokerIdRaw = creatorMatch[2];
      }
    }

    // Line N+1: Can be either:
    // - row[1] = "ID do jogo: XXX", row[2] = "Nome da mesa: YYY" (separate cells)
    // - row[1] = "ID do jogo: XXX   Nome da mesa: YYY" (same cell)
    const idLine = rows[rowIndex + 1] || [];
    const idCellRaw = idLine[1] ? String(idLine[1]) : "";
    const tableNameCellRaw = idLine[2] ? String(idLine[2]) : "";

    let externalId: string = `match_${matchNumber}`;
    let tableName: string | null = null;

    // Check if both are in the same cell (combined format)
    if (idCellRaw.includes("ID do jogo:") && idCellRaw.includes("Nome da mesa:")) {
      // Combined format: "ID do jogo: XXX   Nome da mesa: YYY"
      const idMatch = idCellRaw.match(/ID do jogo:\s*(\S+)/i);
      const tableMatch = idCellRaw.match(/Nome da mesa:\s*(.+)$/i);
      if (idMatch) externalId = idMatch[1].trim();
      if (tableMatch) tableName = tableMatch[1].trim();
    } else {
      // Separate cells format
      if (idCellRaw.includes("ID do jogo:")) {
        const idMatch = idCellRaw.match(/ID do jogo:\s*(.+)/i);
        if (idMatch) externalId = idMatch[1].trim();
      } else if (idCellRaw && !idCellRaw.includes("Nome da mesa:")) {
        // Raw ID without prefix
        externalId = idCellRaw.trim();
      }

      if (tableNameCellRaw) {
        if (tableNameCellRaw.includes("Nome da mesa:")) {
          const tableMatch = tableNameCellRaw.match(/Nome da mesa:\s*(.+)/i);
          if (tableMatch) tableName = tableMatch[1].trim();
        } else {
          // Raw table name without prefix
          tableName = tableNameCellRaw.trim() || null;
        }
      }
    }

    // Line N+2: row[1] = Tipo do jogo completo (e.g., "PPST/NLH   Buy-in: 9+1   Premiação Garantida: 1000")
    // Para PPST/torneios, esta linha existe. Para CASH, pode ser vazia ou ser a linha de headers.
    const typeLine = rows[rowIndex + 2] || [];
    let gameTypeRaw = typeLine[1] ? String(typeLine[1]) : "";

    // Se não encontrou na posição esperada, checar se está na linha de ID/Nome (mesclado)
    // ou verificar outras células da linha
    if (!gameTypeRaw || gameTypeRaw.includes("ID do jogador")) {
      // Checar se o tipo está na mesma linha do ID/Nome (pode estar em células diferentes)
      for (let i = 0; i < (typeLine.length || 0); i++) {
        const cell = typeLine[i] ? String(typeLine[i]) : "";
        if (cell.includes("PPST") || cell.includes("PPSR") || cell.includes("Buy-in:") || cell.includes("Premiação")) {
          gameTypeRaw = cell;
          break;
        }
      }
    }

    // Se ainda não encontrou, pode ser que a estrutura é diferente - tentar na linha anterior (idLine)
    if (!gameTypeRaw || gameTypeRaw.includes("ID do jogador")) {
      for (let i = 0; i < (idLine.length || 0); i++) {
        const cell = idLine[i] ? String(idLine[i]) : "";
        if (cell.includes("PPST") || cell.includes("PPSR")) {
          gameTypeRaw = cell;
          break;
        }
      }
    }

    // Detect game type (MTT, SITNG, CASH)
    const gameTypeCategory = detectGameType(gameTypeRaw);
    const sessionType = normalizeSessionType(gameTypeRaw);
    const gameVariant = normalizeGameVariant(gameTypeRaw);
    const blinds = getBlinds(gameTypeRaw);
    // Use PPST/PPSR from game type, but prefer creator if available
    const organizador = getOrganizador(gameTypeRaw);

    // CASH/PPSR specific: rake %, cap, time limit (e.g., "5% 3BB 0.5h")
    const rakePercent = getRakePercent(gameTypeRaw);
    const rakeCap = getRakeCap(gameTypeRaw);
    const timeLimit = getTimeLimit(gameTypeRaw);

    // Extract buy-in and guaranteed prize from game type string
    const buyInRaw = gameTypeRaw.match(/Buy-in:\s*([0-9+.,]+)/)?.[1]?.trim() || null;
    const guaranteedPrizeRaw = gameTypeRaw.match(/Premiação Garantida:\s*([0-9.,]+)/)?.[1]?.trim() || null;
    const buyInAmount = parseBuyInValue(buyInRaw);
    const guaranteedPrize = guaranteedPrizeRaw ? toNumber(guaranteedPrizeRaw) : null;

    // Parse players starting from line N+3
    const players: NonNullable<ParsedImportData["sessions"]>[number]["players"] = [];
    let totalBuyIn = 0;
    let totalWinnings = 0;
    let totalRake = 0;
    let totalHands = 0;

    let dataRowIndex = rowIndex + 3;
    while (dataRowIndex < rows.length) {
      const dataRow = rows[dataRowIndex] || [];

      // Check if next match starts
      const dataCellB = dataRow[1];
      if (dataCellB && String(dataCellB).includes("Início:")) {
        break;
      }

      // Check if this is a player row (ID between 1,000,000 and 99,999,999)
      if (!isPlayerRow(dataRow)) {
        dataRowIndex += 1;
        continue;
      }

      // Extract player data based on game type
      if (gameTypeCategory === "SPIN") {
        // SPIN column mapping (7 colunas, sem Taxa):
        // B(1): ID, C(2): Apelido, D(3): Memorando, E(4): Ranking, F(5): Buy-in fichas, G(6): Prêmio, H(7): Ganhos
        const ranking = toNumber(dataRow[4]);
        const buyInChips = toNumber(dataRow[5]);
        const prize = toNumber(dataRow[6]);  // Prêmio (não é Buy-in ticket)
        const winnings = toNumber(dataRow[7]);

        totalBuyIn += buyInChips;
        totalWinnings += winnings;
        // SPIN não tem Taxa

        players.push({
          ppPokerId: String(dataRow[1] || ""),
          nickname: String(dataRow[2] || ""),
          memoName: dataRow[3] ? String(dataRow[3]) : null,
          ranking,
          buyInChips,
          buyIn: buyInChips,
          prize,  // Prêmio específico do SPIN
          winnings,
          rake: 0,
          hands: 0,
        });
      } else if (gameTypeCategory === "MTT" || gameTypeCategory === "SITNG") {
        // MTT/SITNG column mapping (8 colunas):
        // B(1): ID, C(2): Apelido, D(3): Memorando, E(4): Ranking, F(5): Buy-in fichas, G(6): Buy-in ticket, H(7): Ganhos, I(8): Taxa
        const ranking = toNumber(dataRow[4]);
        const buyInChips = toNumber(dataRow[5]);
        const buyInTicket = toNumber(dataRow[6]);
        const winnings = toNumber(dataRow[7]);
        const rake = toNumber(dataRow[8]);

        totalBuyIn += buyInChips + buyInTicket;
        totalWinnings += winnings;
        totalRake += rake;

        players.push({
          ppPokerId: String(dataRow[1] || ""),
          nickname: String(dataRow[2] || ""),
          memoName: dataRow[3] ? String(dataRow[3]) : null,
          ranking,
          buyInChips,
          buyInTicket,
          buyIn: buyInChips + buyInTicket,
          winnings,
          rake,
          hands: 0,
        });
      } else {
        // CASH/HU column mapping (PLO HU, NLH, etc.):
        // B(1): ID, C(2): Apelido, D(3): Memorando, E(4): Buy-in, F(5): Mãos
        // Ganhos do jogador: G(6): Geral, H(7): De adversários, I(8): De Jackpot, J(9): De Dividir EV
        // Ganhos do clube: K(10): Geral, L(11): Taxa, M(12): Taxa do Jackpot, N(13): Prêmios Jackpot, O(14): Dividir EV

        const buyIn = toNumber(dataRow[4]);
        const hands = toNumber(dataRow[5]);

        // Ganhos do jogador (índices 6-9, mas Geral[6] é fórmula - calcular)
        const winningsOpponents = toNumber(dataRow[7]);   // H - De adversários
        const winningsJackpot = toNumber(dataRow[8]);     // I - De Jackpot
        const winningsEvSplit = toNumber(dataRow[9]);     // J - De Dividir EV
        // Geral é soma: De adversários + De Jackpot + De Dividir EV
        const winningsGeneral = winningsOpponents + winningsJackpot + winningsEvSplit;

        // Ganhos do clube (índices 10-14, mas Geral[10] é fórmula - calcular)
        const clubTaxa = toNumber(dataRow[11]);           // L - Taxa
        const clubJackpotFee = toNumber(dataRow[12]);     // M - Taxa do Jackpot
        const clubJackpotPrize = toNumber(dataRow[13]);   // N - Prêmios Jackpot
        const clubEvSplit = toNumber(dataRow[14]);        // O - Dividir EV
        // Geral é soma: Taxa + Taxa do Jackpot + Prêmios Jackpot + Dividir EV
        const clubGeneral = clubTaxa + clubJackpotFee + clubJackpotPrize + clubEvSplit;

        const winnings = winningsGeneral; // Total winnings = Geral (calculado)
        const rake = clubTaxa;            // Taxa

        totalBuyIn += buyIn;
        totalWinnings += winnings;
        totalRake += rake;
        totalHands += hands;

        players.push({
          ppPokerId: String(dataRow[1] || ""),
          nickname: String(dataRow[2] || ""),
          memoName: dataRow[3] ? String(dataRow[3]) : null,
          buyIn,
          hands,
          winnings,
          rake,
          ranking: 0, // Cash não tem ranking
          // Ganhos do jogador detalhados
          winningsGeneral,
          winningsOpponents,
          winningsJackpot,
          winningsEvSplit,
          // Ganhos do clube detalhados
          clubWinningsGeneral: clubGeneral,
          clubWinningsFee: clubTaxa,
          clubWinningsJackpotFee: clubJackpotFee,
          clubWinningsJackpotPrize: clubJackpotPrize,
          clubWinningsEvSplit: clubEvSplit,
        });
      }

      dataRowIndex += 1;
    }

    sessions.push({
      externalId,
      tableName,
      sessionType,
      gameVariant,
      startedAt: normalizeDateTime(startedAt) || null,
      endedAt: normalizeDateTime(endedAt),
      blinds,
      buyInAmount,
      guaranteedPrize,
      // CASH specific: rake info
      rakePercent,
      rakeCap,
      timeLimit,
      // Use extracted creator from "By ppXXX(ID)", fallback to PPST/PPSR organizador
      createdByNickname: createdByNicknameRaw || organizador,
      createdByPpPokerId: createdByPpPokerIdRaw,
      playerCount: players.length,
      totalBuyIn,
      totalWinnings,
      totalRake,
      handsPlayed: totalHands > 0 ? totalHands : undefined,
      players,
    });

    rowIndex = dataRowIndex;
  }

  // Debug: Log game variant distribution summary
  const variantCounts: Record<string, number> = {};
  const otherRawTypes: Record<string, number> = {}; // Track raw types that became "other"
  for (const session of sessions) {
    const v = session.gameVariant?.toUpperCase() || "UNKNOWN";
    variantCounts[v] = (variantCounts[v] || 0) + 1;
  }
  console.log(`[ClubParser] ✅ Parsed ${sessions.length} sessions (UTC markers: ${utcCount})`);
  console.log("[ClubParser] 📊 Game Variant Distribution:",
    Object.entries(variantCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(" | ")
  );

  // Log what raw types became "other" so we can add proper mappings
  if (variantCounts["OTHER"] > 0) {
    // Re-scan to find raw types - look at first 5 unique "other" examples
    const otherExamples: string[] = [];
    for (const session of sessions) {
      if (session.gameVariant === "other" && session.tableName) {
        const example = session.tableName.substring(0, 50);
        if (!otherExamples.includes(example) && otherExamples.length < 5) {
          otherExamples.push(example);
        }
      }
    }
    console.log("[ClubParser] ⚠️ 'OTHER' examples (table names):", otherExamples.join(" | "));
  }

  return { sessions, utcCount };
}

// PPPoker Geral sheet column mapping (0-indexed) - A até AV (48 colunas)
const GERAL_COLUMNS = {
  // Identificação do Jogador (A-I)
  // A = índice (skip)
  ppPokerId: 1, // B - ID do jogador
  country: 2, // C - País/região
  nickname: 3, // D - Apelido
  memoName: 4, // E - Nome de memorando
  agentNickname: 5, // F - Agente
  agentPpPokerId: 6, // G - ID do agente
  superAgentNickname: 7, // H - Superagente
  superAgentPpPokerId: 8, // I - ID do superagente

  // Classificações (J-N)
  playerWinningsTotal: 9, // J - Ganhos de jogador gerais + Eventos
  classificationPpsr: 10, // K - Classificação PPSR
  classificationRing: 11, // L - Classificação Ring Game
  classificationCustomRing: 12, // M - Classificação de RG Personalizado
  classificationMtt: 13, // N - Classificação MTT

  // Ganhos do Jogador (O-X)
  generalTotal: 14, // O - Geral
  ringGamesTotal: 15, // P - Ring Games
  mttSitNGoTotal: 16, // Q - MTT, SitNGo
  spinUpTotal: 17, // R - SPINUP
  caribbeanTotal: 18, // S - Caribbean+ Poker
  colorGameTotal: 19, // T - COLOR GAME
  crashTotal: 20, // U - CRASH
  luckyDrawTotal: 21, // V - LUCKY DRAW
  jackpotTotal: 22, // W - Jackpot
  evSplitTotal: 23, // X - Dividir EV

  // Tickets (Y-AA)
  ticketValueWon: 24, // Y - Valor do ticket ganho
  ticketBuyIn: 25, // Z - Buy-in de ticket
  customPrizeValue: 26, // AA - Valor do prêmio personalizado

  // Taxas (AB-AG)
  feeGeneral: 27, // AB - Geral
  fee: 28, // AC - Taxa
  feePpst: 29, // AD - Taxa (jogos PPST)
  feeNonPpst: 30, // AE - Taxa (jogos não PPST)
  feePpsr: 31, // AF - Taxa (jogos PPSR)
  feeNonPpsr: 32, // AG - Taxa (jogos não PPSR)

  // SPINUP & Caribbean (AH-AK)
  spinUpBuyIn: 33, // AH - Buy-in de SPINUP
  spinUpPrize: 34, // AI - Premiação de SPINUP
  caribbeanBets: 35, // AJ - Apostas de Caribbean+ Poker
  caribbeanPrize: 36, // AK - Premiação de Caribbean+ Poker

  // Ganhos do Clube (AL-AQ)
  colorGameBets: 37, // AL - Apostas do COLOR GAME
  colorGamePrize: 38, // AM - Premiação do COLOR GAME
  crashBets: 39, // AN - Apostas (CRASH)
  crashPrize: 40, // AO - Prêmios (CRASH)
  luckyDrawBets: 41, // AP - Apostas de LUCKY DRAW
  luckyDrawPrize: 42, // AQ - Premiação de LUCKY DRAW

  // Jackpot e Finais (AR-AV)
  jackpotFee: 43, // AR - Taxa do Jackpot
  jackpotPrize: 44, // AS - Prêmios Jackpot
  evSplit: 45, // AT - Dividir EV
  ticketDeliveredValue: 46, // AU - Valor do ticket entregue
  ticketDeliveredBuyIn: 47, // AV - Buy-in de ticket
};

// Converte letra de coluna (A, B, AA, AB) para índice (0, 1, 26, 27)
function columnLetterToIndex(col: string): number {
  let index = 0;
  const upper = col.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1; // 0-indexed
}

// Obtém o valor de uma célula, calculando fórmulas recursivamente se necessário
function getCellValue(
  sheet: XLSX.Sheet,
  cellAddress: string,
  visited: Set<string> = new Set()
): number {
  // Evitar loops infinitos
  if (visited.has(cellAddress)) return 0;
  visited.add(cellAddress);

  const cell = sheet[cellAddress];
  if (!cell) return 0;

  // Se tem valor calculado, usar
  if (cell.v !== undefined && cell.v !== null && typeof cell.v === "number") {
    return cell.v;
  }

  // Se tem valor string que parece número
  if (cell.v !== undefined && cell.v !== null && typeof cell.v === "string") {
    const parsed = parseFloat(cell.v.replace(/,/g, "."));
    if (!isNaN(parsed)) return parsed;
  }

  // Se tem texto formatado que parece número
  if (cell.w !== undefined && cell.w !== null) {
    const parsed = parseFloat(String(cell.w).replace(/,/g, "."));
    if (!isNaN(parsed)) return parsed;
  }

  // Se tem fórmula, tentar calcular
  if (cell.f) {
    return calculateFormula(sheet, cell.f, visited);
  }

  return 0;
}

// Calcula fórmulas Excel (SUM, etc) recursivamente
function calculateFormula(
  sheet: XLSX.Sheet,
  formula: string,
  visited: Set<string> = new Set()
): number {
  // Remove espaços
  const cleanFormula = formula.trim();

  // SUM(range) - ex: SUM(K5:O5), SUM(A1:Z100)
  const sumMatch = cleanFormula.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
  if (sumMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = sumMatch;
    const startColIdx = columnLetterToIndex(startCol);
    const endColIdx = columnLetterToIndex(endCol);
    const startRowIdx = parseInt(startRowStr, 10) - 1;
    const endRowIdx = parseInt(endRowStr, 10) - 1;

    let sum = 0;
    for (let row = startRowIdx; row <= endRowIdx; row++) {
      for (let col = startColIdx; col <= endColIdx; col++) {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        sum += getCellValue(sheet, addr, new Set(visited));
      }
    }
    return sum;
  }

  // SUM com múltiplos ranges - ex: SUM(A1:B2,C3:D4)
  const multiSumMatch = cleanFormula.match(/^SUM\((.+)\)$/i);
  if (multiSumMatch) {
    const ranges = multiSumMatch[1].split(",");
    let sum = 0;
    for (const range of ranges) {
      const trimmedRange = range.trim();
      // Range simples (A1:B2)
      const rangeMatch = trimmedRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
      if (rangeMatch) {
        const [, startCol, startRowStr, endCol, endRowStr] = rangeMatch;
        const startColIdx = columnLetterToIndex(startCol);
        const endColIdx = columnLetterToIndex(endCol);
        const startRowIdx = parseInt(startRowStr, 10) - 1;
        const endRowIdx = parseInt(endRowStr, 10) - 1;

        for (let row = startRowIdx; row <= endRowIdx; row++) {
          for (let col = startColIdx; col <= endColIdx; col++) {
            const addr = XLSX.utils.encode_cell({ r: row, c: col });
            sum += getCellValue(sheet, addr, new Set(visited));
          }
        }
      }
      // Célula única (A1)
      const cellMatch = trimmedRange.match(/^([A-Z]+)(\d+)$/i);
      if (cellMatch) {
        const [, col, rowStr] = cellMatch;
        const colIdx = columnLetterToIndex(col);
        const rowIdx = parseInt(rowStr, 10) - 1;
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        sum += getCellValue(sheet, addr, new Set(visited));
      }
    }
    return sum;
  }

  // Referência a célula única - ex: =A1
  const cellRefMatch = cleanFormula.match(/^=?([A-Z]+)(\d+)$/i);
  if (cellRefMatch) {
    const [, col, rowStr] = cellRefMatch;
    const colIdx = columnLetterToIndex(col);
    const rowIdx = parseInt(rowStr, 10) - 1;
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    return getCellValue(sheet, addr, visited);
  }

  return 0;
}

// Parse PPPoker Excel sheet by column position (for sheets with merged header rows)
function parseSheetByPosition(
  sheet: XLSX.Sheet,
  columnMap: Record<string, number>,
  headerRows: number = 4,
  rowFilter?: (rowData: Record<string, any>) => boolean
): any[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const result: any[] = [];

  // Start from row after headers (headerRows is 0-indexed start, so +1)
  for (let row = headerRows; row <= range.e.r; row++) {
    const rowData: Record<string, any> = {};
    let hasValidId = false;

    for (const [field, colIdx] of Object.entries(columnMap)) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIdx });
      const cell = sheet[cellAddress];

      // Para células com fórmulas, cell.v pode estar vazio
      // Usar getCellValue que calcula fórmulas recursivamente
      let value = null;
      if (cell) {
        // Se tem valor calculado direto, usar
        if (cell.v !== undefined && cell.v !== null) {
          value = cell.v;
        } else if (cell.w !== undefined && cell.w !== null && cell.w !== "") {
          // cell.w é string formatada, tentar converter para número
          const trimmed = String(cell.w).trim().replace(/,/g, ".");
          const parsed = parseFloat(trimmed);
          value = !isNaN(parsed) ? parsed : cell.w;
        } else if (cell.f) {
          // Célula tem fórmula mas sem valor - calcular recursivamente
          value = calculateFormula(sheet, cell.f, new Set());
        }
      }

      // Clean up value
      if (value === "None" || value === "none") value = null;
      if (typeof value === "string") value = value.trim();

      rowData[field] = value;

      // Check if this row has a valid ID
      if (field === "ppPokerId" && value && !isNaN(Number(value))) {
        hasValidId = true;
      }
    }

    if (rowFilter) {
      if (rowFilter(rowData)) {
        result.push(rowData);
      }
    } else if (hasValidId) {
      result.push(rowData);
    }
  }

  return result;
}

// Parser for PPPoker "Geral" (General) sheet - Player summary (48 colunas A-AV)
function parseGeralSheet(data: any[], sheet?: XLSX.Sheet): any[] {
  // If we have the sheet, use position-based parsing for accuracy
  if (sheet) {
    const rawData = parseSheetByPosition(sheet, GERAL_COLUMNS, 4);
    return rawData.map((row) => ({
      // Identificação do Jogador (A-I)
      ppPokerId: String(row.ppPokerId || ""),
      country: row.country || null,
      nickname: row.nickname || "",
      memoName: row.memoName || null,
      agentNickname: row.agentNickname || null,
      agentPpPokerId: row.agentPpPokerId ? String(row.agentPpPokerId) : null,
      superAgentNickname: row.superAgentNickname || null,
      superAgentPpPokerId: row.superAgentPpPokerId
        ? String(row.superAgentPpPokerId)
        : null,

      // Classificações (J-N)
      playerWinningsTotal: toNumber(row.playerWinningsTotal),
      classificationPpsr: toNumber(row.classificationPpsr),
      classificationRing: toNumber(row.classificationRing),
      classificationCustomRing: toNumber(row.classificationCustomRing),
      classificationMtt: toNumber(row.classificationMtt),

      // Ganhos do Jogador (O-X)
      generalTotal: toNumber(row.generalTotal),
      ringGamesTotal: toNumber(row.ringGamesTotal),
      mttSitNGoTotal: toNumber(row.mttSitNGoTotal),
      spinUpTotal: toNumber(row.spinUpTotal),
      caribbeanTotal: toNumber(row.caribbeanTotal),
      colorGameTotal: toNumber(row.colorGameTotal),
      crashTotal: toNumber(row.crashTotal),
      luckyDrawTotal: toNumber(row.luckyDrawTotal),
      jackpotTotal: toNumber(row.jackpotTotal),
      evSplitTotal: toNumber(row.evSplitTotal),

      // Tickets (Y-AA)
      ticketValueWon: toNumber(row.ticketValueWon),
      ticketBuyIn: toNumber(row.ticketBuyIn),
      customPrizeValue: toNumber(row.customPrizeValue),

      // Taxas (AB-AG)
      feeGeneral: toNumber(row.feeGeneral),
      fee: toNumber(row.fee),
      feePpst: toNumber(row.feePpst),
      feeNonPpst: toNumber(row.feeNonPpst),
      feePpsr: toNumber(row.feePpsr),
      feeNonPpsr: toNumber(row.feeNonPpsr),

      // SPINUP & Caribbean (AH-AK)
      spinUpBuyIn: toNumber(row.spinUpBuyIn),
      spinUpPrize: toNumber(row.spinUpPrize),
      caribbeanBets: toNumber(row.caribbeanBets),
      caribbeanPrize: toNumber(row.caribbeanPrize),

      // Ganhos do Clube (AL-AQ)
      colorGameBets: toNumber(row.colorGameBets),
      colorGamePrize: toNumber(row.colorGamePrize),
      crashBets: toNumber(row.crashBets),
      crashPrize: toNumber(row.crashPrize),
      luckyDrawBets: toNumber(row.luckyDrawBets),
      luckyDrawPrize: toNumber(row.luckyDrawPrize),

      // Jackpot e Finais (AR-AV)
      jackpotFee: toNumber(row.jackpotFee),
      jackpotPrize: toNumber(row.jackpotPrize),
      evSplit: toNumber(row.evSplit),
      ticketDeliveredValue: toNumber(row.ticketDeliveredValue),
      ticketDeliveredBuyIn: toNumber(row.ticketDeliveredBuyIn),
    }));
  }

  // Fallback to header-based parsing for CSV or simple Excel
  return data
    .filter((row) => {
      const id = row["ID do jogador"] || row["Player ID"] || row["ID"];
      return id && !isNaN(Number(id));
    })
    .map((row) => ({
      // Identificação do Jogador (A-I)
      ppPokerId: String(
        row["ID do jogador"] || row["Player ID"] || row["ID"] || ""
      ),
      country: row["País/região"] || row["Country"] || null,
      nickname: row["Apelido"] || row["Nickname"] || "",
      memoName: row["Nome de memorando"] || row["Memo Name"] || null,
      agentNickname: row["Agente"] || row["Agent"] || null,
      agentPpPokerId: row["ID do agente"] || row["Agent ID"] || null,
      superAgentNickname: row["Superagente"] || row["Super Agent"] || null,
      superAgentPpPokerId: row["ID do superagente"] || row["Super Agent ID"] || null,

      // Classificações (J-N)
      playerWinningsTotal: toNumber(row["Ganhos de jogador gerais + Eventos"] || row["Geral + Eventos"] || 0),
      classificationPpsr: toNumber(row["Classificação PPSR"] || 0),
      classificationRing: toNumber(row["Classificação Ring Game"] || 0),
      classificationCustomRing: toNumber(row["Classificação de RG Personalizado"] || 0),
      classificationMtt: toNumber(row["Classificação MTT"] || 0),

      // Ganhos do Jogador (O-X)
      generalTotal: toNumber(row["Geral (Total)"] || row["Geral"] || 0),
      ringGamesTotal: toNumber(row["Ring Games"] || 0),
      mttSitNGoTotal: toNumber(row["MTT, SitNGo"] || 0),
      spinUpTotal: toNumber(row["SPINUP"] || 0),
      caribbeanTotal: toNumber(row["Caribbean+ Poker"] || 0),
      colorGameTotal: toNumber(row["COLOR GAME"] || 0),
      crashTotal: toNumber(row["CRASH"] || 0),
      luckyDrawTotal: toNumber(row["LUCKY DRAW"] || 0),
      jackpotTotal: toNumber(row["Jackpot"] || 0),
      evSplitTotal: toNumber(row["Dividir EV"] || 0),

      // Tickets (Y-AA)
      ticketValueWon: toNumber(row["Valor do ticket ganho"] || 0),
      ticketBuyIn: toNumber(row["Buy-in de ticket"] || 0),
      customPrizeValue: toNumber(row["Valor do prêmio personalizado"] || 0),

      // Taxas (AB-AG)
      feeGeneral: toNumber(row["Geral"] || 0),
      fee: toNumber(row["Taxa"] || 0),
      feePpst: toNumber(row["Taxa (jogos PPST)"] || 0),
      feeNonPpst: toNumber(row["Taxa (jogos não PPST)"] || 0),
      feePpsr: toNumber(row["Taxa (jogos PPSR)"] || 0),
      feeNonPpsr: toNumber(row["Taxa (jogos não PPSR)"] || 0),

      // SPINUP & Caribbean (AH-AK)
      spinUpBuyIn: toNumber(row["Buy-in de SPINUP"] || 0),
      spinUpPrize: toNumber(row["Premiação de SPINUP"] || 0),
      caribbeanBets: toNumber(row["Apostas de Caribbean+ Poker"] || 0),
      caribbeanPrize: toNumber(row["Premiação de Caribbean+ Poker"] || 0),

      // Ganhos do Clube (AL-AQ)
      colorGameBets: toNumber(row["Apostas do COLOR GAME"] || 0),
      colorGamePrize: toNumber(row["Premiação do COLOR GAME"] || 0),
      crashBets: toNumber(row["Apostas (CRASH)"] || 0),
      crashPrize: toNumber(row["Prêmios (CRASH)"] || 0),
      luckyDrawBets: toNumber(row["Apostas de LUCKY DRAW"] || 0),
      luckyDrawPrize: toNumber(row["Premiação de LUCKY DRAW"] || 0),

      // Jackpot e Finais (AR-AV)
      jackpotFee: toNumber(row["Taxa do Jackpot"] || 0),
      jackpotPrize: toNumber(row["Prêmios Jackpot"] || 0),
      evSplit: toNumber(row["Dividir EV"] || 0),
      ticketDeliveredValue: toNumber(row["Valor do ticket entregue"] || 0),
      ticketDeliveredBuyIn: toNumber(row["Buy-in de ticket"] || 0),
    }));
}

// PPPoker Detalhado sheet column mapping (0-indexed) - A até EG (137 colunas)
const DETALHADO_COLUMNS = {
  // Identificação do Jogador (A-I)
  date: 0, // A - Data
  ppPokerId: 1, // B - ID do jogador
  country: 2, // C - País/região
  nickname: 3, // D - Apelido
  memoName: 4, // E - Nome de memorando
  agentNickname: 5, // F - Agente
  agentPpPokerId: 6, // G - ID do agente
  superAgentNickname: 7, // H - Superagente
  superAgentPpPokerId: 8, // I - ID do superagente

  // Ganhos NLHoldem (J-R)
  nlhRegular: 9, // J - Regular
  nlhThreeOne: 10, // K - 3-1
  nlhThreeOneF: 11, // L - 3-1F
  nlhSixPlus: 12, // M - 6+
  nlhAof: 13, // N - AOF
  nlhSitNGo: 14, // O - SitNGo
  nlhSpinUp: 15, // P - SPINUP
  nlhMtt: 16, // Q - MTT NLH
  nlhMttSixPlus: 17, // R - MTT 6+

  // Ganhos PLO (S-AB)
  plo4: 18, // S - PLO4
  plo5: 19, // T - PLO5
  plo6: 20, // U - PLO6
  plo4Hilo: 21, // V - PLO4 H/L
  plo5Hilo: 22, // W - PLO5 H/L
  plo6Hilo: 23, // X - PLO6 H/L
  ploSitNGo: 24, // Y - SitNGo
  ploMttPlo4: 25, // Z - MTT/PLO4
  ploMttPlo5: 26, // AA - MTT/PLO5
  ploNlh: 27, // AB - NLHoldem

  // Ganhos do Jogador - FLASH e outros (AC-AV)
  flashPlo4: 28, // AC - PLO4 (FLASH)
  flashPlo5: 29, // AD - PLO5 (FLASH)
  mixedGame: 30, // AE - MIXED GAME
  ofc: 31, // AF - OFC
  seka36: 32, // AG - 36 (SEKA)
  seka32: 33, // AH - 32 (SEKA)
  seka21: 34, // AI - 21 (SEKA)
  teenPattiRegular: 35, // AJ - REGULAR (Teen Patti)
  teenPattiAk47: 36, // AK - AK47 (Teen Patti)
  teenPattiHukam: 37, // AL - HUKAM (Teen Patti)
  teenPattiMuflis: 38, // AM - MUFLIS (Teen Patti)
  tongits: 39, // AN - TONGITS
  pusoy: 40, // AO - PUSOY
  caribbean: 41, // AP - Caribbean+ Poker
  colorGame: 42, // AQ - COLOR GAME
  crash: 43, // AR - CRASH
  luckyDraw: 44, // AS - LUCKY DRAW
  jackpot: 45, // AT - Jackpot
  evSplitWinnings: 46, // AU - Dividir EV
  totalWinnings: 47, // AV - Total

  // Classificação (AW-AZ)
  classificationPpsr: 48, // AW - Classificação PPSR
  classificationRing: 49, // AX - Classificação Ring Game
  classificationCustomRing: 50, // AY - Classificação de RG Personalizado
  classificationMtt: 51, // AZ - Classificação MTT

  // Valores Gerais (BA-BD)
  generalPlusEvents: 52, // BA - Ganhos de jogador gerais + Eventos
  ticketValueWon: 53, // BB - Valor do ticket ganho
  ticketBuyIn: 54, // BC - Buy-in de ticket
  customPrizeValue: 55, // BD - Valor do prêmio personalizado

  // Taxa NLHoldem (BE-BM)
  feeNlhRegular: 56, // BE - Regular
  feeNlhThreeOne: 57, // BF - 3-1
  feeNlhThreeOneF: 58, // BG - 3-1F
  feeNlhSixPlus: 59, // BH - 6+
  feeNlhAof: 60, // BI - AOF
  feeNlhSitNGo: 61, // BJ - SitNGo
  feeNlhSpinUp: 62, // BK - SPINUP
  feeNlhMtt: 63, // BL - MTT NLH
  feeNlhMttSixPlus: 64, // BM - MTT 6+

  // Taxa PLO (BN-BU)
  feePlo4: 65, // BN - PLO4
  feePlo5: 66, // BO - PLO5
  feePlo4Hilo: 67, // BP - PLO4 H/L
  feePlo5Hilo: 68, // BQ - PLO5 H/L
  feePlo6Hilo: 69, // BR - PLO6 H/L
  feePloSitNGo: 70, // BS - SitNGo
  feePloMttPlo4: 71, // BT - MTT/PLO4
  feePloMttPlo5: 72, // BU - MTT/PLO5

  // Taxa FLASH e outros (BV-CJ)
  feeFlashNlh: 73, // BV - NLHoldem (FLASH)
  feeFlashPlo4: 74, // BW - PLO4 (FLASH)
  feeFlashPlo5: 75, // BX - PLO5 (FLASH)
  feeMixedGame: 76, // BY - MIXED GAME
  feeOfc: 77, // BZ - OFC
  feeSeka36: 78, // CA - 36 (SEKA)
  feeSeka32: 79, // CB - 32 (SEKA)
  feeSeka21: 80, // CC - 21 (SEKA)
  feeTeenPattiRegular: 81, // CD - REGULAR (Teen Patti)
  feeTeenPattiAk47: 82, // CE - AK47 (Teen Patti)
  feeTeenPattiHukam: 83, // CF - HUKAM (Teen Patti)
  feeTeenPattiMuflis: 84, // CG - MUFLIS (Teen Patti)
  feeTongits: 85, // CH - TONGITS
  feePusoy: 86, // CI - PUSOY
  feeTotal: 87, // CJ - Total

  // SPINUP (CK-CL)
  spinUpBuyIn: 88, // CK - Buy-in
  spinUpPrize: 89, // CL - Premiação

  // Jackpot (CM-CN)
  jackpotFee: 90, // CM - Taxa
  jackpotPrize: 91, // CN - Premiação

  // Dividir EV (CO-CQ)
  evSplitNlh: 92, // CO - NLHoldem
  evSplitPlo: 93, // CP - PLO
  evSplitTotal: 94, // CQ - Total

  // Valor ticket entregue (CR)
  ticketDeliveredValue: 95, // CR - Valor do ticket entregue

  // Fichas (CS-CY)
  chipTicketBuyIn: 96, // CS - Buy-in de ticket
  chipSent: 97, // CT - Enviado
  chipClassPpsr: 98, // CU - Classificação PPSR
  chipClassRing: 99, // CV - Classificação Ring Game
  chipClassCustomRing: 100, // CW - Classificação de RG Personalizado
  chipClassMtt: 101, // CX - Classificação MTT
  chipRedeemed: 102, // CY - Resgatado

  // Dar Crédito (CZ-DC)
  creditLeftClub: 103, // CZ - Saiu do clube
  creditSent: 104, // DA - Enviado
  creditRedeemed: 105, // DB - Resgatado
  creditLeftClub2: 106, // DC - Saiu do clube

  // Mãos NLH (DD-DH)
  handsNlhRegular: 107, // DD - Regular
  handsNlhThreeOne: 108, // DE - 3-1
  handsNlhThreeOneF: 109, // DF - 3-1F
  handsNlhSixPlus: 110, // DG - 6+
  handsNlhAof: 111, // DH - AOF

  // Mãos PLO (DI-DN)
  handsPlo4: 112, // DI - PLO4
  handsPlo5: 113, // DJ - PLO5
  handsPlo6: 114, // DK - PLO6
  handsPlo4Hilo: 115, // DL - PLO4 H/L
  handsPlo5Hilo: 116, // DM - PLO5 H/L
  handsPlo6Hilo: 117, // DN - PLO6 H/L

  // Mãos FLASH (DO-DQ)
  handsFlashNlh: 118, // DO - NLHoldem (FLASH)
  handsFlashPlo4: 119, // DP - PLO4 (FLASH)
  handsFlashPlo5: 120, // DQ - PLO5 (FLASH)

  // Mãos outros (DR-EG)
  handsMixedGame: 121, // DR - MIXED GAME
  handsOfc: 122, // DS - OFC
  handsSeka36: 123, // DT - 36 (SEKA)
  handsSeka32: 124, // DU - 32 (SEKA)
  handsSeka21: 125, // DV - 21 (SEKA)
  handsTeenPattiRegular: 126, // DW - REGULAR (Teen Patti)
  handsTeenPattiAk47: 127, // DX - AK47 (Teen Patti)
  handsTeenPattiHukam: 128, // DY - HUKAM (Teen Patti)
  handsTeenPattiMuflis: 129, // DZ - MUFLIS (Teen Patti)
  handsTongits: 130, // EA - TONGITS
  handsPusoy: 131, // EB - PUSOY
  handsCaribbean: 132, // EC - Caribbean+ Poker
  handsColorGame: 133, // ED - COLOR GAME
  handsCrash: 134, // EE - CRASH
  handsLuckyDraw: 135, // EF - LUCKY DRAW
  handsTotal: 136, // EG - Total
};

// Parser para aba "Detalhado" - 137 colunas (A-EG)
function parseDetalhadoSheet(sheet: XLSX.Sheet): any[] {
  const rawData = parseSheetByPosition(sheet, DETALHADO_COLUMNS, 4);
  return rawData.map((row) => ({
    // Identificação do Jogador (A-I)
    date: row.date ? String(row.date) : null,
    ppPokerId: String(row.ppPokerId || ""),
    country: row.country || null,
    nickname: row.nickname || "",
    memoName: row.memoName || null,
    agentNickname: row.agentNickname || null,
    agentPpPokerId: row.agentPpPokerId ? String(row.agentPpPokerId) : null,
    superAgentNickname: row.superAgentNickname || null,
    superAgentPpPokerId: row.superAgentPpPokerId
      ? String(row.superAgentPpPokerId)
      : null,

    // Ganhos NLHoldem (J-R)
    nlhRegular: toNumber(row.nlhRegular),
    nlhThreeOne: toNumber(row.nlhThreeOne),
    nlhThreeOneF: toNumber(row.nlhThreeOneF),
    nlhSixPlus: toNumber(row.nlhSixPlus),
    nlhAof: toNumber(row.nlhAof),
    nlhSitNGo: toNumber(row.nlhSitNGo),
    nlhSpinUp: toNumber(row.nlhSpinUp),
    nlhMtt: toNumber(row.nlhMtt),
    nlhMttSixPlus: toNumber(row.nlhMttSixPlus),

    // Ganhos PLO (S-AB)
    plo4: toNumber(row.plo4),
    plo5: toNumber(row.plo5),
    plo6: toNumber(row.plo6),
    plo4Hilo: toNumber(row.plo4Hilo),
    plo5Hilo: toNumber(row.plo5Hilo),
    plo6Hilo: toNumber(row.plo6Hilo),
    ploSitNGo: toNumber(row.ploSitNGo),
    ploMttPlo4: toNumber(row.ploMttPlo4),
    ploMttPlo5: toNumber(row.ploMttPlo5),
    ploNlh: toNumber(row.ploNlh),

    // Ganhos do Jogador - FLASH e outros (AC-AV)
    flashPlo4: toNumber(row.flashPlo4),
    flashPlo5: toNumber(row.flashPlo5),
    mixedGame: toNumber(row.mixedGame),
    ofc: toNumber(row.ofc),
    seka36: toNumber(row.seka36),
    seka32: toNumber(row.seka32),
    seka21: toNumber(row.seka21),
    teenPattiRegular: toNumber(row.teenPattiRegular),
    teenPattiAk47: toNumber(row.teenPattiAk47),
    teenPattiHukam: toNumber(row.teenPattiHukam),
    teenPattiMuflis: toNumber(row.teenPattiMuflis),
    tongits: toNumber(row.tongits),
    pusoy: toNumber(row.pusoy),
    caribbean: toNumber(row.caribbean),
    colorGame: toNumber(row.colorGame),
    crash: toNumber(row.crash),
    luckyDraw: toNumber(row.luckyDraw),
    jackpot: toNumber(row.jackpot),
    evSplitWinnings: toNumber(row.evSplitWinnings),
    totalWinnings: toNumber(row.totalWinnings),

    // Classificação (AW-AZ)
    classificationPpsr: toNumber(row.classificationPpsr),
    classificationRing: toNumber(row.classificationRing),
    classificationCustomRing: toNumber(row.classificationCustomRing),
    classificationMtt: toNumber(row.classificationMtt),

    // Valores Gerais (BA-BD)
    generalPlusEvents: toNumber(row.generalPlusEvents),
    ticketValueWon: toNumber(row.ticketValueWon),
    ticketBuyIn: toNumber(row.ticketBuyIn),
    customPrizeValue: toNumber(row.customPrizeValue),

    // Taxa NLHoldem (BE-BM)
    feeNlhRegular: toNumber(row.feeNlhRegular),
    feeNlhThreeOne: toNumber(row.feeNlhThreeOne),
    feeNlhThreeOneF: toNumber(row.feeNlhThreeOneF),
    feeNlhSixPlus: toNumber(row.feeNlhSixPlus),
    feeNlhAof: toNumber(row.feeNlhAof),
    feeNlhSitNGo: toNumber(row.feeNlhSitNGo),
    feeNlhSpinUp: toNumber(row.feeNlhSpinUp),
    feeNlhMtt: toNumber(row.feeNlhMtt),
    feeNlhMttSixPlus: toNumber(row.feeNlhMttSixPlus),

    // Taxa PLO (BN-BU)
    feePlo4: toNumber(row.feePlo4),
    feePlo5: toNumber(row.feePlo5),
    feePlo4Hilo: toNumber(row.feePlo4Hilo),
    feePlo5Hilo: toNumber(row.feePlo5Hilo),
    feePlo6Hilo: toNumber(row.feePlo6Hilo),
    feePloSitNGo: toNumber(row.feePloSitNGo),
    feePloMttPlo4: toNumber(row.feePloMttPlo4),
    feePloMttPlo5: toNumber(row.feePloMttPlo5),

    // Taxa FLASH e outros (BV-CJ)
    feeFlashNlh: toNumber(row.feeFlashNlh),
    feeFlashPlo4: toNumber(row.feeFlashPlo4),
    feeFlashPlo5: toNumber(row.feeFlashPlo5),
    feeMixedGame: toNumber(row.feeMixedGame),
    feeOfc: toNumber(row.feeOfc),
    feeSeka36: toNumber(row.feeSeka36),
    feeSeka32: toNumber(row.feeSeka32),
    feeSeka21: toNumber(row.feeSeka21),
    feeTeenPattiRegular: toNumber(row.feeTeenPattiRegular),
    feeTeenPattiAk47: toNumber(row.feeTeenPattiAk47),
    feeTeenPattiHukam: toNumber(row.feeTeenPattiHukam),
    feeTeenPattiMuflis: toNumber(row.feeTeenPattiMuflis),
    feeTongits: toNumber(row.feeTongits),
    feePusoy: toNumber(row.feePusoy),
    feeTotal: toNumber(row.feeTotal),

    // SPINUP (CK-CL)
    spinUpBuyIn: toNumber(row.spinUpBuyIn),
    spinUpPrize: toNumber(row.spinUpPrize),

    // Jackpot (CM-CN)
    jackpotFee: toNumber(row.jackpotFee),
    jackpotPrize: toNumber(row.jackpotPrize),

    // Dividir EV (CO-CQ)
    evSplitNlh: toNumber(row.evSplitNlh),
    evSplitPlo: toNumber(row.evSplitPlo),
    evSplitTotal: toNumber(row.evSplitTotal),

    // Valor ticket entregue (CR)
    ticketDeliveredValue: toNumber(row.ticketDeliveredValue),

    // Fichas (CS-CY)
    chipTicketBuyIn: toNumber(row.chipTicketBuyIn),
    chipSent: toNumber(row.chipSent),
    chipClassPpsr: toNumber(row.chipClassPpsr),
    chipClassRing: toNumber(row.chipClassRing),
    chipClassCustomRing: toNumber(row.chipClassCustomRing),
    chipClassMtt: toNumber(row.chipClassMtt),
    chipRedeemed: toNumber(row.chipRedeemed),

    // Dar Crédito (CZ-DC)
    creditLeftClub: toNumber(row.creditLeftClub),
    creditSent: toNumber(row.creditSent),
    creditRedeemed: toNumber(row.creditRedeemed),
    creditLeftClub2: toNumber(row.creditLeftClub2),

    // Mãos NLH (DD-DH)
    handsNlhRegular: toNumber(row.handsNlhRegular),
    handsNlhThreeOne: toNumber(row.handsNlhThreeOne),
    handsNlhThreeOneF: toNumber(row.handsNlhThreeOneF),
    handsNlhSixPlus: toNumber(row.handsNlhSixPlus),
    handsNlhAof: toNumber(row.handsNlhAof),

    // Mãos PLO (DI-DN)
    handsPlo4: toNumber(row.handsPlo4),
    handsPlo5: toNumber(row.handsPlo5),
    handsPlo6: toNumber(row.handsPlo6),
    handsPlo4Hilo: toNumber(row.handsPlo4Hilo),
    handsPlo5Hilo: toNumber(row.handsPlo5Hilo),
    handsPlo6Hilo: toNumber(row.handsPlo6Hilo),

    // Mãos FLASH (DO-DQ)
    handsFlashNlh: toNumber(row.handsFlashNlh),
    handsFlashPlo4: toNumber(row.handsFlashPlo4),
    handsFlashPlo5: toNumber(row.handsFlashPlo5),

    // Mãos outros (DR-EG)
    handsMixedGame: toNumber(row.handsMixedGame),
    handsOfc: toNumber(row.handsOfc),
    handsSeka36: toNumber(row.handsSeka36),
    handsSeka32: toNumber(row.handsSeka32),
    handsSeka21: toNumber(row.handsSeka21),
    handsTeenPattiRegular: toNumber(row.handsTeenPattiRegular),
    handsTeenPattiAk47: toNumber(row.handsTeenPattiAk47),
    handsTeenPattiHukam: toNumber(row.handsTeenPattiHukam),
    handsTeenPattiMuflis: toNumber(row.handsTeenPattiMuflis),
    handsTongits: toNumber(row.handsTongits),
    handsPusoy: toNumber(row.handsPusoy),
    handsCaribbean: toNumber(row.handsCaribbean),
    handsColorGame: toNumber(row.handsColorGame),
    handsCrash: toNumber(row.handsCrash),
    handsLuckyDraw: toNumber(row.handsLuckyDraw),
    handsTotal: toNumber(row.handsTotal),
  }));
}

// PPPoker Detalhes do usuário sheet column mapping (0-indexed)
const USER_DETAILS_COLUMNS = {
  lastActiveAt: 0, // A - Última conexão
  ppPokerId: 1, // B - ID do jogador
  country: 2, // C - País/região
  nickname: 3, // D - Apelido
  memoName: 4, // E - Nome de memorando
  chipBalance: 5, // F - Saldo de fichas PP
  agentNickname: 6, // G - Agente
  agentPpPokerId: 7, // H - ID do agente
  agentCreditBalance: 8, // I - Saldo de crédito do agente
  superAgentNickname: 9, // J - Superagente
  superAgentPpPokerId: 10, // K - ID do superagente
  superAgentCreditBalance: 11, // L - Saldo de crédito do superagente
};

// Parser for PPPoker "Detalhes do usuário" (User Details) sheet - Player list
function parseUserDetailsSheet(data: any[], sheet?: XLSX.Sheet): any[] {
  // If we have the sheet, use position-based parsing for accuracy
  if (sheet) {
    const rawData = parseSheetByPosition(sheet, USER_DETAILS_COLUMNS, 3);
    return rawData.map((row) => ({
      ppPokerId: String(row.ppPokerId || ""),
      nickname: row.nickname || "",
      memoName: row.memoName || null,
      country: row.country || null,
      agentNickname: row.agentNickname || null,
      agentPpPokerId: row.agentPpPokerId ? String(row.agentPpPokerId) : null,
      superAgentNickname: row.superAgentNickname || null,
      superAgentPpPokerId: row.superAgentPpPokerId
        ? String(row.superAgentPpPokerId)
        : null,
      chipBalance: parseFloat(row.chipBalance || 0),
      agentCreditBalance: parseFloat(row.agentCreditBalance || 0),
      superAgentCreditBalance: parseFloat(row.superAgentCreditBalance || 0),
      lastActiveAt: row.lastActiveAt || null,
    }));
  }

  // Fallback to header-based parsing
  return data
    .filter((row) => {
      const id = row["ID do jogador"] || row["Player ID"] || row["ID"];
      return id && !isNaN(Number(id));
    })
    .map((row) => ({
      ppPokerId: String(
        row["ID do jogador"] || row["Player ID"] || row["ID"] || ""
      ),
      nickname: row["Apelido"] || row["Nickname"] || "",
      memoName: row["Nome de memorando"] || row["Memo Name"] || null,
      country: row["País/região"] || row["Country"] || null,
      agentNickname: row["Agente"] || row["Agent"] || null,
      agentPpPokerId: row["ID do agente"] || row["Agent ID"] || null,
      chipBalance: parseFloat(row["Saldo de fichas"] || row["Chip Balance"] || 0),
      agentCreditBalance: parseFloat(
        row["Crédito do agente"] || row["Agent Credit"] || 0
      ),
      superAgentCreditBalance: parseFloat(
        row["Saldo de crédito do superagente"] || row["Super Agent Credit"] || 0
      ),
      lastActiveAt: row["Última atividade"] || row["Last Active"] || null,
    }));
}

const TRANSACOES_COLUMNS = {
  occurredAt: 0, // A - Tempo
  senderClubId: 1, // B - Remetente: ID de clube
  senderPlayerId: 2, // C - Remetente: ID do jogador
  senderNickname: 3, // D - Remetente: Apelido
  senderMemoName: 4, // E - Remetente: Nome de memorando
  recipientPlayerId: 5, // F - Destinatário: ID do jogador
  recipientNickname: 6, // G - Destinatário: Apelido
  recipientMemoName: 7, // H - Destinatário: Nome de memorando
  creditSent: 8, // I - Dar crédito: Enviado
  creditRedeemed: 9, // J - Dar crédito: Resgatado
  creditLeftClub: 10, // K - Dar crédito: Saiu do clube
  chipsSent: 11, // L - Fichas: Enviado
  classificationPpsr: 12, // M - Fichas: Classificação PPSR
  classificationRing: 13, // N - Fichas: Classificação Ring Game
  classificationCustomRing: 14, // O - Fichas: Classificação de RG Personalizado
  classificationMtt: 15, // P - Fichas: Classificação MTT
  chipsRedeemed: 16, // Q - Fichas: Resgatado
  chipsLeftClub: 17, // R - Fichas: Saiu do clube
  ticketSent: 18, // S - Ticket: Enviado
  ticketRedeemed: 19, // T - Ticket: Resgatado
  ticketExpired: 20, // U - Ticket: Expirado
};

function parseTransacoesSheet(data: any[], sheet?: XLSX.Sheet): any[] {
  if (sheet) {
    const rawData = parseSheetByPosition(
      sheet,
      TRANSACOES_COLUMNS,
      3,
      (row) => Boolean(row.occurredAt)
    );
    return rawData.map((row) => ({
      occurredAt: row.occurredAt ? String(row.occurredAt) : "",
      clubId: row.senderClubId ? String(row.senderClubId) : null,
      senderClubId: row.senderClubId ? String(row.senderClubId) : null,
      playerId: row.senderPlayerId ? String(row.senderPlayerId) : null, // mantido para compatibilidade
      senderNickname: row.senderNickname || null,
      senderMemoName: row.senderMemoName || null,
      senderPlayerId: row.senderPlayerId ? String(row.senderPlayerId) : null,
      recipientNickname: row.recipientNickname || null,
      recipientMemoName: row.recipientMemoName || null,
      recipientPlayerId: row.recipientPlayerId ? String(row.recipientPlayerId) : null,
      creditSent: toNumber(row.creditSent),
      creditRedeemed: toNumber(row.creditRedeemed),
      creditLeftClub: toNumber(row.creditLeftClub),
      chipsSent: toNumber(row.chipsSent),
      classificationPpsr: toNumber(row.classificationPpsr),
      classificationRing: toNumber(row.classificationRing),
      classificationCustomRing: toNumber(row.classificationCustomRing),
      classificationMtt: toNumber(row.classificationMtt),
      chipsRedeemed: toNumber(row.chipsRedeemed),
      chipsLeftClub: toNumber(row.chipsLeftClub),
      ticketSent: toNumber(row.ticketSent),
      ticketRedeemed: toNumber(row.ticketRedeemed),
      ticketExpired: toNumber(row.ticketExpired),
    }));
  }

  return data
    .filter((row) => row["Tempo"] || row["Data"] || row["Date"])
    .map((row) => ({
      occurredAt: row["Tempo"] || row["Data"] || row["Date"] || "",
      clubId: row["ID de clube"] || row["Club ID"] || null,
      senderClubId: row["ID de clube"] || row["Club ID"] || null,
      playerId: row["ID do jogador"] || row["Player ID"] || null,
      senderNickname: row["Apelido"] || row["Sender Nickname"] || null,
      senderMemoName: row["Nome de memorando"] || row["Sender Memo"] || null,
      senderPlayerId: row["ID do jogador (remetente)"] || row["Sender ID"] || null,
      recipientNickname: row["Apelido do destinatário"] || row["Recipient Nickname"] || null,
      recipientMemoName: row["Nome de memorando do destinatário"] || row["Recipient Memo"] || null,
      recipientPlayerId: row["ID do jogador"] || row["Player ID"] || null,
      creditSent: toNumber(row["Enviado"] || row["Credit Sent"]),
      creditRedeemed: toNumber(row["Resgatado"] || row["Credit Redeemed"]),
      creditLeftClub: toNumber(row["Saiu do clube"] || row["Left Club"]),
      chipsSent: toNumber(row["Fichas enviadas"] || row["Chips Sent"]),
      classificationPpsr: toNumber(row["Classificação PPSR"] || 0),
      classificationRing: toNumber(row["Classificação Ring Game"] || 0),
      classificationCustomRing: toNumber(row["Classificação de RG Personalizado"] || 0),
      classificationMtt: toNumber(row["Classificação MTT"] || 0),
      chipsRedeemed: toNumber(row["Fichas resgatadas"] || row["Chips Redeemed"]),
      chipsLeftClub: toNumber(row["Fichas saíram do clube"] || row["Chips Left Club"]),
      ticketSent: toNumber(row["Ticket enviado"] || row["Ticket Sent"]),
      ticketRedeemed: toNumber(row["Ticket resgatado"] || row["Ticket Redeemed"]),
      ticketExpired: toNumber(row["Ticket expirado"] || row["Ticket Expired"]),
    }));
}

const DEMONSTRATIVO_COLUMNS = {
  occurredAt: 0, // A
  ppPokerId: 1, // B
  nickname: 2, // C
  memoName: 3, // D
  type: 4, // E
  amount: 5, // F
};

function parseDemonstrativoSheet(sheet: XLSX.Sheet): any[] {
  const rawData = parseSheetByPosition(
    sheet,
    DEMONSTRATIVO_COLUMNS,
    2,
    (row) => Boolean(row.ppPokerId || row.occurredAt)
  );
  return rawData.map((row) => ({
    occurredAt: row.occurredAt ? String(row.occurredAt) : "",
    ppPokerId: row.ppPokerId ? String(row.ppPokerId) : "",
    nickname: row.nickname || "",
    memoName: row.memoName || null,
    type: row.type || null,
    amount: toNumber(row.amount),
  }));
}

// Parser for PPPoker "Retorno de taxa" (Fee Return/Rakeback) sheet
// Column A is empty, data starts at B
const RAKEBACK_COLUMNS = {
  superAgentPpPokerId: 1, // B - ID do superagente
  agentPpPokerId: 2, // C - ID do agente
  country: 3, // D - País/região
  agentNickname: 4, // E - Apelido
  memoName: 5, // F - Nome de memorando
  averageRakebackPercent: 6, // G - Retorno% médio de taxa
  totalRt: 7, // H - Total de RT
};

function parseRakebackSheet(data: any[], sheet?: XLSX.Sheet): any[] {
  if (sheet) {
    const rawData = parseSheetByPosition(
      sheet,
      RAKEBACK_COLUMNS,
      2,
      (row) => Boolean(row.agentPpPokerId)
    );
    return rawData
      .filter((row) => row.agentPpPokerId && !isNaN(Number(row.agentPpPokerId)))
      .map((row) => ({
        agentPpPokerId: String(row.agentPpPokerId || ""),
        agentNickname: row.agentNickname || "",
        country: row.country || null,
        memoName: row.memoName || null,
        superAgentPpPokerId: row.superAgentPpPokerId
          ? String(row.superAgentPpPokerId)
          : null,
        averageRakebackPercent: toNumber(row.averageRakebackPercent),
        totalRt: toNumber(row.totalRt),
      }));
  }

  return data
    .filter((row) => {
      const id = row["ID do agente"] || row["Agent ID"];
      return id && !isNaN(Number(id));
    })
    .map((row) => ({
      agentPpPokerId: String(row["ID do agente"] || row["Agent ID"] || ""),
      agentNickname: row["Apelido"] || row["Agent Nickname"] || "",
      country: row["País/região"] || row["Country"] || null,
      memoName: row["Nome de memorando"] || row["Memo Name"] || null,
      superAgentPpPokerId: row["ID do superagente"] || row["Super Agent ID"] || null,
      averageRakebackPercent: parseFloat(
        row["Retorno% médio de taxa"] || row["Retorno médio"] || row["Avg Rakeback %"] || 0
      ),
      totalRt: parseFloat(row["Total de RT"] || row["Total RT"] || 0),
    }));
}

// Parse all sheets from a PPPoker Excel workbook
function parseExcelWorkbook(workbook: XLSX.WorkBook): ParsedImportData {
  const result: ParsedImportData = {};
  const sheetNames = workbook.SheetNames;

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const normalizedName = sheetName.toLowerCase().trim();

    // Match PPPoker sheet names (Portuguese and English)
    // Pass sheet object for position-based parsing
    if (normalizedName === "geral" || normalizedName === "general") {
      result.summaries = parseGeralSheet([], sheet);
    } else if (
      normalizedName === "detalhes do usuário" ||
      normalizedName === "user details" ||
      normalizedName.includes("usuário") ||
      normalizedName.includes("user")
    ) {
      result.players = parseUserDetailsSheet([], sheet);
    } else if (
      normalizedName === "transações" ||
      normalizedName === "transactions"
    ) {
      const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
      if (data && data.length > 0) {
        result.transactions = parseTransacoesSheet(data as any[], sheet);
      }
    } else if (
      normalizedName === "retorno de taxa" ||
      normalizedName === "fee return" ||
      normalizedName.includes("rakeback")
    ) {
      const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
      if (data && data.length > 0) {
        result.rakebacks = parseRakebackSheet(data as any[], sheet);
      }
    } else if (normalizedName === "partidas" || normalizedName === "matches") {
      const { sessions, utcCount } = parsePartidasSheet(sheet);
      result.sessions = sessions;
      result.sessionsUtcCount = utcCount;
    } else if (normalizedName === "detalhado" || normalizedName === "detailed") {
      result.detailed = parseDetalhadoSheet(sheet);
    } else if (normalizedName === "demonstrativo" || normalizedName === "statement") {
      result.demonstrativo = parseDemonstrativoSheet(sheet);
    }
  }

  return result;
}

// Auto-detect sheet type and parse accordingly
function detectAndParseData(data: any[]): ParsedImportData {
  if (!data || data.length === 0) {
    return {};
  }

  const firstRow = data[0];
  const headers = Object.keys(firstRow).map((h) => h.toLowerCase());

  // Detect type based on headers
  if (
    headers.some((h) => h.includes("credit sent") || h.includes("chips sent"))
  ) {
    return { transactions: parseTransactionSheet(data) };
  }

  if (
    headers.some((h) => h.includes("session id") || h.includes("game type"))
  ) {
    return { sessions: parseSessionSheet(data) };
  }

  if (
    headers.some((h) => h.includes("total winnings") || h.includes("total rake"))
  ) {
    return { summaries: parseSummarySheet(data) };
  }

  // Default: assume it's a member list
  if (
    headers.some((h) => h.includes("pppoker") || h.includes("nickname"))
  ) {
    return { players: parseClubMemberSheet(data) };
  }

  return {};
}

export function ImportUploader() {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Validation modal state
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [parsedDataForValidation, setParsedDataForValidation] = useState<ParsedImportData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const [currentFileType, setCurrentFileType] = useState<string>("");

  const createImportMutation = useMutation(
    trpc.poker.imports.create.mutationOptions({
      onError: (error) => {
        toast({
          title: t("poker.import.uploadError"),
          description: error.message,
          variant: "error",
        });
      },
    })
  );

  const validateImportMutation = useMutation(
    trpc.poker.imports.validate.mutationOptions({
      onError: (error) => {
        toast({
          title: "Erro na validação",
          description: error.message,
          variant: "error",
        });
      },
    })
  );

  const processImportMutation = useMutation(
    trpc.poker.imports.process.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poker", "imports"] });
        queryClient.invalidateQueries({ queryKey: ["poker", "players"] });
        queryClient.invalidateQueries({ queryKey: ["poker", "sessions"] });
        queryClient.invalidateQueries({ queryKey: ["poker", "agents"] });
        toast({
          title: t("poker.import.uploadSuccess"),
          variant: "success",
        });
        // Close modal and reset state
        setValidationModalOpen(false);
        setParsedDataForValidation(null);
        setValidationResult(null);
      },
      onError: (error) => {
        toast({
          title: "Erro no processamento",
          description: error.message,
          variant: "error",
        });
      },
    })
  );

  const handleApproveImport = useCallback(async () => {
    if (!parsedDataForValidation) return;

    setIsImporting(true);
    try {
      // Step 1: Create the import record
      const { id: importId } = await createImportMutation.mutateAsync({
        fileName: currentFileName,
        fileSize: currentFileSize,
        fileType: currentFileType,
        rawData: parsedDataForValidation,
      });

      // Step 2: Validate the import
      const validationResult = await validateImportMutation.mutateAsync({ id: importId });

      if (!validationResult.validationPassed) {
        toast({
          title: "Validação falhou",
          description: `${validationResult.errors.length} erro(s) encontrado(s)`,
          variant: "error",
        });
        return;
      }

      // Step 3: Process the import (save to database tables)
      await processImportMutation.mutateAsync({ id: importId });

    } catch (error) {
      // Errors are handled by individual mutation onError callbacks
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
    }
  }, [parsedDataForValidation, currentFileName, currentFileSize, currentFileType, createImportMutation, validateImportMutation, processImportMutation, toast]);

  const handleRejectImport = useCallback(() => {
    setValidationModalOpen(false);
    setParsedDataForValidation(null);
    setValidationResult(null);
    toast({
      title: t("poker.import.cancelled"),
      variant: "default",
    });
  }, [toast, t]);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);

      // Show processing toast (Vault style)
      const { dismiss } = toast({
        variant: "spinner",
        title: t("poker.import.processing"),
        description: file.name,
        duration: Number.POSITIVE_INFINITY,
      });

      try {
        const fileType = file.name.endsWith(".csv") ? "csv" : "xlsx";
        let parsedData: ParsedImportData = {};

        if (fileType === "csv") {
          const text = await file.text();
          const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          });

          if (result.errors.length > 0) {
            throw new Error(result.errors[0].message);
          }

          parsedData = detectAndParseData(result.data as any[]);
        } else {
          // Parse Excel file
          // cellFormula: true preserva fórmulas, cellStyles: true ajuda com valores calculados
          const arrayBuffer = await file.arrayBuffer();

          // Micro-delay para permitir UI atualizar antes do parse pesado
          await new Promise((resolve) => setTimeout(resolve, 0));

          const workbook = XLSX.read(arrayBuffer, {
            type: "array",
            cellFormula: true,
            cellStyles: true,
            cellDates: true,
          });

          // Micro-delay após parse para UI continuar responsiva
          await new Promise((resolve) => setTimeout(resolve, 0));

          // Extract period from Geral sheet header if available
          const geralSheet = workbook.Sheets["Geral"] || workbook.Sheets["General"];
          if (geralSheet) {
            const periodCell = geralSheet["A3"];
            if (periodCell && periodCell.v) {
              const periodMatch = periodCell.v.match(/(\d{4}\/\d{2}\/\d{2})\s*-\s*(\d{4}\/\d{2}\/\d{2})/);
              if (periodMatch) {
                parsedData.periodStart = periodMatch[1].replace(/\//g, "-");
                parsedData.periodEnd = periodMatch[2].replace(/\//g, "-");
              }
            }
          }

          // Parse all sheets from PPPoker export
          const sheetData = parseExcelWorkbook(workbook);
          parsedData = { ...parsedData, ...sheetData };

          // Micro-delay para UI continuar responsiva
          await new Promise((resolve) => setTimeout(resolve, 0));

          // If no PPPoker sheets found, try auto-detect on first sheet
          if (
            !parsedData.players?.length &&
            !parsedData.transactions?.length &&
            !parsedData.summaries?.length &&
            !parsedData.rakebacks?.length
          ) {
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(firstSheet, { defval: null });
            parsedData = { ...parsedData, ...detectAndParseData(data as any[]) };
          }
        }

        // Add file metadata
        parsedData.fileName = file.name;
        parsedData.fileSize = file.size;

        const hasData =
          (parsedData.players?.length ?? 0) > 0 ||
          (parsedData.transactions?.length ?? 0) > 0 ||
          (parsedData.sessions?.length ?? 0) > 0 ||
          (parsedData.summaries?.length ?? 0) > 0 ||
          (parsedData.detailed?.length ?? 0) > 0 ||
          (parsedData.demonstrativo?.length ?? 0) > 0 ||
          (parsedData.rakebacks?.length ?? 0) > 0;

        if (!hasData) {
          throw new Error(t("poker.import.noDataFound"));
        }

        // Validate the data
        const validation = validateImportData(parsedData);

        // Store data for validation modal
        setCurrentFileName(file.name);
        setCurrentFileSize(file.size);
        setCurrentFileType(fileType);
        setParsedDataForValidation(parsedData);
        setValidationResult(validation);
        setValidationModalOpen(true);

        // Dismiss processing toast
        dismiss();
      } catch (error: any) {
        dismiss();
        toast({
          title: t("poker.import.parseError"),
          description: error.message,
          variant: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast, t]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      processFile(acceptedFiles[0]);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <>
      {/* Drop zone wrapper */}
      <div
        className="relative h-full"
        {...getRootProps({ onClick: (evt) => evt.stopPropagation() })}
      >
        {/* Drag overlay */}
        <div className="absolute top-0 right-0 left-0 z-[51] w-full pointer-events-none h-[calc(100vh-150px)]">
          <div
            className={cn(
              "bg-background dark:bg-[#1A1A1A] h-full w-full flex items-center justify-center text-center transition-opacity",
              isDragActive ? "visible opacity-100" : "invisible opacity-0"
            )}
          >
            <input {...getInputProps()} id="upload-club-file" />
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-sm">{t("poker.import.dropHere")}</p>
              <span className="text-xs text-[#878787]">
                {t("poker.import.supportedFormats")}
              </span>
            </div>
          </div>
        </div>

        {/* Empty state - Vault style */}
        <div className="h-[calc(100vh-250px)] flex items-center justify-center">
          <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col">
            <div className="flex w-full flex-col relative text-center">
              <div className="pb-4">
                <h2 className="font-medium text-lg">
                  {t("poker.import.empty_title")}
                </h2>
              </div>

              <p className="pb-6 text-sm text-[#878787]">
                {t("poker.import.empty_description")}
              </p>

              <button
                type="button"
                onClick={() => document.getElementById("upload-club-file")?.click()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                {t("poker.import.upload")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Modal */}
      {parsedDataForValidation && validationResult && (
        <ImportValidationModal
          open={validationModalOpen}
          onOpenChange={setValidationModalOpen}
          parsedData={parsedDataForValidation}
          validationResult={validationResult}
          onApprove={handleApproveImport}
          onReject={handleRejectImport}
          isProcessing={isImporting}
        />
      )}
    </>
  );
}

ImportUploader.Skeleton = function ImportUploaderSkeleton() {
  return <Skeleton className="h-48 w-full rounded-lg" />;
};
