"use client";

import type {
  ParsedLeagueGeralPPSTBloco,
  ParsedLeagueJogoPPST,
} from "@/lib/league/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@midday/ui/collapsible";
import { Icons } from "@midday/ui/icons";
import { useMemo, useState } from "react";

// Configuração das ligas e seus percentuais de meta
const LIGAS_CONFIG: Record<
  number,
  { nome: string; percentual: number; tipo: "BR" | "SA" }
> = {
  1675: { nome: "Evolution 1", percentual: 0.15, tipo: "BR" },
  1765: { nome: "Evolution 2", percentual: 0.15, tipo: "BR" },
  2101: { nome: "Evolution 3", percentual: 0.15, tipo: "BR" },
  2448: { nome: "Evolution 4", percentual: 0.15, tipo: "BR" },
  1534: { nome: "Colombiana", percentual: 0.12, tipo: "SA" },
  1578: { nome: "Latinos", percentual: 0.12, tipo: "SA" },
  2006: { nome: "Evolution.", percentual: 0.08, tipo: "SA" },
  2126: { nome: "Nuts", percentual: 0.04, tipo: "SA" },
  2343: { nome: "Golden", percentual: 0.02, tipo: "SA" },
};

const LIGAS_BR = [1675, 1765, 2101, 2448];
const LIGAS_SA = [1534, 1578, 2006, 2126, 2343];

interface LeagueRateioTabProps {
  geralPPST: ParsedLeagueGeralPPSTBloco[];
  jogosPPST: ParsedLeagueJogoPPST[];
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function LeagueRateioTab({
  geralPPST,
  jogosPPST,
}: LeagueRateioTabProps) {
  const [openLigas, setOpenLigas] = useState<Set<number>>(new Set());

  // Calcula estatísticas de rateio
  const stats = useMemo(() => {
    // 1. Somar GTD total de todos os torneios
    let gtdTotal = 0;
    let arrecadadoTotal = 0;
    let arrecadadoBR = 0;
    let arrecadadoSA = 0;

    // Stats para torneios PPST com GTD
    let buyinGTD = 0; // Buyin apenas de torneios PPST com GTD
    let taxaGTD = 0; // Taxa apenas de torneios PPST com GTD
    let gtdTourneysCount = 0; // Contagem de torneios PPST com GTD
    let soOverlay = 0; // Soma apenas dos overlays (resultados negativos)

    // Arrecadado por liga
    const arrecadadoPorLiga: Record<number, number> = {};
    for (const ligaId of [...LIGAS_BR, ...LIGAS_SA]) {
      arrecadadoPorLiga[ligaId] = 0;
    }

    // Clubes por liga (para colapsáveis)
    const clubesPorLiga: Record<
      number,
      { clubeId: number; clubeNome: string; arrecadado: number }[]
    > = {};
    for (const ligaId of [...LIGAS_BR, ...LIGAS_SA]) {
      clubesPorLiga[ligaId] = [];
    }

    // Map temporário para acumular por clube
    const clubeMap: Record<string, { clubeNome: string; arrecadado: number }> =
      {};

    for (const jogo of jogosPPST) {
      // GTD do torneio
      const gtd = jogo.metadata?.premiacaoGarantida ?? 0;

      // Verificar se é organizado pelo PPST
      const isPPSTOrganized = jogo.metadata?.tipoJogo?.toUpperCase()?.startsWith("PPST") ?? false;

      // Buyin e taxa do jogo (com fallback para soma dos jogadores)
      const jogoBuyin = jogo.totalGeral?.buyinFichas ||
        jogo.jogadores?.reduce((s, j) => s + (j.buyinFichas ?? 0), 0) || 0;
      const jogoTaxa = jogo.totalGeral?.taxa ||
        jogo.jogadores?.reduce((s, j) => s + (j.taxa ?? 0), 0) || 0;

      // Só conta GTD de torneios PPST
      if (isPPSTOrganized && gtd > 0) {
        gtdTotal += gtd;
        buyinGTD += jogoBuyin;
        taxaGTD += jogoTaxa;
        gtdTourneysCount++;

        // Só Overlay: (Buyin - Taxa) - GTD, soma apenas se negativo
        const buyinLiquido = jogoBuyin - jogoTaxa;
        const resultado = buyinLiquido - gtd;
        if (resultado < 0) {
          soOverlay += resultado;
        }
      }

      // Arrecadado total do jogo (todos os torneios)
      arrecadadoTotal += jogoBuyin;

      // Arrecadado por liga e clube
      for (const jogador of jogo.jogadores ?? []) {
        const ligaId = jogador.ligaId;
        const buyin = jogador.buyinFichas ?? 0;

        if (LIGAS_CONFIG[ligaId]) {
          arrecadadoPorLiga[ligaId] += buyin;

          if (LIGAS_BR.includes(ligaId)) {
            arrecadadoBR += buyin;
          } else if (LIGAS_SA.includes(ligaId)) {
            arrecadadoSA += buyin;
          }

          // Acumular por clube
          const clubeKey = `${ligaId}-${jogador.clubeId}`;
          if (!clubeMap[clubeKey]) {
            clubeMap[clubeKey] = {
              clubeNome: jogador.clubeNome,
              arrecadado: 0,
            };
          }
          clubeMap[clubeKey].arrecadado += buyin;
        }
      }
    }

    // Converter clubeMap para clubesPorLiga
    for (const [key, data] of Object.entries(clubeMap)) {
      const [ligaIdStr, clubeIdStr] = key.split("-");
      const ligaId = Number(ligaIdStr);
      const clubeId = Number(clubeIdStr);
      if (clubesPorLiga[ligaId]) {
        clubesPorLiga[ligaId].push({
          clubeId,
          clubeNome: data.clubeNome,
          arrecadado: data.arrecadado,
        });
      }
    }

    // Ordenar clubes por arrecadado (desc)
    for (const ligaId of Object.keys(clubesPorLiga)) {
      clubesPorLiga[Number(ligaId)].sort((a, b) => b.arrecadado - a.arrecadado);
    }

    // 2. Meta BR = 60% do GTD
    const metaBR = gtdTotal * 0.6;
    const metaSA = gtdTotal * 0.4;

    // 3. Overlay = max(0, Meta - Arrecadado)
    const overlayBR = Math.max(0, metaBR - arrecadadoBR);
    const overlaySA = Math.max(0, metaSA - arrecadadoSA);
    const overlayTotal = overlayBR + overlaySA;

    // 4. Gap da planilha (coluna O) e dados do Geral PPST para comparação
    const bloco15 = geralPPST.find((b) => b.contexto?.taxaCambio === "1:5");
    const gapPlanilha = bloco15?.total?.gapGarantido ?? 0;

    // Dados do Geral PPST para investigar cálculo do gap
    const geralPPSTData = {
      ganhosJogador: bloco15?.total?.ganhosJogador ?? 0,
      valorTicketGanho: bloco15?.total?.valorTicketGanho ?? 0,
      buyinTicket: bloco15?.total?.buyinTicket ?? 0,
      valorPremioPersonalizado: bloco15?.total?.valorPremioPersonalizado ?? 0,
      ganhosLigaGeral: bloco15?.total?.ganhosLigaGeral ?? 0,
      ganhosLigaTaxa: bloco15?.total?.ganhosLigaTaxa ?? 0,
      buyinSpinup: bloco15?.total?.buyinSpinup ?? 0,
      premiacaoSpinup: bloco15?.total?.premiacaoSpinup ?? 0,
      valorTicketEntregue: bloco15?.total?.valorTicketEntregue ?? 0,
      buyinTicketLiga: bloco15?.total?.buyinTicketLiga ?? 0,
    };

    // Percentual atingido
    const percentualBR = metaBR > 0 ? arrecadadoBR / metaBR : 0;
    const percentualSA = metaSA > 0 ? arrecadadoSA / metaSA : 0;

    return {
      gtdTotal,
      arrecadadoTotal,
      arrecadadoBR,
      arrecadadoSA,
      arrecadadoPorLiga,
      clubesPorLiga,
      metaBR,
      metaSA,
      overlayBR,
      overlaySA,
      overlayTotal,
      gapPlanilha,
      geralPPST: geralPPSTData,
      percentualBR,
      percentualSA,
      atingiuMetaBR: arrecadadoBR >= metaBR,
      atingiuMetaSA: arrecadadoSA >= metaSA,
      // Stats para torneios PPST com GTD
      buyinGTD,
      taxaGTD,
      gtdTourneysCount,
      buyinGTDMenosTaxa: buyinGTD - taxaGTD,
      soOverlay,
    };
  }, [geralPPST, jogosPPST]);

  const toggleLiga = (ligaId: number) => {
    setOpenLigas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ligaId)) {
        newSet.delete(ligaId);
      } else {
        newSet.add(ligaId);
      }
      return newSet;
    });
  };

  if (jogosPPST.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado de Jogos PPST encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Principal */}
      <div className="space-y-1 text-sm">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
          Resumo Rateio
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">GTD Total ({stats.gtdTourneysCount} torneios PPST)</span>
          <span className="font-mono text-[#00C969]">{formatNumber(stats.gtdTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Buyin GTD - Taxa</span>
          <span className="font-mono text-cyan-500">{formatNumber(stats.buyinGTDMenosTaxa)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Meta BR (60% GTD)</span>
          <span className="font-mono text-orange-500">{formatNumber(stats.metaBR)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Arrecadado BR ({formatPercent(stats.percentualBR)})</span>
          <span className={`font-mono ${stats.atingiuMetaBR ? "text-green-500" : "text-yellow-500"}`}>{formatNumber(stats.arrecadadoBR)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Overlay BR</span>
          <span className={`font-mono ${stats.overlayBR > 0 ? "text-red-500" : "text-green-500"}`}>{stats.overlayBR > 0 ? formatNumber(stats.overlayBR) : "0"}</span>
        </div>
      </div>

      {/* Gap da Planilha */}
      <div className="space-y-1 text-sm border-t pt-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
          Gap Planilha (col O)
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gap Total</span>
          <span className={`font-mono ${stats.gapPlanilha < 0 ? "text-red-500" : "text-green-500"}`}>{formatNumber(stats.gapPlanilha)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gap 60% BR</span>
          <span className={`font-mono ${stats.gapPlanilha * 0.6 < 0 ? "text-red-500" : "text-green-500"}`}>{formatNumber(stats.gapPlanilha * 0.6)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gap 40% SA</span>
          <span className={`font-mono ${stats.gapPlanilha * 0.4 < 0 ? "text-red-500" : "text-green-500"}`}>{formatNumber(stats.gapPlanilha * 0.4)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 mt-1">
          <span className="text-muted-foreground">Só Overlay</span>
          <span className="font-mono text-red-500">{formatNumber(stats.soOverlay)}</span>
        </div>
      </div>

      {/* Rateio por Liga */}
      <div className="space-y-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Arrecadado por Liga
        </div>

        {/* Header */}
        <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground border-b pb-2">
          <span>Liga</span>
          <span className="text-right">Meta %</span>
          <span className="text-right">Arrecadado</span>
          <span className="text-right">% do Grupo</span>
          <span className="text-right">Clubes</span>
        </div>

        {/* Ligas Brasileiras */}
        <div className="space-y-1">
          {LIGAS_BR.map((ligaId) => {
            const config = LIGAS_CONFIG[ligaId];
            const arrecadado = stats.arrecadadoPorLiga[ligaId] ?? 0;
            const percentual =
              stats.arrecadadoBR > 0 ? arrecadado / stats.arrecadadoBR : 0;
            const clubes = stats.clubesPorLiga[ligaId] ?? [];
            const isOpen = openLigas.has(ligaId);

            return (
              <Collapsible
                key={ligaId}
                open={isOpen}
                onOpenChange={() => toggleLiga(ligaId)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="grid grid-cols-5 gap-2 text-sm py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer">
                    <span className="flex items-center gap-1 text-left">
                      <Icons.ChevronRight
                        className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                      {config.nome}
                      <span className="text-[10px] text-muted-foreground">
                        ({ligaId})
                      </span>
                    </span>
                    <span className="text-right font-mono">
                      {formatPercent(config.percentual)}
                    </span>
                    <span className="text-right font-mono text-green-500">
                      {formatNumber(arrecadado)}
                    </span>
                    <span className="text-right font-mono">
                      {formatPercent(percentual)}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {clubes.length}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-3">
                    {clubes.map((clube) => (
                      <div
                        key={clube.clubeId}
                        className="grid grid-cols-3 gap-2 text-xs py-1 text-muted-foreground"
                      >
                        <span className="truncate">
                          {clube.clubeNome || `Clube ${clube.clubeId}`}
                        </span>
                        <span className="text-right font-mono">
                          {clube.clubeId}
                        </span>
                        <span className="text-right font-mono text-foreground">
                          {formatNumber(clube.arrecadado)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {/* Subtotal BR */}
          <div className="grid grid-cols-5 gap-2 text-sm py-1.5 px-2 bg-blue-500/10 rounded font-medium">
            <span>Total Brasil</span>
            <span className="text-right font-mono">60%</span>
            <span
              className={`text-right font-mono ${stats.atingiuMetaBR ? "text-green-500" : "text-yellow-500"}`}
            >
              {formatNumber(stats.arrecadadoBR)}
            </span>
            <span className="text-right font-mono">100%</span>
            <span className="text-right">
              {LIGAS_BR.reduce((sum, ligaId) => sum + (stats.clubesPorLiga[ligaId]?.length ?? 0), 0)}
            </span>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t my-2" />

        {/* Ligas Sul-Americanas */}
        <div className="space-y-1">
          {LIGAS_SA.map((ligaId) => {
            const config = LIGAS_CONFIG[ligaId];
            const arrecadado = stats.arrecadadoPorLiga[ligaId] ?? 0;
            const percentual =
              stats.arrecadadoSA > 0 ? arrecadado / stats.arrecadadoSA : 0;
            const clubes = stats.clubesPorLiga[ligaId] ?? [];
            const isOpen = openLigas.has(ligaId);

            return (
              <Collapsible
                key={ligaId}
                open={isOpen}
                onOpenChange={() => toggleLiga(ligaId)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="grid grid-cols-5 gap-2 text-sm py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer">
                    <span className="flex items-center gap-1 text-left">
                      <Icons.ChevronRight
                        className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                      {config.nome}
                      <span className="text-[10px] text-muted-foreground">
                        ({ligaId})
                      </span>
                    </span>
                    <span className="text-right font-mono">
                      {formatPercent(config.percentual)}
                    </span>
                    <span className="text-right font-mono text-green-500">
                      {formatNumber(arrecadado)}
                    </span>
                    <span className="text-right font-mono">
                      {formatPercent(percentual)}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {clubes.length}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-3">
                    {clubes.map((clube) => (
                      <div
                        key={clube.clubeId}
                        className="grid grid-cols-3 gap-2 text-xs py-1 text-muted-foreground"
                      >
                        <span className="truncate">
                          {clube.clubeNome || `Clube ${clube.clubeId}`}
                        </span>
                        <span className="text-right font-mono">
                          {clube.clubeId}
                        </span>
                        <span className="text-right font-mono text-foreground">
                          {formatNumber(clube.arrecadado)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {/* Subtotal SA */}
          <div className="grid grid-cols-5 gap-2 text-sm py-1.5 px-2 bg-orange-500/10 rounded font-medium">
            <span>Total Sul-Americanas</span>
            <span className="text-right font-mono">40%</span>
            <span
              className={`text-right font-mono ${stats.atingiuMetaSA ? "text-green-500" : "text-yellow-500"}`}
            >
              {formatNumber(stats.arrecadadoSA)}
            </span>
            <span className="text-right font-mono">100%</span>
            <span className="text-right">
              {LIGAS_SA.reduce((sum, ligaId) => sum + (stats.clubesPorLiga[ligaId]?.length ?? 0), 0)}
            </span>
          </div>
        </div>

        {/* Total Geral */}
        <div className="border-t pt-2">
          <div className="grid grid-cols-5 gap-2 text-sm py-1.5 px-2 bg-muted/30 rounded font-bold">
            <span>TOTAL GERAL</span>
            <span className="text-right font-mono">100%</span>
            <span className="text-right font-mono text-green-500">
              {formatNumber(stats.arrecadadoBR + stats.arrecadadoSA)}
            </span>
            <span />
            <span className="text-right">
              {[...LIGAS_BR, ...LIGAS_SA].reduce((sum, ligaId) => sum + (stats.clubesPorLiga[ligaId]?.length ?? 0), 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Dados Geral PPST */}
      <div className="border-t pt-4 space-y-1 text-sm">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
          Geral PPST 1:5
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ganhos Jogador (E)</span>
          <span className="font-mono">{formatNumber(stats.geralPPST.ganhosJogador)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ganhos Liga (I)</span>
          <span className="font-mono">{formatNumber(stats.geralPPST.ganhosLigaGeral)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxa (J)</span>
          <span className="font-mono text-green-500">{formatNumber(stats.geralPPST.ganhosLigaTaxa)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Arrecadado Total</span>
          <span className="font-mono text-blue-500">{formatNumber(stats.arrecadadoTotal)}</span>
        </div>
      </div>
    </div>
  );
}
