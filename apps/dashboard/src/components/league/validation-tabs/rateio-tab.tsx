"use client";

import type {
  ParsedLeagueGeralPPSTBloco,
  ParsedLeagueJogoPPST,
} from "@/lib/league/types";
import { useMemo } from "react";

// Configuração das ligas
const LIGAS_CONFIG: Record<number, { nome: string; tipo: "BR" | "SA" }> = {
  1675: { nome: "Evolution 1", tipo: "BR" },
  1765: { nome: "Evolution 2", tipo: "BR" },
  2101: { nome: "Evolution 3", tipo: "BR" },
  2448: { nome: "Evolution 4", tipo: "BR" },
  1534: { nome: "Colombiana", tipo: "SA" },
  1578: { nome: "Latinos", tipo: "SA" },
  2006: { nome: "Evolution.", tipo: "SA" },
  2126: { nome: "Nuts", tipo: "SA" },
  2343: { nome: "Golden", tipo: "SA" },
};

const LIGAS_BR = [1675, 1765, 2101, 2448];
const LIGAS_SA = [1534, 1578, 2006, 2126, 2343];

interface LeagueRateioTabProps {
  geralPPST: ParsedLeagueGeralPPSTBloco[];
  jogosPPST: ParsedLeagueJogoPPST[];
}

function formatNumber(value: number): string {
  return `R$ ${new Intl.NumberFormat("pt-BR").format(Math.round(value))}`;
}

export function LeagueRateioTab({
  geralPPST,
  jogosPPST,
}: LeagueRateioTabProps) {
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

    // Arrecadado por liga (só overlay)
    const arrecadadoPorLiga: Record<number, number> = {};
    // Arrecadado por liga (todos GTD)
    const arrecadadoPorLigaTotal: Record<number, number> = {};
    let arrecadadoBRTotal = 0;
    let arrecadadoSATotal = 0;
    for (const ligaId of [...LIGAS_BR, ...LIGAS_SA]) {
      arrecadadoPorLiga[ligaId] = 0;
      arrecadadoPorLigaTotal[ligaId] = 0;
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

    // Contadores para todos os torneios com GTD
    let overlayTourneysCount = 0;
    let gtdTotalTodos = 0; // GTD total de TODOS os torneios (não só overlay)

    // Separar ME (Main Event) de Outros
    type TorneioInfo = {
      nome: string;
      data: string;
      gtdUSD: number;
      gtdBRL: number;
      buyinBRL: number;
      entradas: number;
      overlay: number;
    };
    const torneisoME: TorneioInfo[] = [];
    const torneiosOutros: TorneioInfo[] = [];
    let arrecadadoME = 0;
    let arrecadadoOutros = 0;
    let gtdME = 0;
    let gtdOutros = 0;

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

      // Arrecadado total do jogo (todos os torneios)
      arrecadadoTotal += jogoBuyin;

      // Só conta GTD de torneios PPST
      if (isPPSTOrganized && gtd > 0) {
        gtdTourneysCount++;
        gtdTotalTodos += gtd; // Soma GTD de TODOS os torneios com GTD

        // Arrecadado por liga - TODOS os torneios com GTD
        for (const jogador of jogo.jogadores ?? []) {
          const ligaId = jogador.ligaId;
          const buyin = jogador.buyinFichas ?? 0;
          if (LIGAS_CONFIG[ligaId]) {
            arrecadadoPorLigaTotal[ligaId] += buyin;
            if (LIGAS_BR.includes(ligaId)) {
              arrecadadoBRTotal += buyin;
            } else if (LIGAS_SA.includes(ligaId)) {
              arrecadadoSATotal += buyin;
            }
          }
        }

        // Verificar se teve overlay: (Buyin - Taxa) - GTD < 0
        const buyinLiquido = jogoBuyin - jogoTaxa;
        const resultado = buyinLiquido - gtd;
        const temOverlay = resultado < 0;

        // ME = torneio das 20:00 (Main Event do dia)
        const horaInicio = jogo.metadata?.horaInicio ?? "";
        const isME = horaInicio === "20:00";
        // Outros = qualquer torneio com GTD que NÃO é das 20:00

        // Info do torneio
        const torneioInfo: TorneioInfo = {
          nome: jogo.metadata?.nomeMesa ?? "Sem nome",
          data: jogo.metadata?.dataInicio ?? "",
          gtdUSD: gtd / 5, // Assumindo taxa 1:5
          gtdBRL: gtd,
          buyinBRL: buyinLiquido,
          entradas: jogo.jogadores?.length ?? 0,
          overlay: temOverlay ? Math.abs(resultado) : 0,
        };

        // ME = 7 torneios específicos, Outros = resto
        if (isME) {
          torneisoME.push(torneioInfo);
          arrecadadoME += buyinLiquido;
          gtdME += gtd;
        } else {
          torneiosOutros.push(torneioInfo);
          arrecadadoOutros += buyinLiquido;
          gtdOutros += gtd;
        }

        if (temOverlay) {
          // Só soma nos totais se teve overlay
          gtdTotal += gtd;
          buyinGTD += jogoBuyin;
          taxaGTD += jogoTaxa;
          soOverlay += resultado;
          overlayTourneysCount++;

          // Arrecadado por liga e clube - APENAS de torneios com overlay
          // Arrecadado = Buyin - Taxa (líquido)
          for (const jogador of jogo.jogadores ?? []) {
            const ligaId = jogador.ligaId;
            const buyin = jogador.buyinFichas ?? 0;
            const taxa = jogador.taxa ?? 0;
            const liquido = buyin - taxa; // Buyin - Taxa

            if (LIGAS_CONFIG[ligaId]) {
              arrecadadoPorLiga[ligaId] += liquido;

              if (LIGAS_BR.includes(ligaId)) {
                arrecadadoBR += liquido;
              } else if (LIGAS_SA.includes(ligaId)) {
                arrecadadoSA += liquido;
              }

              // Acumular por clube
              const clubeKey = `${ligaId}-${jogador.clubeId}`;
              if (!clubeMap[clubeKey]) {
                clubeMap[clubeKey] = {
                  clubeNome: jogador.clubeNome,
                  arrecadado: 0,
                };
              }
              clubeMap[clubeKey].arrecadado += liquido;
            }
          }
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
      overlayTourneysCount,
      buyinGTDMenosTaxa: buyinGTD - taxaGTD,
      soOverlay,
      gtdTotalTodos, // GTD total de TODOS os torneios
      arrecadadoPorLigaTotal, // Buyins por liga de TODOS os torneios com GTD
      arrecadadoBRTotal,
      arrecadadoSATotal,
      // ME vs Outros
      torneisoME,
      torneiosOutros,
      arrecadadoME,
      arrecadadoOutros,
      gtdME,
      gtdOutros,
    };
  }, [geralPPST, jogosPPST]);

  if (jogosPPST.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado de Jogos PPST encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Rateio
        </div>
        <div className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
          Só Torneios c/ Overlay ({stats.overlayTourneysCount} de {stats.gtdTourneysCount})
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
          <span className="text-muted-foreground">Só Overlay</span>
          <span className="font-mono text-red-500">{formatNumber(stats.soOverlay)}</span>
        </div>
      </div>

      {/* Arrecadação ME vs Outros */}
      <div className="border-t pt-4 space-y-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Arrecadação por Tipo de Torneio
        </div>

        {/* Resumo lado a lado */}
        <div className="grid grid-cols-2 gap-4">
          {/* ME */}
          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="text-xs text-purple-400 font-medium mb-2">
              ME (Main Event) - {stats.torneisoME.length} torneios
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">GTD</span>
                <span className="font-mono text-purple-400">{formatNumber(stats.gtdME)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrecadado</span>
                <span className="font-mono text-green-500">{formatNumber(stats.arrecadadoME)}</span>
              </div>
              <div className="flex justify-between border-t border-purple-500/20 pt-1 mt-1">
                <span className="text-muted-foreground">Resultado</span>
                <span className={`font-mono ${stats.arrecadadoME >= stats.gtdME ? "text-green-500" : "text-red-500"}`}>
                  {formatNumber(stats.arrecadadoME - stats.gtdME)}
                </span>
              </div>
            </div>
          </div>

          {/* Outros */}
          <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
            <div className="text-xs text-orange-400 font-medium mb-2">
              Outros - {stats.torneiosOutros.length} torneios
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">GTD</span>
                <span className="font-mono text-orange-400">{formatNumber(stats.gtdOutros)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrecadado</span>
                <span className="font-mono text-green-500">{formatNumber(stats.arrecadadoOutros)}</span>
              </div>
              <div className="flex justify-between border-t border-orange-500/20 pt-1 mt-1">
                <span className="text-muted-foreground">Resultado</span>
                <span className={`font-mono ${stats.arrecadadoOutros >= stats.gtdOutros ? "text-green-500" : "text-red-500"}`}>
                  {formatNumber(stats.arrecadadoOutros - stats.gtdOutros)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista ME */}
        {stats.torneisoME.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-purple-400 uppercase tracking-wide">
              Detalhes ME ({stats.torneisoME.length})
            </div>
            <div className="text-xs">
              <div className="grid grid-cols-5 gap-2 text-muted-foreground border-b pb-1 mb-1">
                <span>Nome</span>
                <span className="text-right">GTD</span>
                <span className="text-right">Arrecadado</span>
                <span className="text-right">Entradas</span>
                <span className="text-right">Overlay</span>
              </div>
              {stats.torneisoME.map((t, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 py-0.5">
                  <span className="truncate">{t.nome}</span>
                  <span className="text-right font-mono">{formatNumber(t.gtdBRL)}</span>
                  <span className="text-right font-mono text-green-500">{formatNumber(t.buyinBRL)}</span>
                  <span className="text-right font-mono">{t.entradas}</span>
                  <span className={`text-right font-mono ${t.overlay > 0 ? "text-red-500" : "text-green-500"}`}>
                    {t.overlay > 0 ? formatNumber(t.overlay) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista Outros */}
        {stats.torneiosOutros.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-orange-400 uppercase tracking-wide">
              Detalhes Outros ({stats.torneiosOutros.length})
            </div>
            <div className="text-xs">
              <div className="grid grid-cols-5 gap-2 text-muted-foreground border-b pb-1 mb-1">
                <span>Nome</span>
                <span className="text-right">GTD</span>
                <span className="text-right">Arrecadado</span>
                <span className="text-right">Entradas</span>
                <span className="text-right">Overlay</span>
              </div>
              {stats.torneiosOutros.map((t, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 py-0.5">
                  <span className="truncate">{t.nome}</span>
                  <span className="text-right font-mono">{formatNumber(t.gtdBRL)}</span>
                  <span className="text-right font-mono text-green-500">{formatNumber(t.buyinBRL)}</span>
                  <span className="text-right font-mono">{t.entradas}</span>
                  <span className={`text-right font-mono ${t.overlay > 0 ? "text-red-500" : "text-green-500"}`}>
                    {t.overlay > 0 ? formatNumber(t.overlay) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
          <span className="text-muted-foreground">Ganhos Liga - taxa geral + eventos (I)</span>
          <span className="font-mono">{formatNumber(stats.geralPPST.ganhosLigaGeral)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxa (J)</span>
          <span className="font-mono text-green-500">{formatNumber(stats.geralPPST.ganhosLigaTaxa)}</span>
        </div>
      </div>
    </div>
  );
}
