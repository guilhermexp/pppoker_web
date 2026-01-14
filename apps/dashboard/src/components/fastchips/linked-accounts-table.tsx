"use client";

import { useFastchipsLinkedAccountParams } from "@/hooks/use-fastchips-linked-account-params";
import { useI18n } from "@/locales/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent } from "@midpoker/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midpoker/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useMemo, useState } from "react";
import {
  type FastChipsLinkedAccountStatus,
  fastChipsLinkedAccounts,
} from "./linked-accounts-data";

const statusClasses: Record<FastChipsLinkedAccountStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-200 text-gray-700 border-gray-300",
};

function getRestrictionLabel(restriction: string | null) {
  if (restriction === "auto_withdraw") {
    return "fastchips.contas_vinculadas.restriction_auto_withdraw";
  }
  if (restriction === "blocked") {
    return "fastchips.contas_vinculadas.restriction_blocked";
  }
  return "";
}

export function FastChipsLinkedAccountsTable() {
  const t = useI18n();
  const { fastchipsLinkedAccountId, setParams } =
    useFastchipsLinkedAccountParams();
  const [viewMode, setViewMode] = useState<"all" | "custom">("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => {
    if (statusFilter === "all") {
      return fastChipsLinkedAccounts;
    }
    return fastChipsLinkedAccounts.filter(
      (account) => account.status === statusFilter,
    );
  }, [statusFilter]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center">
              <Icons.AccountCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("fastchips.contas_vinculadas.stats.inactive_blocked")}
              </p>
              <p className="text-lg font-semibold">266 / 29</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center">
              <Icons.AccountCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("fastchips.contas_vinculadas.stats.active_blocked_withdraw")}
              </p>
              <p className="text-lg font-semibold">1811 / 92</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center">
              <Icons.AccountCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("fastchips.contas_vinculadas.stats.total_players")}
              </p>
              <p className="text-lg font-semibold">2110</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{t("fastchips.contas_vinculadas.view_by")}</span>
          <div className="flex items-center rounded-md border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
                viewMode === "all"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t("fastchips.contas_vinculadas.view_all")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("custom")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
                viewMode === "custom"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t("fastchips.contas_vinculadas.view_custom")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-[280px]">
          <Icons.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("fastchips.contas_vinculadas.search_placeholder")}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder={t("fastchips.contas_vinculadas.filter_all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("fastchips.contas_vinculadas.filter_all")}
            </SelectItem>
            <SelectItem value="active">
              {t("fastchips.contas_vinculadas.filter_active")}
            </SelectItem>
            <SelectItem value="inactive">
              {t("fastchips.contas_vinculadas.filter_inactive")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.contas_vinculadas.table.name")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.contas_vinculadas.table.player_id")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.contas_vinculadas.table.phone")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.contas_vinculadas.table.date")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.contas_vinculadas.table.status")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.contas_vinculadas.table.restriction")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                {t("fastchips.contas_vinculadas.table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((account) => {
              const isSelected = fastchipsLinkedAccountId === account.id;
              return (
                <TableRow
                  key={account.id}
                  className={`cursor-pointer hover:bg-accent/50 ${
                    isSelected
                      ? "bg-primary/5 outline outline-1 outline-primary/40"
                      : "even:bg-muted/20"
                  }`}
                  onClick={() =>
                    setParams({ fastchipsLinkedAccountId: account.id })
                  }
                >
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.playerId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-rose-500">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/10 text-[9px] font-semibold">
                        W
                      </span>
                      <span className="text-sm">{account.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>{account.date}</TableCell>
                  <TableCell>
                    {account.status ? (
                      <Badge
                        variant="secondary"
                        className={`border ${statusClasses[account.status]}`}
                      >
                        {account.status === "active"
                          ? t("fastchips.contas_vinculadas.status_active")
                          : t("fastchips.contas_vinculadas.status_inactive")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.restriction ? (
                      <Badge
                        variant="secondary"
                        className="border bg-emerald-100 text-emerald-700 border-emerald-200"
                      >
                        {t(getRestrictionLabel(account.restriction))}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border border-border text-muted-foreground"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Icons.MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          {t("fastchips.contas_vinculadas.actions.reset_withdraw")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.contas_vinculadas.actions.block_withdraw")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.contas_vinculadas.actions.block_account")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.contas_vinculadas.actions.manual_withdraw")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.contas_vinculadas.actions.customize_withdraw")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
