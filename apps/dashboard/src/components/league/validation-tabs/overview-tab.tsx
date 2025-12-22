"use client";

import type {
  LeagueValidationResult,
  ParsedLeagueImportData,
} from "@/lib/league/types";
import { Card, CardContent, CardHeader, CardTitle } from "@midday/ui/card";
import { Icons } from "@midday/ui/icons";

interface LeagueOverviewTabProps {
  parsedData: ParsedLeagueImportData;
  validationResult: LeagueValidationResult;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function LeagueOverviewTab({
  parsedData,
  validationResult,
}: LeagueOverviewTabProps) {
  const { stats, gameTypeDistribution, topLigas } = validationResult;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ligas (PPST)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLigasPPST}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jogos (PPST)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJogosPPST}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jogadores (PPST)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJogadoresPPST}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Buy-in Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalBuyinPPST)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalTaxaPPST)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gap Garantido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats.totalGapGarantidoPPST < 0 ? "text-red-600" : "text-green-600"}`}
            >
              {formatCurrency(stats.totalGapGarantidoPPST)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution and Top Ligas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Game Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Distribuição por Tipo de Jogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gameTypeDistribution.map((item) => (
                <div key={item.type} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.type === "NLH"
                            ? "bg-blue-500"
                            : item.type === "SPINUP"
                              ? "bg-pink-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Ligas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Ligas (por Taxa)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLigas.slice(0, 5).map((liga, index) => (
                <div
                  key={liga.ligaId}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{liga.ligaNome}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {liga.ligaId}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm text-green-600">
                      {formatCurrency(liga.totalTaxa)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ganhos: {formatCurrency(liga.totalGanhos)}
                    </div>
                  </div>
                </div>
              ))}
              {topLigas.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma liga encontrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Data Início</div>
              <div className="font-medium">
                {validationResult.period.start || "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Data Fim</div>
              <div className="font-medium">
                {validationResult.period.end || "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Duração</div>
              <div className="font-medium">
                {validationResult.period.days} dias
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Icons.Description className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{parsedData.fileName}</div>
              <div className="text-muted-foreground">
                {((parsedData.fileSize ?? 0) / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
