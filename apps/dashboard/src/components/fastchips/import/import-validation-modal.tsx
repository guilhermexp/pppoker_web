"use client";

import type {
  FastchipsValidationResult,
  ParsedFastchipsImportData,
} from "@/lib/fastchips/types";
import {
  calculateImportStats,
  extractMembersFromOperations,
} from "@/lib/fastchips/validation";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@midpoker/ui/dialog";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Loader2,
  Users,
} from "lucide-react";
import { useState } from "react";

interface FastchipsImportValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ParsedFastchipsImportData;
  validationResult: FastchipsValidationResult;
  fileName: string;
  onConfirm: () => Promise<string>;
  onCancel: () => void;
}

export function FastchipsImportValidationModal({
  open,
  onOpenChange,
  data,
  validationResult,
  fileName,
  onConfirm,
  onCancel,
}: FastchipsImportValidationModalProps) {
  const { toast } = useToast();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);

  // Validate mutation
  const validateMutation = useMutation(
    trpc.fastchips.imports.validate.mutationOptions()
  );

  // Process mutation
  const processMutation = useMutation(
    trpc.fastchips.imports.process.mutationOptions()
  );

  // Calculate stats
  const stats = calculateImportStats(data.operations);
  const members = extractMembersFromOperations(data.operations);

  // Format currency
  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  // Handle confirm and process
  const handleConfirmAndProcess = async () => {
    setIsProcessing(true);
    try {
      // Create the import
      const id = await onConfirm();
      setImportId(id);

      // Validate
      const validation = await validateMutation.mutateAsync({ id });

      if (!validation.validationPassed) {
        toast({
          variant: "destructive",
          title: "Validação falhou",
          description: "A importação contém erros críticos.",
        });
        setIsProcessing(false);
        return;
      }

      // Process
      const result = await processMutation.mutateAsync({ id });

      if (result.success) {
        toast({
          title: "Importação concluída",
          description: `${stats.totalOperations} operações importadas com sucesso.`,
        });
        queryClient.invalidateQueries({ queryKey: [["fastchips"]] });
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Erro no processamento",
          description: result.errors?.join(", ") || "Erro desconhecido",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Validar Importação Fastchips</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="resumo" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="operacoes">
              Operações ({stats.totalOperations})
            </TabsTrigger>
            <TabsTrigger value="integrantes">
              Integrantes ({stats.uniqueMembers})
            </TabsTrigger>
            <TabsTrigger value="validacao">
              Validação
              {validationResult.hasBlockingErrors && (
                <AlertCircle className="ml-1 h-3 w-3 text-destructive" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Resumo Tab */}
          <TabsContent value="resumo" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Operações</div>
                <div className="text-2xl font-bold">{stats.totalOperations}</div>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="text-green-600 flex items-center">
                    <ArrowUpRight className="h-3 w-3" /> {stats.totalEntries}
                  </span>
                  <span className="text-red-600 flex items-center">
                    <ArrowDownRight className="h-3 w-3" /> {stats.totalExits}
                  </span>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Integrantes</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {stats.uniqueMembers}
                </div>
                {stats.newMembers > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    {stats.newMembers} novos
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Total Entradas
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.grossEntryTotal)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Líquido: {formatCurrency(stats.netEntryTotal)}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Saídas</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.grossExitTotal)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Líquido: {formatCurrency(stats.netExitTotal)}
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 border rounded-lg">
              <div className="text-sm font-medium mb-2">Por Finalidade</div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Recebimento:</span>{" "}
                  {stats.byPurpose.recebimento.count} (
                  {formatCurrency(stats.byPurpose.recebimento.total)})
                </div>
                <div>
                  <span className="text-muted-foreground">Pagamento:</span>{" "}
                  {stats.byPurpose.pagamento.count} (
                  {formatCurrency(stats.byPurpose.pagamento.total)})
                </div>
                <div>
                  <span className="text-muted-foreground">Saque:</span>{" "}
                  {stats.byPurpose.saque.count} (
                  {formatCurrency(stats.byPurpose.saque.total)})
                </div>
                <div>
                  <span className="text-muted-foreground">Serviço:</span>{" "}
                  {stats.byPurpose.servico.count} (
                  {formatCurrency(stats.byPurpose.servico.total)})
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="font-medium">Balanço</span>
                <span
                  className={`text-xl font-bold ${
                    stats.balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(stats.balance)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                <span>Total de Taxas</span>
                <span>{formatCurrency(stats.totalFees)}</span>
              </div>
            </div>
          </TabsContent>

          {/* Operações Tab */}
          <TabsContent value="operacoes" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Integrante</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.operations.slice(0, 100).map((op, index) => (
                    <TableRow key={op.operationId || index}>
                      <TableCell className="text-xs">{op.occurredAt}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            op.operationType === "Entrada"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            op.operationType === "Entrada"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {op.operationType}
                        </Badge>
                      </TableCell>
                      <TableCell>{op.purpose}</TableCell>
                      <TableCell>{op.memberName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          op.operationType === "Entrada"
                            ? op.grossEntry ?? 0
                            : op.grossExit ?? 0
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          op.operationType === "Entrada"
                            ? op.netEntry ?? 0
                            : op.netExit ?? 0
                        )}
                      </TableCell>
                      <TableCell>{op.feeRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.operations.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Mostrando 100 de {data.operations.length} operações
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Integrantes Tab */}
          <TabsContent value="integrantes" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>ID Jogador</TableHead>
                    <TableHead className="text-right">Operações</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.name}>
                      <TableCell className="font-medium">
                        {member.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.ppPokerId || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.operationCount}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(member.totalGrossEntry)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(member.totalGrossExit)}
                      </TableCell>
                      <TableCell>
                        {member.isNew ? (
                          <Badge variant="outline" className="text-blue-600">
                            Novo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            Existente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Validação Tab */}
          <TabsContent value="validacao" className="mt-4 flex-1 overflow-hidden">
            <div className="mb-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Qualidade dos Dados</span>
                <span className="text-2xl font-bold">
                  {validationResult.qualityScore}%
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600">
                  {validationResult.quality.criticalPassed} críticos OK
                </span>
                {validationResult.quality.criticalFailed > 0 && (
                  <span className="text-red-600">
                    {validationResult.quality.criticalFailed} críticos falharam
                  </span>
                )}
                <span className="text-yellow-600">
                  {validationResult.quality.warningsFailed} avisos
                </span>
              </div>
            </div>

            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {validationResult.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-3 border rounded-lg flex items-start gap-3"
                  >
                    {check.status === "passed" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    )}
                    {check.status === "warning" && (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    )}
                    {check.status === "failed" && (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{check.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {check.category}
                        </Badge>
                        {check.severity === "critical" && (
                          <Badge
                            variant="destructive"
                            className="text-xs"
                          >
                            crítico
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {check.details}
                      </p>
                      {check.debug.failedItems &&
                        check.debug.failedItems.length > 0 && (
                          <div className="mt-2 text-xs bg-muted p-2 rounded">
                            <span className="text-muted-foreground">
                              Exemplos:{" "}
                            </span>
                            {check.debug.failedItems.join(", ")}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmAndProcess}
            disabled={isProcessing || validationResult.hasBlockingErrors}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : validationResult.hasBlockingErrors ? (
              "Erros críticos encontrados"
            ) : (
              "Aprovar e Processar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
