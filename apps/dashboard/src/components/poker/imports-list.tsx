"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import { cn } from "@midday/ui/cn";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { Spinner } from "@midday/ui/spinner";
import { useToast } from "@midday/ui/use-toast";
import { useMutation, useQueryClient, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

type ImportStatus = "pending" | "validating" | "validated" | "processing" | "completed" | "failed" | "cancelled";

function getStatusVariant(status: ImportStatus): "default" | "secondary" | "success" | "destructive" | "warning" {
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

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function ImportsList() {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    trpc.poker.imports.get.infiniteQueryOptions(
      { pageSize: 10 },
      { getNextPageParam: (lastPage) => lastPage.meta.cursor }
    )
  );

  const validateMutation = useMutation(
    trpc.poker.imports.validate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poker", "imports"] });
        toast({
          title: t("poker.import.validateSuccess"),
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: t("poker.import.validateError"),
          description: error.message,
          variant: "error",
        });
      },
    })
  );

  const processMutation = useMutation(
    trpc.poker.imports.process.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poker", "imports"] });
        queryClient.invalidateQueries({ queryKey: ["poker", "players"] });
        toast({
          title: t("poker.import.processSuccess"),
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: t("poker.import.processError"),
          description: error.message,
          variant: "error",
        });
      },
    })
  );

  const cancelMutation = useMutation(
    trpc.poker.imports.cancel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poker", "imports"] });
        toast({
          title: t("poker.import.cancelSuccess"),
          variant: "success",
        });
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.poker.imports.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poker", "imports"] });
        toast({
          title: t("poker.import.deleteSuccess"),
          variant: "success",
        });
      },
    })
  );

  const imports = data?.pages.flatMap((page) => page.data) ?? [];

  if (imports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icons.Files className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("poker.import.noImports")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {imports.map((imp) => (
        <div
          key={imp.id}
          className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Icons.Files className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{imp.fileName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatFileSize(imp.fileSize)}</span>
                  <span>-</span>
                  <span>
                    {formatDistanceToNow(new Date(imp.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={getStatusVariant(imp.status as ImportStatus)}>
                {t(`poker.import.status.${imp.status}`)}
              </Badge>

              <div className="flex items-center gap-2">
                {imp.status === "validating" && (
                  <Button
                    size="sm"
                    onClick={() => validateMutation.mutate({ id: imp.id })}
                    disabled={validateMutation.isPending}
                  >
                    {validateMutation.isPending ? (
                      <Spinner size={16} />
                    ) : (
                      t("poker.import.validate")
                    )}
                  </Button>
                )}

                {imp.status === "validated" && (
                  <Button
                    size="sm"
                    onClick={() => processMutation.mutate({ id: imp.id })}
                    disabled={processMutation.isPending}
                  >
                    {processMutation.isPending ? (
                      <Spinner size={16} />
                    ) : (
                      t("poker.import.process")
                    )}
                  </Button>
                )}

                {["pending", "validating", "validated"].includes(imp.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelMutation.mutate({ id: imp.id })}
                    disabled={cancelMutation.isPending}
                    title="Cancelar"
                  >
                    <Icons.Close className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja excluir esta importação?")) {
                      deleteMutation.mutate({ id: imp.id });
                    }
                  }}
                  disabled={deleteMutation.isPending || imp.status === "processing"}
                  title="Excluir"
                  className="text-destructive hover:text-destructive"
                >
                  <Icons.Delete className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(expandedId === imp.id ? null : imp.id)}
                >
                  <Icons.ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expandedId === imp.id && "rotate-180"
                    )}
                  />
                </Button>
              </div>
            </div>
          </div>

          {expandedId === imp.id && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("poker.import.totalPlayers")}</p>
                  <p className="text-lg font-medium">{imp.totalPlayers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("poker.import.newPlayers")}</p>
                  <p className="text-lg font-medium">{imp.newPlayers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("poker.import.updatedPlayers")}</p>
                  <p className="text-lg font-medium">{imp.updatedPlayers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("poker.import.totalTransactions")}</p>
                  <p className="text-lg font-medium">{imp.totalTransactions}</p>
                </div>
              </div>

              {imp.periodStart && imp.periodEnd && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("poker.import.period")}</p>
                  <p className="font-medium">
                    {new Date(imp.periodStart).toLocaleDateString()} -{" "}
                    {new Date(imp.periodEnd).toLocaleDateString()}
                  </p>
                </div>
              )}

              {imp.validationErrors && imp.validationErrors.length > 0 && (
                <div>
                  <p className="text-sm text-destructive font-medium mb-2">
                    {t("poker.import.validationErrors")}
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {(imp.validationErrors as string[]).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {imp.processingErrors && (imp.processingErrors as string[]).length > 0 && (
                <div>
                  <p className="text-sm text-destructive font-medium mb-2">
                    {t("poker.import.processingErrors")}
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {(imp.processingErrors as string[]).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {imp.validationWarnings && imp.validationWarnings.length > 0 && (
                <div>
                  <p className="text-sm text-warning font-medium mb-2">
                    {t("poker.import.warnings")}
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {(imp.validationWarnings as string[]).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {hasNextPage && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Spinner size={16} className="mr-2" />
            ) : null}
            {t("poker.import.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

ImportsList.Skeleton = function ImportsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
};
