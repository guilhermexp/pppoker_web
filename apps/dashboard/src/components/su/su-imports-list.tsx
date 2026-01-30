"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { useState } from "react";

type ImportStatus =
  | "pending"
  | "validating"
  | "validated"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

function getStatusVariant(
  status: ImportStatus,
): "default" | "secondary" | "success" | "destructive" | "warning" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
    case "cancelled":
      return "destructive";
    case "processing":
    case "validating":
      return "warning";
    case "validated":
      return "secondary";
    default:
      return "default";
  }
}

function getStatusLabel(status: ImportStatus): string {
  switch (status) {
    case "pending":
      return "Pendente";
    case "validating":
      return "Validando";
    case "validated":
      return "Validado";
    case "processing":
      return "Processando";
    case "completed":
      return "Concluído";
    case "failed":
      return "Falhou";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type SUImportsListProps = {
  compact?: boolean;
};

export function SUImportsList({ compact = false }: SUImportsListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: imports, isLoading } = useQuery(
    trpc.su.imports.list.queryOptions({
      limit: compact ? 5 : 20,
    }),
  );

  const deleteMutation = useMutation(
    trpc.su.imports.delete.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Importação removida",
          description: "A importação foi removida com sucesso.",
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.imports.list.queryKey(),
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao remover",
          description: error.message,
        });
      },
    }),
  );

  if (isLoading) {
    return <SUImportsList.Skeleton />;
  }

  if (!imports || imports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Icons.Files className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Nenhuma importação encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {imports.map((importItem) => (
        <div
          key={importItem.id}
          className={cn(
            "border rounded-lg p-4 hover:bg-accent/50 transition-colors",
            expandedId === importItem.id && "bg-accent/30",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">
                  {importItem.file_name}
                </span>
                <Badge
                  variant={getStatusVariant(importItem.status as ImportStatus)}
                >
                  {getStatusLabel(importItem.status as ImportStatus)}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatFileSize(importItem.file_size)}</span>
                {importItem.period_start && importItem.period_end && (
                  <span>
                    {importItem.period_start} - {importItem.period_end}
                  </span>
                )}
                <span>
                  {formatDistanceToNow(new Date(importItem.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate({ id: importItem.id })}
                disabled={deleteMutation.isPending}
                title={
                  importItem.status === "processing"
                    ? "Deletar importação travada"
                    : "Deletar importação"
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setExpandedId(
                    expandedId === importItem.id ? null : importItem.id,
                  )
                }
              >
                <Icons.ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedId === importItem.id && "rotate-180",
                  )}
                />
              </Button>
            </div>
          </div>

          {expandedId === importItem.id && (
            <div className="mt-4 pt-4 border-t text-sm space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-muted-foreground">Ligas</p>
                  <p className="font-medium">{importItem.total_leagues ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jogos PPST</p>
                  <p className="font-medium">
                    {importItem.total_games_ppst ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jogos PPSR</p>
                  <p className="font-medium">
                    {importItem.total_games_ppsr ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jogadores PPST</p>
                  <p className="font-medium">
                    {importItem.total_players_ppst ?? 0}
                  </p>
                </div>
              </div>
              {importItem.validation_errors && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-destructive text-xs">
                  <p className="font-medium">Erros de validação:</p>
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(importItem.validation_errors, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

SUImportsList.Skeleton = function SUImportsListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
