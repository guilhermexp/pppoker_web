"use client";

import type {
  FastchipsValidationResult,
  ParsedFastchipsImportData,
  ParsedFastchipsOperation,
} from "@/lib/fastchips/types";
import { validateFastchipsImportData } from "@/lib/fastchips/validation";
import { useTRPC } from "@/trpc/client";
import { cn } from "@midpoker/ui/cn";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { FastchipsImportValidationModal } from "./import-validation-modal";

// ============================================================================
// FASTCHIPS SPREADSHEET PARSER
// Expected columns: Data, Tipo, Finalidade, Entrada bruta, Saída bruta,
// Entrada líquida, Saída líquida, Integrante, Taxa da operação,
// Id Jogador, Id da operação, Id do pagamento
// ============================================================================

/**
 * Parses the "Operações" sheet from a Fastchips/Chippix export
 */
function parseFastchipsOperationsSheet(
  data: any[],
): ParsedFastchipsOperation[] {
  return data
    .filter(
      (row) =>
        // Must have at least operation ID or date
        row["Id da operação"] ||
        row["operationId"] ||
        row["Data"] ||
        row["occurredAt"],
    )
    .map((row) => {
      // Handle "-" as null for numeric values
      const parseNumeric = (value: any): number | null => {
        if (
          value === "-" ||
          value === "" ||
          value === null ||
          value === undefined
        ) {
          return null;
        }
        const num = Number.parseFloat(String(value).replace(",", "."));
        return Number.isNaN(num) ? null : num;
      };

      // Parse fee rate (can be 0, 0.5, or 1.5)
      const parseFeeRate = (value: any): number => {
        if (
          value === "-" ||
          value === "" ||
          value === null ||
          value === undefined
        ) {
          return 0;
        }
        const num = Number.parseFloat(String(value).replace(",", "."));
        return Number.isNaN(num) ? 0 : num;
      };

      return {
        // Column A: Data
        occurredAt: String(
          row["Data"] || row["occurredAt"] || row["data"] || "",
        ),
        // Column B: Tipo
        operationType: String(
          row["Tipo"] || row["operationType"] || row["tipo"] || "Entrada",
        ) as "Entrada" | "Saída",
        // Column C: Finalidade
        purpose: String(
          row["Finalidade"] ||
            row["purpose"] ||
            row["finalidade"] ||
            "Recebimento",
        ) as "Recebimento" | "Pagamento" | "Saque" | "Serviço",
        // Column D: Entrada bruta
        grossEntry: parseNumeric(
          row["Entrada bruta"] || row["grossEntry"] || row["entrada_bruta"],
        ),
        // Column E: Saída bruta
        grossExit: parseNumeric(
          row["Saída bruta"] ||
            row["Saida bruta"] ||
            row["grossExit"] ||
            row["saida_bruta"],
        ),
        // Column F: Entrada líquida
        netEntry: parseNumeric(
          row["Entrada líquida"] ||
            row["Entrada liquida"] ||
            row["netEntry"] ||
            row["entrada_liquida"],
        ),
        // Column G: Saída líquida
        netExit: parseNumeric(
          row["Saída líquida"] ||
            row["Saida liquida"] ||
            row["netExit"] ||
            row["saida_liquida"],
        ),
        // Column H: Integrante
        memberName: String(
          row["Integrante"] || row["memberName"] || row["integrante"] || "",
        ),
        // Column I: Taxa da operação
        feeRate: parseFeeRate(
          row["Taxa da operação"] ||
            row["Taxa da operacao"] ||
            row["feeRate"] ||
            row["taxa"],
        ),
        // Column J: Id Jogador
        ppPokerId:
          row["Id Jogador"] || row["ppPokerId"] || row["id_jogador"] || null,
        // Column K: Id da operação
        operationId: String(
          row["Id da operação"] ||
            row["Id da operacao"] ||
            row["operationId"] ||
            row["id_operacao"] ||
            "",
        ),
        // Column L: Id do pagamento
        paymentId: String(
          row["Id do pagamento"] ||
            row["paymentId"] ||
            row["id_pagamento"] ||
            "",
        ),
      };
    });
}

/**
 * Parses a Fastchips workbook and extracts data
 */
function parseFastchipsWorkbook(
  workbook: XLSX.WorkBook,
): ParsedFastchipsImportData {
  // Try to find the "Operações" sheet
  const sheetNames = workbook.SheetNames;
  let operationsSheetName = sheetNames.find(
    (name) =>
      name.toLowerCase().includes("opera") || name.toLowerCase() === "sheet1",
  );

  // Default to first sheet if not found
  if (!operationsSheetName && sheetNames.length > 0) {
    operationsSheetName = sheetNames[0];
  }

  if (!operationsSheetName) {
    return { operations: [], periodStart: null, periodEnd: null };
  }

  const sheet = workbook.Sheets[operationsSheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const operations = parseFastchipsOperationsSheet(data);

  // Calculate period from operations
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  if (operations.length > 0) {
    const dates = operations
      .map((op) => op.occurredAt)
      .filter(Boolean)
      .sort();
    if (dates.length > 0) {
      periodStart = dates[0] || null;
      periodEnd = dates[dates.length - 1] || null;
    }
  }

  return { operations, periodStart, periodEnd };
}

export function FastchipsImportUploader() {
  const { toast } = useToast();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] =
    useState<ParsedFastchipsImportData | null>(null);
  const [validationResult, setValidationResult] =
    useState<FastchipsValidationResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Create import mutation
  const createImport = useMutation(
    trpc.fastchips.imports.create.mutationOptions({
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao criar importação",
          description: error.message,
        });
      },
    }),
  );

  // Process file
  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setFileName(file.name);
      setFileSize(file.size);

      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });

        // Parse the workbook
        const data = parseFastchipsWorkbook(workbook);

        if (data.operations.length === 0) {
          toast({
            variant: "destructive",
            title: "Planilha vazia",
            description: "Nenhuma operação encontrada na planilha.",
          });
          setIsProcessing(false);
          return;
        }

        // Validate the data
        const result = validateFastchipsImportData(data);

        setParsedData(data);
        setValidationResult(result);
        setShowValidationModal(true);
      } catch (error: any) {
        console.error("Error processing file:", error);
        toast({
          variant: "destructive",
          title: "Erro ao processar arquivo",
          description: error.message || "Formato de arquivo inválido.",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback(
      (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
          processFile(file);
        }
      },
      [processFile],
    ),
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  // Handle import confirmation
  const handleConfirmImport = async () => {
    if (!parsedData) return;

    try {
      // Create the import record
      const result = await createImport.mutateAsync({
        fileName,
        fileSize,
        rawData: parsedData,
      });

      toast({
        title: "Importação criada",
        description: "A planilha foi enviada para processamento.",
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: [["fastchips", "imports"]] });

      // Close modal and reset state
      setShowValidationModal(false);
      setParsedData(null);
      setValidationResult(null);

      return result.id;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error.message,
      });
      throw error;
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowValidationModal(false);
    setParsedData(null);
    setValidationResult(null);
  };

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              <p className="text-muted-foreground">Processando arquivo...</p>
            </>
          ) : isDragActive ? (
            <>
              <Upload className="h-12 w-12 text-primary" />
              <p className="text-primary font-medium">Solte o arquivo aqui</p>
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  Arraste uma planilha Fastchips aqui
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou clique para selecionar (.xlsx)
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A planilha deve ter a sheet &quot;Operações&quot; com as 12
                colunas padrão
              </p>
            </>
          )}
        </div>
      </div>

      {/* Validation Modal */}
      {showValidationModal && parsedData && validationResult && (
        <FastchipsImportValidationModal
          open={showValidationModal}
          onOpenChange={setShowValidationModal}
          data={parsedData}
          validationResult={validationResult}
          fileName={fileName}
          onConfirm={handleConfirmImport}
          onCancel={handleCloseModal}
        />
      )}
    </>
  );
}
