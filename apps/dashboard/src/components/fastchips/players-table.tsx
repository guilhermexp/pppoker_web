"use client";

import { useFastchipsPlayerParams } from "@/hooks/use-fastchips-player-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent } from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { Skeleton } from "@midpoker/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";

export function FastChipsPlayersTable() {
  const t = useI18n();
  const trpc = useTRPC();
  const { fastchipsPlayerId, setParams } = useFastchipsPlayerParams();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch members from tRPC
  const { data, isLoading, error } = useQuery(
    trpc.fastchips.members.list.queryOptions({
      pageSize: 50,
      search: searchQuery || undefined,
    })
  );

  // Map tRPC data to table format
  const rows = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((member) => ({
      id: member.id,
      playerId: member.ppPokerId || "-",
      name: member.name,
      linkedAt: member.linkedAt ? format(new Date(member.linkedAt), "dd/MM/yy") : "-",
      totalLinkedAccounts: member.linkedAccountsCount ?? 0,
    }));
  }, [data]);

  const totalMembers = data?.total ?? 0;

  return (
    <div className="space-y-5">
      <Card className="max-w-[320px]">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
            <Icons.AccountCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t("fastchips.jogadores.total_players")}
            </p>
            <p className="text-lg font-semibold">{totalMembers}</p>
            <p className="text-xs text-muted-foreground">
              {t("fastchips.jogadores.no_new_players")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-[240px]">
          <Icons.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("fastchips.jogadores.search_placeholder")}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.jogadores.table.name")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.jogadores.table.linked_at")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                {t("fastchips.jogadores.table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Erro ao carregar integrantes
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum integrante encontrado. Importe uma planilha Fastchips para começar.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((player) => {
                const isSelected = fastchipsPlayerId === player.id;
                return (
                  <TableRow
                    key={player.id}
                    className={`cursor-pointer hover:bg-accent/50 ${
                      isSelected
                        ? "bg-primary/5 outline outline-1 outline-primary/40"
                        : "even:bg-muted/20"
                    }`}
                    onClick={() => setParams({ fastchipsPlayerId: player.id })}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center">
                          <Icons.AccountCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span>{player.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{player.linkedAt}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {t("fastchips.jogadores.linked_accounts", {
                            count: player.totalLinkedAccounts,
                          })}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 border border-border text-muted-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          setParams({ fastchipsPlayerId: player.id });
                        }}
                      >
                        <Icons.ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
