"use client";

import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const topStats = [
  { label: "Partidas", value: 0 },
  { label: "Ganhos do jogador", value: 0 },
  { label: "Taxa", value: 0 },
  { label: "Buy-in de SpinUp", value: 0 },
  { label: "Premiação de SpinUp", value: 0 },
  { label: "Ganhos de SpinUp", value: 0 },
];

const gameTabs = [
  { label: "TUDO", active: true },
  { label: "CRASH" },
  { label: "NLH", badge: "NEW" },
  { label: "FLASH" },
  { label: "PLO5" },
];

export function PokerDashboardDataPanel() {
  const [open, setOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState("TUDO");

  return (
    <>
      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-40 h-11 -translate-y-1/2 rounded-r-none rounded-l-lg px-4 shadow-lg"
        >
          Dados no clube
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0" title="Dados no clube">
          <SheetHeader className="border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-muted-foreground">
                  <Icons.Invoice className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-semibold">Dados no clube</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fechar painel"
                onClick={() => setOpen(false)}
              >
                <Icons.Close className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between rounded-lg bg-white/[0.015] px-1 py-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white/[0.05]">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium tracking-tight">
                    2026/02/22 - 2026/02/22
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white/[0.05]">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-md border-white/10 bg-white/[0.025] text-foreground hover:bg-white/[0.05]"
                  >
                    Ontem
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 rounded-md border-white/10 bg-white/[0.025] text-foreground hover:bg-white/[0.05]"
                  >
                    7 d anter.
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 justify-between rounded-md border-white/10 bg-white/[0.025] px-3 text-foreground hover:bg-white/[0.05]"
                  >
                    Selecionar
                    <Icons.ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/8 bg-white/[0.01]">
                {topStats.map((item, index) => (
                  <div
                    key={item.label}
                    className={cn(
                      "min-h-[88px] border-white/6 p-3 text-center",
                      index % 3 !== 2 && "border-r",
                      index < 3 && "border-b",
                    )}
                  >
                    <p className="font-mono text-[28px] font-semibold leading-none tracking-tight">
                      {item.value}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-white/[0.015] p-1">
                {gameTabs.map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setSelectedGame(tab.label)}
                    className={cn(
                      "relative inline-flex h-8 min-w-[72px] items-center justify-center rounded-md border px-3 text-xs font-medium whitespace-nowrap transition-colors",
                      selectedGame === tab.label
                        ? "border-primary/25 bg-primary/15 text-foreground"
                        : "border-transparent bg-transparent text-muted-foreground hover:bg-white/[0.035]",
                    )}
                  >
                    {tab.label}
                    {tab.badge && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 h-4 px-1 text-[9px]"
                      >
                        {tab.badge}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex min-h-[286px] flex-col items-center justify-center rounded-xl border border-dashed border-white/8 bg-gradient-to-b from-white/[0.02] to-white/[0.005] text-center">
                <div className="mb-4 rounded-full border border-white/8 bg-white/[0.02] p-4">
                  <Search className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Nenhum dado</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajuste filtros ou período para visualizar resultados
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 px-1 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
                <span>Horário da liga: UTC-05:00 10:33</span>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
