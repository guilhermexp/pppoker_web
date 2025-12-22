"use client";

import type {
  LeagueValidationResult,
  ParsedLeagueGeralPPST,
  ParsedLeagueGeralPPSTBloco,
  ParsedLeagueImportData,
  ParsedLeagueJogadorPPST,
  ParsedLeagueJogoMetadata,
  ParsedLeagueJogoPPST,
  ParsedLeagueTotalGeral,
  ParsedLeagueTotalLiga,
} from "@/lib/league/types";
import { validateLeagueImportData } from "@/lib/league/validation";
import { cn } from "@midday/ui/cn";
import { Icons } from "@midday/ui/icons";
import { Spinner } from "@midday/ui/spinner";
import { useToast } from "@midday/ui/use-toast";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { LeagueImportValidationModal } from "./league-import-validation-modal";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  // If already a number, return directly (XLSX often returns numbers)
  if (typeof value === "number") return value;
  // Handle Brazilian format (comma as decimal separator)
  // Only remove dots if there's also a comma (Brazilian thousand separator)
  const str = value.toString().trim();
  if (str.includes(",")) {
    // Brazilian format: dots are thousand separators, comma is decimal
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const parsed = Number.parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  // Standard format or just dots
  const parsed = Number.parseFloat(str);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseSlashValue(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  // If already a number, return directly
  if (typeof value === "number") return value;
  const str = String(value).trim();
  if (str === "/" || str === "-" || str === "") return null;
  return toNumber(str);
}

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
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false, // Get formatted/calculated values instead of raw
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
      cellB.toLowerCase().includes("superunion") ||
      cellC.toLowerCase().includes("nome da liga") ||
      cellC.toLowerCase().includes("ganhos")
    ) {
      continue;
    }

    // Detect "Total" line - skip it, we'll calculate totals from liga data
    if (cellC.toLowerCase() === "total") {
      continue;
    }

    // Parse data row (liga data)
    // Column mapping: A=periodo, B=suId, C=ligaNome, D=ligaId, E=ganhosJogador, etc.
    const ligaId = parseSlashValue(row[3]);
    if (ligaId && !Number.isNaN(ligaId) && currentBloco) {
      // Capture gapGarantido from the FIRST row of the block (merged cell only has value in first cell)
      if (currentBloco.ligas.length === 0) {
        const gapValue = toNumber(row[14]);
        if (gapValue !== 0) {
          currentBloco.total.gapGarantido = gapValue;
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
        ganhosLigaGeral: toNumber(row[8]),
        ganhosLigaTaxa: toNumber(row[9]),
        buyinSpinup: toNumber(row[10]),
        premiacaoSpinup: toNumber(row[11]),
        valorTicketEntregue: toNumber(row[12]),
        buyinTicketLiga: toNumber(row[13]),
        // gapGarantido is a merged cell spanning the whole block - don't read per liga
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
      valorTicketGanho: bloco.ligas.reduce((sum, l) => sum + l.valorTicketGanho, 0),
      buyinTicket: bloco.ligas.reduce((sum, l) => sum + l.buyinTicket, 0),
      valorPremioPersonalizado: bloco.ligas.reduce((sum, l) => sum + l.valorPremioPersonalizado, 0),
      ganhosLigaGeral: bloco.ligas.reduce((sum, l) => sum + l.ganhosLigaGeral, 0),
      ganhosLigaTaxa: bloco.ligas.reduce((sum, l) => sum + l.ganhosLigaTaxa, 0),
      buyinSpinup: bloco.ligas.reduce((sum, l) => sum + l.buyinSpinup, 0),
      premiacaoSpinup: bloco.ligas.reduce((sum, l) => sum + l.premiacaoSpinup, 0),
      valorTicketEntregue: bloco.ligas.reduce((sum, l) => sum + l.valorTicketEntregue, 0),
      buyinTicketLiga: bloco.ligas.reduce((sum, l) => sum + l.buyinTicketLiga, 0),
      gapGarantido: savedGap, // Keep the gap from merged cell
    };
  }

  return { blocos, periodStart, periodEnd };
}

// ============================================================================
// PARSER: JOGOS PPST
// ============================================================================

function parseJogosPPSTSheet(sheet: XLSX.WorkSheet): ParsedLeagueJogoPPST[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false, // Get formatted/calculated values instead of raw
    blankrows: false,
  });

  const jogos: ParsedLeagueJogoPPST[] = [];
  let currentJogo: ParsedLeagueJogoPPST | null = null;
  let currentMetadata: Partial<ParsedLeagueJogoMetadata> = {};
  let headerLineIndex = -1;

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
    const inicioMatch = rowStr
      .join(" ")
      .match(
        /Início:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})\s+By\s+(\w+)\((\d+)\)\s+Fim:\s*(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})/i,
      );
    if (inicioMatch) {
      // Save previous game if exists
      if (currentJogo && currentJogo.jogadores.length > 0) {
        jogos.push(currentJogo);
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
    const idJogoMatch = rowStr
      .join(" ")
      .match(/ID do jogo:\s*([^\s]+)\s+Nome da mesa:\s*(.+)/i);
    if (idJogoMatch) {
      currentMetadata.idJogo = idJogoMatch[1].trim();
      currentMetadata.nomeMesa = idJogoMatch[2].trim();
      continue;
    }

    // Detect game header line 3: "PPST/NLH  Buy-in: 9+1  Premiação Garantida: 1000"
    // or "PPST/SPINUP ..." (no premiação garantida)
    const tipoJogoMatch = rowStr
      .join(" ")
      .match(
        /(PPST\/NLH|PPST\/SPINUP)\s+Buy-in:\s*(\d+)\+(\d+)(?:\s+Premiação Garantida:\s*(\d+))?/i,
      );
    if (tipoJogoMatch) {
      currentMetadata.tipoJogo = tipoJogoMatch[1].toUpperCase() as
        | "PPST/NLH"
        | "PPST/SPINUP";
      currentMetadata.buyInBase = Number.parseInt(tipoJogoMatch[2]);
      currentMetadata.buyInTaxa = Number.parseInt(tipoJogoMatch[3]);
      currentMetadata.premiacaoGarantida = tipoJogoMatch[4]
        ? Number.parseInt(tipoJogoMatch[4])
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

    // Detect "Liga Total" line (appears in column H for NLH)
    if (rowStr[7]?.toLowerCase() === "liga total" && currentJogo) {
      // Liga total row - ligaId from column B
      const ligaId = parseSlashValue(row[1]);
      if (ligaId) {
        const totalLiga: ParsedLeagueTotalLiga = {
          ligaId,
          buyinFichas: toNumber(row[8]),     // I - Buy-in de fichas
          buyinTicket:
            currentJogo.metadata.tipoJogo === "PPST/NLH"
              ? toNumber(row[9])             // J - Buy-in de ticket
              : undefined,
          ganhos: toNumber(row[10]),         // K - Ganhos
          taxa:
            currentJogo.metadata.tipoJogo === "PPST/NLH"
              ? toNumber(row[11])            // L - Taxa
              : undefined,
          gapGarantido:
            currentJogo.metadata.tipoJogo === "PPST/NLH"
              ? toNumber(row[12])            // M - gap garantido
              : undefined,
          premio:
            currentJogo.metadata.tipoJogo === "PPST/SPINUP"
              ? toNumber(row[9])             // J - Prêmio (sorteado)
              : undefined,
        };
        currentJogo.totaisPorLiga.push(totalLiga);
      }
      continue;
    }

    // Detect "Total" line (total geral do jogo)
    if (rowStr[7]?.toLowerCase() === "total" && currentJogo) {
      if (currentJogo.metadata.tipoJogo === "PPST/NLH") {
        currentJogo.totalGeral = {
          buyinFichas: toNumber(row[8]),     // I - Buy-in de fichas
          buyinTicket: toNumber(row[9]),     // J - Buy-in de ticket
          ganhos: toNumber(row[10]),         // K - Ganhos
          taxa: toNumber(row[11]),           // L - Taxa
          gapGarantido: toNumber(row[12]),   // M - gap garantido
        };
      } else {
        // SPINUP
        currentJogo.totalGeral = {
          buyinFichas: toNumber(row[8]),     // I - Buy-in de fichas
          premio: toNumber(row[9]),          // J - Prêmio (sorteado)
          ganhos: toNumber(row[10]),         // K - Ganhos
        };
      }
      continue;
    }

    // Parse player data row
    // NLH columns: A=SuperUnion, B=Liga, C=Clube, D=NomeClube, E=Jogador, F=Apelido, G=Memo, H=Ranking, I=BuyIn, J=Ticket, K=Ganhos, L=Taxa, M=Gap
    // Check if this is a player row by looking at column E (jogadorId) - should be a number between 1M and 99M
    const jogadorId = parseSlashValue(row[4]);
    if (
      jogadorId &&
      jogadorId >= 1000000 &&
      jogadorId <= 99999999 &&
      currentJogo
    ) {
      const isNLH = currentJogo.metadata.tipoJogo === "PPST/NLH";

      const jogador: ParsedLeagueJogadorPPST = {
        superUnionId: parseSlashValue(row[0]),  // A - ID da SuperUnion
        ligaId: toNumber(row[1]),               // B - ID de Liga
        clubeId: toNumber(row[2]),              // C - ID de clube
        clubeNome: String(row[3] || "").trim(), // D - Nome do Clube
        jogadorId: jogadorId,                   // E - ID do jogador
        apelido: String(row[5] || "").trim(),   // F - Apelido
        nomeMemorado: String(row[6] || "").trim(), // G - Nome de memorando
        ranking: toNumber(row[7]),              // H - Ranking
        buyinFichas: toNumber(row[8]),          // I - Buy-in de fichas
        ganhos: toNumber(row[10]),              // K - Ganhos
      };

      if (isNLH) {
        // NLH has: buyinTicket (J), ganhos (K), taxa (L), gapGarantido (M)
        jogador.buyinTicket = toNumber(row[9]);  // J - Buy-in de ticket
        jogador.taxa = toNumber(row[11]);        // L - Taxa
        jogador.gapGarantido = parseSlashValue(row[12]); // M - gap garantido
      } else {
        // SPINUP has: premio (J), ganhos (K)
        jogador.premio = toNumber(row[9]);       // J - Prêmio (sorteado)
        jogador.ganhos = toNumber(row[10]);      // K - Ganhos
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
    const isNLH = jogo.metadata.tipoJogo === "PPST/NLH";

    // Calculate total geral from all players
    jogo.totalGeral = {
      buyinFichas: jogo.jogadores.reduce((sum, j) => sum + j.buyinFichas, 0),
      ganhos: jogo.jogadores.reduce((sum, j) => sum + j.ganhos, 0),
    };

    if (isNLH) {
      jogo.totalGeral.buyinTicket = jogo.jogadores.reduce((sum, j) => sum + (j.buyinTicket ?? 0), 0);
      jogo.totalGeral.taxa = jogo.jogadores.reduce((sum, j) => sum + (j.taxa ?? 0), 0);
      jogo.totalGeral.gapGarantido = jogo.jogadores.reduce((sum, j) => sum + (j.gapGarantido ?? 0), 0);
    } else {
      jogo.totalGeral.premio = jogo.jogadores.reduce((sum, j) => sum + (j.premio ?? 0), 0);
    }

    // Calculate totals per liga
    const ligaMap = new Map<number, ParsedLeagueJogadorPPST[]>();
    for (const jogador of jogo.jogadores) {
      const list = ligaMap.get(jogador.ligaId) || [];
      list.push(jogador);
      ligaMap.set(jogador.ligaId, list);
    }

    jogo.totaisPorLiga = Array.from(ligaMap.entries()).map(([ligaId, jogadores]) => {
      const total: ParsedLeagueTotalLiga = {
        ligaId,
        buyinFichas: jogadores.reduce((sum, j) => sum + j.buyinFichas, 0),
        ganhos: jogadores.reduce((sum, j) => sum + j.ganhos, 0),
      };

      if (isNLH) {
        total.buyinTicket = jogadores.reduce((sum, j) => sum + (j.buyinTicket ?? 0), 0);
        total.taxa = jogadores.reduce((sum, j) => sum + (j.taxa ?? 0), 0);
        total.gapGarantido = jogadores.reduce((sum, j) => sum + (j.gapGarantido ?? 0), 0);
      } else {
        total.premio = jogadores.reduce((sum, j) => sum + (j.premio ?? 0), 0);
      }

      return total;
    });
  }

  return jogos;
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
      result.jogosPPST = parseJogosPPSTSheet(sheet);
      result.jogosPPSTCount = result.jogosPPST.length;
      result.jogosPPSTJogadorCount = result.jogosPPST.reduce(
        (sum, j) => sum + j.jogadores.length,
        0,
      );
    }

    // Parse Geral do PPSR (stub - not implemented yet)
    if (normalizedName.includes("geral") && normalizedName.includes("ppsr")) {
      // TODO: Implement when mapping is provided
      result.geralPPSRLigaCount = 0;
    }

    // Parse Jogos PPSR (stub - not implemented yet)
    if (normalizedName.includes("jogos") && normalizedName.includes("ppsr")) {
      // TODO: Implement when mapping is provided
      result.jogosPPSRCount = 0;
    }
  }

  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeagueImportUploader() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedLeagueImportData | null>(
    null,
  );
  const [validationResult, setValidationResult] =
    useState<LeagueValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
          cellFormula: false, // Don't parse formulas, just get values
          cellNF: false, // Don't parse number formats
          cellStyles: false, // Don't parse styles
        });

        // Parse the workbook
        const data = parseLeagueExcelWorkbook(workbook, file.name, file.size);

        // Validate the data
        const validation = validateLeagueImportData(data);

        setParsedData(data);
        setValidationResult(validation);
        setShowValidationModal(true);

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
        toast({
          variant: "destructive",
          title: "Erro ao processar arquivo",
          description:
            error instanceof Error ? error.message : "Erro desconhecido",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
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

  const handleApprove = useCallback(() => {
    // TODO: Implement database save logic
    toast({
      title: "Dados aprovados",
      description: "Os dados serão processados e salvos no sistema.",
    });
    setShowValidationModal(false);
    setParsedData(null);
    setValidationResult(null);
  }, [toast]);

  const handleReject = useCallback(() => {
    setShowValidationModal(false);
    setParsedData(null);
    setValidationResult(null);
  }, []);

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          isProcessing && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="h-8 w-8" />
            <span className="text-sm text-muted-foreground">
              Processando planilha...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Icons.Import className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Solte o arquivo aqui..."
                  : "Arraste uma planilha de liga ou clique para selecionar"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: .xlsx, .xls
              </p>
              <p className="text-xs text-muted-foreground">
                Abas esperadas: Geral do PPST, Jogos PPST, Geral do PPSR, Jogos
                PPSR
              </p>
            </div>
          </div>
        )}
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
