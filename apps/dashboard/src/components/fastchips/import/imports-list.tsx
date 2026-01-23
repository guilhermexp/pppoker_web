"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Skeleton } from "@midpoker/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";

export function FastchipsImportsList() {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch imports
  const { data, isLoading, error } = useQuery(
    trpc.fastchips.imports.get.queryOptions({ pageSize: 10 })
  );

  // Delete mutation
  const deleteMutation = useMutation(
    trpc.fastchips.imports.delete.mutationOptions({
      onSuccess: () => {
        toast({ title: "Importação excluída" });
        queryClient.invalidateQueries({ queryKey: [["fastchips", "imports"]] });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      },
    })
  );

  // Process mutation (for reprocessing failed imports)
  const processMutation = useMutation(
    trpc.fastchips.imports.process.mutationOptions({
      onSuccess: () => {
        toast({ title: "Importação reprocessada" });
        queryClient.invalidateQueries({ queryKey: [["fastchips", "imports"]] });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      },
    })
  );

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Concluído
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      case "validated":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            Validado
          </Badge>
        );
      case "validating":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Validando
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Falhou
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  if (isLoading) {
    return <FastchipsImportsListSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Erro ao carregar importações</span>
        </div>
      </div>
    );
  }

  const imports = data?.data ?? [];

  if (imports.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">
          Nenhuma importação encontrada. Faça upload de uma planilha Fastchips
          acima.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Arquivo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Operações</TableHead>
            <TableHead className="text-right">Integrantes</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {imports.map((imp) => (
            <TableRow key={imp.id}>
              <TableCell>
                <div className="font-medium">{imp.fileName}</div>
                {imp.fileSize && (
                  <div className="text-xs text-muted-foreground">
                    {(imp.fileSize / 1024).toFixed(1)} KB
                  </div>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(imp.status)}</TableCell>
              <TableCell className="text-right">
                {imp.totalOperations ?? 0}
              </TableCell>
              <TableCell className="text-right">
                {imp.totalMembers ?? 0}
                {(imp.newMembers ?? 0) > 0 && (
                  <span className="text-xs text-blue-600 ml-1">
                    (+{imp.newMembers} novos)
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatDistanceToNow(new Date(imp.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {imp.status === "validated" && (
                      <DropdownMenuItem
                        onClick={() =>
                          processMutation.mutate({ id: imp.id })
                        }
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Processar
                      </DropdownMenuItem>
                    )}
                    {imp.status === "failed" && (
                      <DropdownMenuItem
                        onClick={() =>
                          processMutation.mutate({ id: imp.id })
                        }
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reprocessar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate({ id: imp.id })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function FastchipsImportsListSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16 ml-auto" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}
