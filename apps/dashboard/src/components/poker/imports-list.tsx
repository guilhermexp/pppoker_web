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
import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
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
type SourceType = "club" | "league" | "su";

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  club: "Clube",
  league: "Liga",
  su: "Super Union",
};

const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  club: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  league:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  su: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
};

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

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type ImportsListProps = {
  sourceType?: SourceType;
  compact?: boolean;
};

export function ImportsList({ sourceType, compact = false }: ImportsListProps) {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.poker.imports.get.infiniteQueryOptions(
        { pageSize: compact ? 5 : 10, sourceType: sourceType ?? null },
        { getNextPageParam: (lastPage) => lastPage.meta.cursor },
      ),
    );

  const invalidateImports = () => {
    // Force refetch of all import queries - use refetchQueries for immediate update
    queryClient.refetchQueries({
      predicate: (query) => {
        const key = query.queryKey;
        // tRPC v11 queryKey structure: [["poker", "imports", "get"], { input: {...} }]
        if (Array.isArray(key) && Array.isArray(key[0])) {
          const routeKey = key[0] as string[];
          return routeKey[0] === "poker" && routeKey[1] === "imports";
        }
        return false;
      },
    });
  };

  const validateMutation = useMutation(
    trpc.poker.imports.validate.mutationOptions({
      onSuccess: () => {
        invalidateImports();
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
    }),
  );

  const processMutation = useMutation(
    trpc.poker.imports.process.mutationOptions({
      onSuccess: () => {
        invalidateImports();
        // Also refetch poker data queries
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey;
            if (Array.isArray(key) && Array.isArray(key[0])) {
              const routeKey = key[0] as string[];
              return (
                routeKey[0] === "poker" &&
                (routeKey[1] === "players" ||
                  routeKey[1] === "sessions" ||
                  routeKey[1] === "analytics")
              );
            }
            return false;
          },
        });
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
    }),
  );

  const cancelMutation = useMutation(
    trpc.poker.imports.cancel.mutationOptions({
      onSuccess: () => {
        invalidateImports();
        toast({
          title: t("poker.import.cancelSuccess"),
          variant: "success",
        });
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.poker.imports.delete.mutationOptions({
      onSuccess: () => {
        invalidateImports();
        toast({
          title: t("poker.import.deleteSuccess"),
          variant: "success",
        });
      },
    }),
  );

  const imports = data?.pages.flatMap((page) => page.data) ?? [];

  if (imports.length === 0) {
    return (
      <div
        className={cn(
          "text-center text-muted-foreground",
          compact ? "py-6" : "py-12",
        )}
      >
        <Icons.Files
          className={cn(
            "mx-auto mb-3 opacity-50",
            compact ? "h-8 w-8" : "h-12 w-12 mb-4",
          )}
        />
        <p className={compact ? "text-sm" : ""}>
          {sourceType
            ? `Nenhuma importação de ${SOURCE_TYPE_LABELS[sourceType]}`
            : t("poker.import.noImports")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {imports.map((imp) => (
        <div
          key={imp.id}
          className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
        >
          {/* Row 1: File info + Badges */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Icons.Files className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{imp.fileName}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{formatFileSize(imp.fileSize)}</span>
                  <span className="text-border">·</span>
                  <span>
                    {formatDistanceToNow(new Date(imp.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!sourceType && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    SOURCE_TYPE_COLORS[
                      (imp.sourceType as SourceType) ?? "club"
                    ],
                  )}
                >
                  {SOURCE_TYPE_LABELS[(imp.sourceType as SourceType) ?? "club"]}
                </span>
              )}
              <Badge
                variant={getStatusVariant(imp.status as ImportStatus)}
                className="text-[10px]"
              >
                {t(`poker.import.status.${imp.status}`)}
              </Badge>
              {imp.status === "completed" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    (imp as any).committed
                      ? "border-green-500/50 text-green-600 dark:text-green-400"
                      : "border-amber-500/50 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {(imp as any).committed ? "Committed" : "Draft"}
                </Badge>
              )}
            </div>
          </div>

          {/* Row 2: Action buttons */}
          <div className="flex items-center justify-end gap-1">
            {imp.status === "validating" && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => validateMutation.mutate({ id: imp.id })}
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <Spinner size={14} />
                ) : (
                  t("poker.import.validate")
                )}
              </Button>
            )}

            {imp.status === "validated" && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => processMutation.mutate({ id: imp.id })}
                disabled={processMutation.isPending}
              >
                {processMutation.isPending ? (
                  <Spinner size={14} />
                ) : (
                  t("poker.import.process")
                )}
              </Button>
            )}

            {["pending", "validating", "validated"].includes(imp.status) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => cancelMutation.mutate({ id: imp.id })}
                disabled={cancelMutation.isPending}
                title="Cancelar"
              >
                <Icons.Close className="h-3.5 w-3.5" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (
                  window.confirm(
                    "Tem certeza que deseja excluir esta importação?",
                  )
                ) {
                  deleteMutation.mutate({ id: imp.id });
                }
              }}
              disabled={deleteMutation.isPending || imp.status === "processing"}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() =>
                setExpandedId(expandedId === imp.id ? null : imp.id)
              }
            >
              <Icons.ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expandedId === imp.id && "rotate-180",
                )}
              />
            </Button>
          </div>

          {expandedId === imp.id && (
            <div className="mt-4 pt-4 border-t space-y-4">
              {/* Metadata: Club ID, Union ID, Period */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {(imp as any).leagueId && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Liga:</span>
                    <span className="font-mono font-medium">
                      {(imp as any).leagueId}
                    </span>
                  </div>
                )}
                {(imp as any).clubId && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Clube:</span>
                    <span className="font-mono font-medium">
                      {(imp as any).clubId}
                    </span>
                  </div>
                )}
                {imp.periodStart && imp.periodEnd && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">
                      {new Date(imp.periodStart).toLocaleDateString()} -{" "}
                      {new Date(imp.periodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Jogadores Card */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icons.AccountCircle className="h-3.5 w-3.5" />
                    <span>Jogadores</span>
                  </div>
                  <p className="text-xl font-semibold">{imp.totalPlayers}</p>
                  {(imp as any).stats && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>Com agente</span>
                        <span className="font-medium text-foreground">
                          {(imp as any).stats.playersWithAgent}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sem agente</span>
                        <span className="font-medium text-foreground">
                          {(imp as any).stats.playersWithoutAgent}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hierarquia Card */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icons.Category className="h-3.5 w-3.5" />
                    <span>Hierarquia</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {(imp as any).stats?.agentsCount ?? 0}
                  </p>
                  {(imp as any).stats && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>Agentes</span>
                        <span className="font-medium text-foreground">
                          {(imp as any).stats.agentsCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Super agentes</span>
                        <span className="font-medium text-foreground">
                          {(imp as any).stats.superAgentsCount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Partidas Card */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icons.Speed className="h-3.5 w-3.5" />
                    <span>Partidas</span>
                  </div>
                  <p className="text-xl font-semibold">{imp.totalSessions}</p>
                  {(imp as any).stats?.sessionsByType && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      {(imp as any).stats.sessionsByType.cash_game > 0 && (
                        <div className="flex justify-between">
                          <span>Cash Games</span>
                          <span className="font-medium text-foreground">
                            {(imp as any).stats.sessionsByType.cash_game}
                          </span>
                        </div>
                      )}
                      {(imp as any).stats.sessionsByType.mtt > 0 && (
                        <div className="flex justify-between">
                          <span>MTT</span>
                          <span className="font-medium text-foreground">
                            {(imp as any).stats.sessionsByType.mtt}
                          </span>
                        </div>
                      )}
                      {(imp as any).stats.sessionsByType.spin > 0 && (
                        <div className="flex justify-between">
                          <span>SPIN</span>
                          <span className="font-medium text-foreground">
                            {(imp as any).stats.sessionsByType.spin}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ganhos/Perdas Card */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icons.Currency className="h-3.5 w-3.5" />
                    <span>Resultado</span>
                  </div>
                  <p
                    className={cn(
                      "text-xl font-semibold",
                      ((imp as any).stats?.totalWinnings ?? 0) >= 0
                        ? "text-green-500"
                        : "text-red-500",
                    )}
                  >
                    {((imp as any).stats?.totalWinnings ?? 0) >= 0 ? "" : "-"}
                    R${" "}
                    {Math.abs(
                      (imp as any).stats?.totalWinnings ?? 0,
                    ).toLocaleString("pt-BR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  {(imp as any).stats && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>Winners</span>
                        <span className="font-medium text-green-500">
                          {(imp as any).stats.winners}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Losers</span>
                        <span className="font-medium text-red-500">
                          {(imp as any).stats.losers}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Secondary stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Transações
                  </div>
                  <p className="text-lg font-semibold">
                    {imp.totalTransactions.toLocaleString()}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Novos jogadores
                  </div>
                  <p className="text-lg font-semibold text-green-500">
                    +{imp.newPlayers}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Atualizados
                  </div>
                  <p className="text-lg font-semibold">{imp.updatedPlayers}</p>
                </div>
              </div>

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

              {imp.processingErrors &&
                (imp.processingErrors as string[]).length > 0 && (
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
            {isFetchingNextPage ? <Spinner size={16} className="mr-2" /> : null}
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
