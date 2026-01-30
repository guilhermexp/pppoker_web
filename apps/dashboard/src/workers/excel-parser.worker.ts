/// <reference lib="webworker" />

import * as XLSX from "xlsx";

// ============================================================================
// HELPER FUNCTIONS (copied from league-import-uploader to keep worker self-contained)
// ============================================================================

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const str = value.toString().trim();
  if (str.includes(",")) {
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const parsed = Number.parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const parsed = Number.parseFloat(str);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseSlashValue(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const str = String(value).trim();
  if (str === "/" || str === "-" || str === "") return null;
  return toNumber(str);
}

// ============================================================================
// Message types for type-safety
// ============================================================================

export type WorkerMessage =
  | { type: "parse"; buffer: ArrayBuffer; fileName: string; fileSize: number }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "progress"; stage: string; percent: number }
  | { type: "success"; data: any }
  | { type: "error"; message: string };

// ============================================================================
// PARSER: GERAL DO PPST
// ============================================================================

function parseGeralPPSTSheet(sheet: XLSX.WorkSheet): {
  blocos: any[];
  periodStart: string | null;
  periodEnd: string | null;
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const blocos: any[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  let currentBloco: any | null = null;
  let currentPeriodo: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const cellA = String(row[0] || "").trim();
    const cellB = String(row[1] || "").trim();

    if (cellA.toLowerCase().includes("esta planilha é feita pelo pppoker")) {
      continue;
    }

    if (cellA.toLowerCase().includes("taxa de câmbio")) {
      const match = cellA.match(
        /(Liga|SuperUnion)\s+(\d+)\s+Taxa de câmbio das fichas\s+(\d+:\d+)/i,
      );
      if (match) {
        if (currentBloco && currentBloco.ligas.length > 0) {
          blocos.push(currentBloco);
        }

        currentBloco = {
          contexto: {
            entidadeTipo: match[1],
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

    if (
      cellA.toLowerCase().includes("superunion") ||
      cellB.toLowerCase().includes("nome da liga") ||
      cellB.toLowerCase().includes("ganhos")
    ) {
      continue;
    }

    if (cellB.toLowerCase() === "total") {
      continue;
    }

    const ligaId = parseSlashValue(row[3]);
    if (ligaId && !Number.isNaN(ligaId) && currentBloco) {
      if (currentBloco.ligas.length === 0) {
        const gapValue = toNumber(row[14]);
        if (gapValue !== 0) {
          currentBloco.total.gapGarantido = gapValue;
        }
      }

      const ganhosLigaTaxa = toNumber(row[9]);
      const buyinSpinup = toNumber(row[10]);
      const premiacaoSpinup = toNumber(row[11]);
      const valorTicketEntregue = toNumber(row[12]);
      const buyinTicketLiga = toNumber(row[13]);
      let ganhosLigaGeral = toNumber(row[8]);

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

      const liga = {
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

  if (currentBloco && currentBloco.ligas.length > 0) {
    blocos.push(currentBloco);
  }

  for (const bloco of blocos) {
    const savedGap = bloco.total.gapGarantido;
    bloco.total = {
      ganhosJogador: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosJogador,
        0,
      ),
      valorTicketGanho: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.valorTicketGanho,
        0,
      ),
      buyinTicket: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.buyinTicket,
        0,
      ),
      valorPremioPersonalizado: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.valorPremioPersonalizado,
        0,
      ),
      ganhosLigaGeral: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosLigaGeral,
        0,
      ),
      ganhosLigaTaxa: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosLigaTaxa,
        0,
      ),
      buyinSpinup: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.buyinSpinup,
        0,
      ),
      premiacaoSpinup: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.premiacaoSpinup,
        0,
      ),
      valorTicketEntregue: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.valorTicketEntregue,
        0,
      ),
      buyinTicketLiga: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.buyinTicketLiga,
        0,
      ),
      gapGarantido: savedGap,
    };
  }

  return { blocos, periodStart, periodEnd };
}

// ============================================================================
// PARSER: GERAL DO PPSR (Cash Games)
// ============================================================================

function parseGeralPPSRSheet(sheet: XLSX.WorkSheet): {
  blocos: any[];
  periodStart: string | null;
  periodEnd: string | null;
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const blocos: any[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  let currentBloco: any | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const cellA = String(row[0] || "").trim();
    const cellB = String(row[1] || "").trim();
    const cellC = String(row[2] || "").trim();

    if (cellA.toLowerCase().includes("esta planilha é feita pelo pppoker")) {
      continue;
    }

    const contextText =
      cellA.toLowerCase().includes("taxa") &&
      cellA.toLowerCase().includes("câmbio")
        ? cellA
        : cellB.toLowerCase().includes("taxa") &&
            cellB.toLowerCase().includes("câmbio")
          ? cellB
          : null;
    if (contextText) {
      const match = contextText.match(
        /(Liga|SuperUnion)\s+(\d+)\s+Taxa\s+de\s+câmbio\s+das\s+fichas\s+(\d+:\d+)/i,
      );
      if (match) {
        if (currentBloco && currentBloco.ligas.length > 0) {
          blocos.push(currentBloco);
        }

        currentBloco = {
          contexto: {
            entidadeTipo: match[1],
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

    if (cellB.toLowerCase() === "total" || cellA.toLowerCase() === "total") {
      continue;
    }

    const ligaId = parseSlashValue(row[3]);

    if (ligaId && !Number.isNaN(ligaId) && currentBloco) {
      const ganhosJogadorDeAdversarios = toNumber(row[6]);
      const ganhosJogadorDeJackpot = toNumber(row[7]);
      const ganhosJogadorDeDividirEV = toNumber(row[8]);
      let ganhosJogadorGeral = toNumber(row[5]);

      const ganhosLigaTaxa = toNumber(row[10]);
      const ganhosLigaTaxaJackpot = toNumber(row[11]);
      const ganhosLigaPremioJackpot = toNumber(row[12]);
      const ganhosLigaDividirEV = toNumber(row[13]);
      let ganhosLigaGeral = toNumber(row[9]);

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

      const liga = {
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

  if (currentBloco && currentBloco.ligas.length > 0) {
    blocos.push(currentBloco);
  }

  for (const bloco of blocos) {
    bloco.total = {
      ganhosJogadorGeral: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosJogadorGeral,
        0,
      ),
      ganhosJogadorDeAdversarios: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosJogadorDeAdversarios,
        0,
      ),
      ganhosJogadorDeJackpot: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosJogadorDeJackpot,
        0,
      ),
      ganhosJogadorDeDividirEV: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosJogadorDeDividirEV,
        0,
      ),
      ganhosLigaGeral: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosLigaGeral,
        0,
      ),
      ganhosLigaTaxa: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosLigaTaxa,
        0,
      ),
      ganhosLigaTaxaJackpot: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosLigaTaxaJackpot,
        0,
      ),
      ganhosLigaPremioJackpot: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosLigaPremioJackpot,
        0,
      ),
      ganhosLigaDividirEV: bloco.ligas.reduce(
        (sum: number, l: any) => sum + l.ganhosLigaDividirEV,
        0,
      ),
    };
  }

  return { blocos, periodStart, periodEnd };
}

// ============================================================================
// PARSER: JOGOS PPST
// ============================================================================

function parseJogosPPSTSheet(
  sheet: XLSX.WorkSheet,
  postProgress: (stage: string, percent: number) => void,
): {
  jogos: any[];
  inicioCount: number;
  unknownGameFormats: any[];
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

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

  const jogos: any[] = [];
  const seenGameIds = new Set<string>();
  const unknownGameFormats: any[] = [];
  let currentJogo: any | null = null;
  let currentMetadata: any = {};
  let headerLineIndex = -1;
  let gamesFoundCount = 0;

  const totalRows = rows.length;
  let lastProgressReport = 0;

  for (let i = 0; i < rows.length; i++) {
    // Report progress every 5%
    const currentProgress = Math.floor((i / totalRows) * 100);
    if (currentProgress >= lastProgressReport + 5) {
      lastProgressReport = currentProgress;
      postProgress(
        "Processando jogos PPST",
        40 + Math.floor(currentProgress * 0.3),
      );
    }

    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowStr = row.map((cell) => String(cell || "").trim());

    if (
      rowStr[0].toLowerCase().includes("esta planilha é feita pelo pppoker")
    ) {
      continue;
    }

    const rowJoined = rowStr.join(" ");
    const inicioMatch = rowJoined.match(
      /Início:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})\s*By\s*(\w+)\((\d+)\)\s*Fim:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})/i,
    );
    if (inicioMatch) {
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
      currentMetadata.nomeMesa = idJogoMatch[2].replace(/\?+/g, "").trim();
      continue;
    }

    const tipoJogoMatch = rowJoined.match(
      /((?:PPST|MTT)\/[A-Z0-9+]+(?:\s+(?:PKO|MKO|KO|Satellite|HYPER|TURBO))?)\s+Buy-in:?\s*(\d+(?:[.,]\d+)?)(?:\+(\d+(?:[.,]\d+)?))?(?:\+(\d+(?:[.,]\d+)?))?/i,
    );

    if (
      !tipoJogoMatch &&
      currentMetadata.idJogo &&
      rowJoined.includes("Buy-in")
    ) {
      const gameTypePatternMatch = rowJoined.match(
        /^([A-Z]+\/[A-Z0-9+]+(?:\s+(?:PKO|MKO|KO|Satellite|HYPER|TURBO))?)\s+Buy-in/i,
      );
      if (gameTypePatternMatch) {
        unknownGameFormats.push({
          gameId: currentMetadata.idJogo,
          rawText: rowJoined.substring(0, 200).trim(),
          rowIndex: i,
        });
      }
    }

    if (tipoJogoMatch) {
      if (!currentMetadata.idJogo) {
        continue;
      }

      gamesFoundCount++;

      const isSatellite = /Satellite/i.test(rowJoined);
      const isKnockout = /\b(PKO|MKO|KO)\b/i.test(tipoJogoMatch[1]);
      const premiacaoMatch = rowJoined.match(/Premiação\s*Garantida:\s*(\d+)/i);

      const parseBuyinPart = (val: string) =>
        Number.parseFloat(val.replace(",", "."));
      const buyinPart1 = parseBuyinPart(tipoJogoMatch[2]);
      const buyinPart2 = tipoJogoMatch[3]
        ? parseBuyinPart(tipoJogoMatch[3])
        : undefined;
      const buyinPart3 = tipoJogoMatch[4]
        ? parseBuyinPart(tipoJogoMatch[4])
        : undefined;

      let buyInBase: number;
      let buyInBounty: number | undefined;
      let buyInTaxa: number;

      if (buyinPart3 !== undefined) {
        buyInBase = buyinPart1;
        buyInBounty = buyinPart2;
        buyInTaxa = buyinPart3;
      } else if (buyinPart2 !== undefined) {
        buyInBase = buyinPart1;
        buyInTaxa = buyinPart2;
      } else {
        buyInBase = buyinPart1;
        buyInTaxa = 0;
      }

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

      // DEBUG: Log quando encontra GTD
      if (currentMetadata.premiacaoGarantida) {
        console.log(
          "DEBUG GTD FOUND:",
          JSON.stringify({
            rowIndex: i,
            idJogo: currentMetadata.idJogo,
            nomeMesa: currentMetadata.nomeMesa,
            tipoJogo: currentMetadata.tipoJogo,
            premiacaoGarantida: currentMetadata.premiacaoGarantida,
            rawMatch: premiacaoMatch ? premiacaoMatch[0] : null,
          }),
        );
      }

      currentJogo = {
        metadata: { ...currentMetadata },
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

    if (headerLineIndex !== -1 && i === headerLineIndex + 1) {
      continue;
    }

    const rowLower = rowStr.map((s) => s?.toLowerCase() || "");

    // Detecta "Liga Total" - pode estar na coluna 5 (nome mesa) ou 8 (ranking)
    const isLigaTotal =
      rowStr[5]?.toLowerCase() === "liga total" ||
      rowStr[8]?.toLowerCase() === "liga total";
    if (isLigaTotal && currentJogo) {
      // Linha "Liga Total" - captura totais por liga
      const ligaId = toNumber(row[2]);
      if (ligaId > 0) {
        const subtipo = currentJogo.metadata.subtipo;
        const isSpinup = currentJogo.metadata.tipoJogo?.includes("SPINUP");

        const totalLiga: any = {
          ligaId,
          buyinFichas: toNumber(row[9]),
          ganhos: toNumber(row[11]),
        };

        if (isSpinup) {
          totalLiga.premio = toNumber(row[10]);
        } else if (subtipo === "satellite") {
          totalLiga.buyinTicket = toNumber(row[10]);
          totalLiga.valorTicket = toNumber(row[13]);
          totalLiga.taxa = toNumber(row[14]);
          totalLiga.gapGarantido = parseSlashValue(row[15]);
        } else if (subtipo === "knockout") {
          totalLiga.buyinTicket = toNumber(row[10]);
          totalLiga.recompensa = toNumber(row[12]);
          totalLiga.taxa = toNumber(row[13]);
          totalLiga.gapGarantido = parseSlashValue(row[14]);
        } else {
          totalLiga.buyinTicket = toNumber(row[10]);
          totalLiga.taxa = toNumber(row[12]);
          totalLiga.gapGarantido = parseSlashValue(row[13]);
        }

        currentJogo.totaisPorLiga.push(totalLiga);
      }
      continue;
    }

    // Detecta "Total" ou "Total Geral" - pode estar na coluna 5 (nome mesa) ou 8 (ranking)
    const isTotalGeral =
      rowStr[5]?.toLowerCase() === "total geral" ||
      rowStr[5]?.toLowerCase() === "total" ||
      rowStr[8]?.toLowerCase() === "total";
    if (isTotalGeral && currentJogo) {
      // Linha "Total" (Total Geral) - captura o valor da fórmula diretamente da planilha
      const subtipo = currentJogo.metadata.subtipo;
      const isSpinup = currentJogo.metadata.tipoJogo?.includes("SPINUP");

      currentJogo.totalGeral = {
        buyinFichas: toNumber(row[9]),
        ganhos: toNumber(row[11]),
      };

      if (isSpinup) {
        currentJogo.totalGeral.premio = toNumber(row[10]);
      } else if (subtipo === "satellite") {
        currentJogo.totalGeral.buyinTicket = toNumber(row[10]);
        currentJogo.totalGeral.valorTicket = toNumber(row[13]);
        currentJogo.totalGeral.taxa = toNumber(row[14]);
        currentJogo.totalGeral.gapGarantido = parseSlashValue(row[15]);
      } else if (subtipo === "knockout") {
        currentJogo.totalGeral.buyinTicket = toNumber(row[10]);
        currentJogo.totalGeral.recompensa = toNumber(row[12]);
        currentJogo.totalGeral.taxa = toNumber(row[13]);
        currentJogo.totalGeral.gapGarantido = parseSlashValue(row[14]);
      } else {
        currentJogo.totalGeral.buyinTicket = toNumber(row[10]);
        currentJogo.totalGeral.taxa = toNumber(row[12]);
        currentJogo.totalGeral.gapGarantido = parseSlashValue(row[13]);
      }

      // Marca que já lemos o total da planilha
      currentJogo._totalFromSpreadsheet = true;
      continue;
    }

    const jogadorId = parseSlashValue(row[5]);

    // Player row: has valid jogadorId (positive integer) + liga + clube
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

      const jogador: any = {
        superUnionId: parseSlashValue(row[0]),
        ligaId: toNumber(row[2]),
        clubeId: toNumber(row[3]),
        clubeNome: String(row[4] || "").trim(),
        jogadorId: jogadorId,
        apelido: String(row[6] || "").trim(),
        nomeMemorado: String(row[7] || "").trim(),
        ranking: toNumber(row[8]),
        buyinFichas: toNumber(row[9]),
        ganhos: toNumber(row[11]),
      };

      if (isSpinup) {
        jogador.premio = toNumber(row[10]);
      } else if (subtipo === "satellite") {
        jogador.buyinTicket = toNumber(row[10]);
        jogador.nomeTicket = String(row[12] || "").trim();
        jogador.valorTicket = toNumber(row[13]);
        jogador.taxa = toNumber(row[14]);
        jogador.gapGarantido = parseSlashValue(row[15]);
      } else if (subtipo === "knockout") {
        jogador.buyinTicket = toNumber(row[10]);
        jogador.recompensa = toNumber(row[12]);
        jogador.taxa = toNumber(row[13]);
        jogador.gapGarantido = parseSlashValue(row[14]);
      } else {
        jogador.buyinTicket = toNumber(row[10]);
        jogador.taxa = toNumber(row[12]);
        jogador.gapGarantido = parseSlashValue(row[13]);
      }

      currentJogo.jogadores.push(jogador);
    }
  }

  if (currentJogo && currentJogo.jogadores.length > 0) {
    jogos.push(currentJogo);
  }

  // Limpa flags temporárias e calcula fallback para totalGeral se valores estão zerados
  for (const jogo of jogos) {
    delete jogo._totalFromSpreadsheet;

    // Fallback: se totalGeral não existe ou tem valores zerados, calcular a partir dos jogadores
    if (jogo.jogadores && jogo.jogadores.length > 0) {
      if (!jogo.totalGeral) {
        jogo.totalGeral = {
          buyinFichas: 0,
          ganhos: 0,
          taxa: 0,
        };
      }

      // Calcular totais a partir dos jogadores se os valores estão zerados
      const needsGanhosCalc = jogo.totalGeral.ganhos === 0;
      const needsTaxaCalc =
        jogo.totalGeral.taxa === 0 || jogo.totalGeral.taxa === undefined;
      const needsBuyinCalc = jogo.totalGeral.buyinFichas === 0;

      if (needsGanhosCalc || needsTaxaCalc || needsBuyinCalc) {
        let totalGanhos = 0;
        let totalTaxa = 0;
        let totalBuyin = 0;

        for (const jogador of jogo.jogadores) {
          if (needsGanhosCalc) {
            totalGanhos += jogador.ganhos || 0;
          }
          if (needsTaxaCalc) {
            totalTaxa += jogador.taxa || 0;
          }
          if (needsBuyinCalc) {
            totalBuyin += jogador.buyinFichas || 0;
          }
        }

        if (needsGanhosCalc) {
          jogo.totalGeral.ganhos = totalGanhos;
        }
        if (needsTaxaCalc) {
          jogo.totalGeral.taxa = totalTaxa;
        }
        if (needsBuyinCalc) {
          jogo.totalGeral.buyinFichas = totalBuyin;
        }
      }
    }
  }

  return { jogos, inicioCount, unknownGameFormats };
}

// ============================================================================
// PARSER: JOGOS PPSR (Cash Games)
// ============================================================================

function parseJogosPPSRSheet(
  sheet: XLSX.WorkSheet,
  postProgress: (stage: string, percent: number) => void,
): {
  jogos: any[];
  inicioCount: number;
  unknownCashFormats: any[];
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  let inicioCount = 0;
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowStr = row.map((cell: any) => String(cell || "")).join(" ");
    if (rowStr.includes("ID do jogo:") && rowStr.includes("Nome da mesa:")) {
      inicioCount++;
    }
  }

  const jogos: any[] = [];
  const seenGameIds = new Set<string>();
  const unknownCashFormats: any[] = [];
  let currentJogo: any | null = null;
  let currentMetadata: any = {};
  let headerLineIndex = -1;
  let gamesFoundCount = 0;

  const totalRows = rows.length;
  let lastProgressReport = 0;

  for (let i = 0; i < rows.length; i++) {
    // Report progress every 5%
    const currentProgress = Math.floor((i / totalRows) * 100);
    if (currentProgress >= lastProgressReport + 5) {
      lastProgressReport = currentProgress;
      postProgress(
        "Processando jogos PPSR",
        70 + Math.floor(currentProgress * 0.25),
      );
    }

    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowStr = row.map((cell) => String(cell || "").trim());

    if (
      rowStr[0].toLowerCase().includes("esta planilha é feita pelo pppoker")
    ) {
      continue;
    }

    const rowJoined = rowStr.join(" ");

    const inicioMatch = rowJoined.match(
      /Início:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})\s*By\s*(\w+)\((\d+)\)\s*Fim:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})/i,
    );
    if (inicioMatch) {
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
      currentMetadata.nomeMesa = idJogoMatch[2].replace(/\?+/g, "").trim();
      continue;
    }

    const tipoCashMatch = rowJoined.match(
      /PPSR\/(.+?)((?:\s*\([^)]+\))*)\s+(\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?)\s+(\d+(?:[.,]\d+)?)%\s*(\d+(?:[.,]\d+)?)(BB|Blinds|Ante)\s+(\d+(?:[.,]\d+)?)h/i,
    );

    if (tipoCashMatch) {
      if (!currentMetadata.idJogo) {
        continue;
      }

      gamesFoundCount++;

      const rawType = tipoCashMatch[1].trim();
      const blindsStr = tipoCashMatch[3].replace(",", ".");
      const blindsParts = blindsStr.split("/");
      const smallBlind = Number.parseFloat(blindsParts[0]);
      const bigBlind =
        blindsParts.length > 1 ? Number.parseFloat(blindsParts[1]) : smallBlind;

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
      currentMetadata.rakeCapType = tipoCashMatch[6];
      currentMetadata.duracao = `${tipoCashMatch[7]}h`;
      currentMetadata.duracaoHoras = Number.parseFloat(
        tipoCashMatch[7].replace(",", "."),
      );

      currentJogo = {
        metadata: { ...currentMetadata },
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

    if (
      !tipoCashMatch &&
      currentMetadata.idJogo &&
      rowJoined.includes("PPSR/")
    ) {
      const looksLikeCashHeader = /PPSR\/\S+/i.test(rowJoined);
      if (looksLikeCashHeader && !seenGameIds.has(currentMetadata.idJogo)) {
        unknownCashFormats.push({
          gameId: currentMetadata.idJogo,
          rawText: rowJoined.substring(0, 200),
          rowIndex: i,
        });
      }
    }

    if (headerLineIndex !== -1 && i === headerLineIndex + 1) {
      continue;
    }

    if (
      (rowStr[7]?.toLowerCase() === "liga total" ||
        rowStr[7]?.toLowerCase() === "total") &&
      currentJogo
    ) {
      continue;
    }

    const jogadorId = parseSlashValue(row[5]);

    // Player row: has valid jogadorId (positive integer) + liga + clube
    const isPlayerRow =
      jogadorId &&
      jogadorId > 0 &&
      Number.isInteger(jogadorId) &&
      row[2] && // ligaId
      row[3] && // clubeId
      currentJogo;

    if (isPlayerRow) {
      const jogador = {
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

      // Fallback: se ganhosJogadorGeral é 0 mas tem valores em componentes, calcular
      if (
        jogador.ganhosJogadorGeral === 0 &&
        (jogador.ganhosDeAdversarios !== 0 ||
          jogador.ganhosDeJackpot !== 0 ||
          jogador.ganhosDeDividirEV !== 0)
      ) {
        jogador.ganhosJogadorGeral =
          jogador.ganhosDeAdversarios +
          jogador.ganhosDeJackpot +
          jogador.ganhosDeDividirEV;
      }

      currentJogo.jogadores.push(jogador);
    }
  }

  if (currentJogo && currentJogo.jogadores.length > 0) {
    jogos.push(currentJogo);
  }

  // Calculate totals
  for (const jogo of jogos) {
    jogo.totalGeral = {
      buyinFichas: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.buyinFichas,
        0,
      ),
      maos: jogo.jogadores.reduce((sum: number, j: any) => sum + j.maos, 0),
      ganhosJogadorGeral: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.ganhosJogadorGeral,
        0,
      ),
      ganhosDeAdversarios: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.ganhosDeAdversarios,
        0,
      ),
      ganhosDeJackpot: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.ganhosDeJackpot,
        0,
      ),
      ganhosDeDividirEV: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.ganhosDeDividirEV,
        0,
      ),
      ganhosClubeGeral: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.ganhosClubeGeral,
        0,
      ),
      taxa: jogo.jogadores.reduce((sum: number, j: any) => sum + j.taxa, 0),
      taxaJackpot: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.taxaJackpot,
        0,
      ),
      premiosJackpot: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.premiosJackpot,
        0,
      ),
      dividirEV: jogo.jogadores.reduce(
        (sum: number, j: any) => sum + j.dividirEV,
        0,
      ),
    };

    const ligaMap = new Map<number, any[]>();
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

function normalizeSheetName(name: string): string {
  return name.toLowerCase().trim();
}

function parseLeagueExcelWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  fileSize: number,
  postProgress: (stage: string, percent: number) => void,
): any {
  const result: any = {
    geralPPST: [],
    jogosPPST: [],
    geralPPSR: [],
    jogosPPSR: [],
    fileName,
    fileSize,
  };

  postProgress("Analisando estrutura", 20);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const normalizedName = normalizeSheetName(sheetName);

    // Parse Geral do PPST
    if (normalizedName.includes("geral") && normalizedName.includes("ppst")) {
      postProgress("Processando Geral PPST", 25);
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
      postProgress("Processando Jogos PPST", 40);
      const { jogos, inicioCount, unknownGameFormats } = parseJogosPPSTSheet(
        sheet,
        postProgress,
      );
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
      postProgress("Processando Geral PPSR", 65);
      const {
        blocos,
        periodStart: ppsrPeriodStart,
        periodEnd: ppsrPeriodEnd,
      } = parseGeralPPSRSheet(sheet);
      result.geralPPSR = blocos;
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
      postProgress("Processando Jogos PPSR", 70);
      const { jogos, inicioCount, unknownCashFormats } = parseJogosPPSRSheet(
        sheet,
        postProgress,
      );
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

  postProgress("Finalizando", 95);

  return result;
}

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "parse") {
    try {
      const postProgress = (stage: string, percent: number) => {
        self.postMessage({
          type: "progress",
          stage,
          percent,
        } as WorkerResponse);
      };

      postProgress("Lendo arquivo", 5);

      const workbook = XLSX.read(message.buffer, {
        type: "array",
        cellFormula: false, // Read calculated values, not formula strings
        cellNF: false,
        cellStyles: false,
        codepage: 65001,
      });

      postProgress("Arquivo carregado", 15);

      const data = parseLeagueExcelWorkbook(
        workbook,
        message.fileName,
        message.fileSize,
        postProgress,
      );

      postProgress("Concluído", 100);

      self.postMessage({ type: "success", data } as WorkerResponse);
    } catch (error) {
      self.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      } as WorkerResponse);
    }
  }
};
