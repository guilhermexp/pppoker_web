"use client";

import {
  type TournamentEvent,
  type TournamentScheduleData,
  calculateTotals,
  dayLabels,
  dayOrder,
  groupEventsByDay,
  parseTournamentSchedule,
} from "@/lib/league/tournament-schedule";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useToast } from "@midpoker/ui/use-toast";
import { getWeek, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Chave do localStorage para dados da grade
const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";

// Tipo para torneio salvo
export interface StoredTournament {
  name: string;
  day: string;
  time: string;
  gtd: number;
  buyIn: string;
  game: string;
}

// Tipo para dados salvos no localStorage
export interface StoredScheduleData {
  weekNumber: number;
  totalGTD: number;
  totalTournaments: number;
  weekInfo: {
    startDate: string;
    endDate: string;
  };
  savedAt: string;
  // Nomes dos torneios com GTD para comparação (legacy)
  tournamentNames?: string[];
  // Torneios completos com detalhes
  tournaments?: StoredTournament[];
}

// Helper para obter número da semana de uma data string (DD/MM)
// Usa mesmas opções do modal de validação para consistência
function getWeekFromDateString(dateStr: string, year?: number): number | null {
  try {
    const currentYear = year || new Date().getFullYear();
    // Formato DD/MM
    const date = parse(`${dateStr}/${currentYear}`, "dd/MM/yyyy", new Date(), {
      locale: ptBR,
    });
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return getWeek(date, { weekStartsOn: 0, firstWeekContainsDate: 1 });
  } catch {
    return null;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

// Badge de tipo de jogo com cores
function GameTypeBadge({ game }: { game: string }) {
  const normalized = game.toUpperCase();
  let colorClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";

  if (normalized.includes("PLO")) {
    colorClass = "bg-orange-500/10 text-orange-500 border-orange-500/20";
  } else if (normalized.includes("SPIN")) {
    colorClass = "bg-pink-500/10 text-pink-500 border-pink-500/20";
  }

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium ${colorClass}`}
    >
      {game}
    </Badge>
  );
}

// Componente de dia com torneios
function DaySection({
  day,
  events,
}: {
  day: string;
  events: TournamentEvent[];
}) {
  const dayTotal = events.reduce((sum, e) => {
    const gtd = Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0;
    return sum + gtd;
  }, 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{dayLabels[day] || day}</span>
          <Badge variant="secondary" className="text-xs">
            {events.length} torneios
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          GTD:{" "}
          <span className="font-medium text-foreground">
            {formatNumber(dayTotal)}
          </span>
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[70px]">Horário</TableHead>
            <TableHead>Torneio</TableHead>
            <TableHead className="w-[60px]">Tipo</TableHead>
            <TableHead className="w-[80px] text-right">GTD</TableHead>
            <TableHead className="w-[80px] text-right">Buy-in</TableHead>
            <TableHead className="w-[60px] text-right">Rebuy</TableHead>
            <TableHead className="w-[60px] text-right">Add-on</TableHead>
            <TableHead className="w-[70px] text-right">Stack</TableHead>
            <TableHead className="w-[50px] text-right">Late</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id} className="text-sm">
              <TableCell className="font-mono text-xs">
                {event.times["-3"] || "-"}
              </TableCell>
              <TableCell
                className="font-medium max-w-[200px] truncate"
                title={event.name}
              >
                {event.name}
              </TableCell>
              <TableCell>
                <GameTypeBadge game={event.game} />
              </TableCell>
              <TableCell className="text-right font-medium text-green-600">
                {event.gtd || "-"}
              </TableCell>
              <TableCell className="text-right">{event.buyIn || "-"}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {event.rebuy || "-"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {event.addOn || "-"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {event.stack || "-"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {event.lateReg || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function TournamentSchedulePage() {
  const [data, setData] = useState<TournamentScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);

      // Show processing toast (Vault style)
      const { dismiss } = toast({
        variant: "spinner",
        title: "Processando grade...",
        description: file.name,
        duration: Number.POSITIVE_INFINITY,
      });

      try {
        const result = await parseTournamentSchedule(file);
        setData(result);
        dismiss();
      } catch (err) {
        dismiss();
        setError("Erro ao processar arquivo. Verifique se é um XLSX válido.");
        console.error(err);
      } finally {
        setIsLoading(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [toast],
  );

  const handleClear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const groupedEvents = data ? groupEventsByDay(data.events) : {};
  const totals = data
    ? calculateTotals(data.events)
    : { totalGTD: 0, totalTournaments: 0 };

  // Calcular informações da semana
  // Usa mesmas opções do modal de validação para consistência
  const weekInfo = useMemo(() => {
    const currentWeek = getWeek(new Date(), {
      weekStartsOn: 0,
      firstWeekContainsDate: 1,
    });

    if (!data) {
      return { currentWeek, scheduleWeek: null, isSameWeek: false };
    }

    const scheduleWeek = getWeekFromDateString(data.weekInfo.startDate);

    return {
      currentWeek,
      scheduleWeek,
      isSameWeek: scheduleWeek === currentWeek,
    };
  }, [data]);

  // Salvar dados da grade no localStorage para conferência cruzada
  useEffect(() => {
    if (data && weekInfo.scheduleWeek) {
      // Extrair torneios com GTD > 0 com todos os detalhes
      const tournaments: StoredTournament[] = data.events
        .filter((e) => {
          const gtd = Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0;
          return gtd > 0;
        })
        .map((e) => ({
          name: e.name.trim().toUpperCase(),
          day: e.day,
          time: e.times["-3"] || "",
          gtd: Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0,
          buyIn: e.buyIn,
          game: e.game,
        }));

      // Nomes para compatibilidade
      const tournamentNames = tournaments.map((t) => t.name);

      const storageData: StoredScheduleData = {
        weekNumber: weekInfo.scheduleWeek,
        totalGTD: totals.totalGTD,
        totalTournaments: totals.totalTournaments,
        weekInfo: {
          startDate: data.weekInfo.startDate,
          endDate: data.weekInfo.endDate,
        },
        savedAt: new Date().toISOString(),
        tournamentNames,
        tournaments,
      };
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(storageData));
    }
  }, [data, weekInfo.scheduleWeek, totals]);

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header - only show when data is loaded */}
      {data && (
        <div className="pt-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium">Grade de Torneios PPST</h1>
            <p className="text-muted-foreground mt-1">
              Programação semanal de torneios da SuperUnion
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Icons.Close className="w-4 h-4 mr-1" />
              Limpar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Icons.Import className="w-4 h-4 mr-2" />
              {isLoading ? "Carregando..." : "Importar Outra"}
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
          <Icons.AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Content */}
      {data ? (
        <div className="space-y-6">
          {/* Week Info & Summary */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border">
              <Icons.CalendarMonth className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {data.weekInfo.startDate} - {data.weekInfo.endDate}
              </span>
            </div>

            {weekInfo.scheduleWeek && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  weekInfo.isSameWeek
                    ? "bg-[#00C969]/10 text-[#00C969] border-[#00C969]/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                }`}
              >
                <Icons.DateFormat className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Semana {weekInfo.scheduleWeek}
                </span>
                {!weekInfo.isSameWeek && (
                  <span className="text-xs opacity-70">
                    (atual: {weekInfo.currentWeek})
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border">
              <Icons.PlayOutline className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-bold">
                  {formatNumber(totals.totalTournaments)}
                </span>{" "}
                torneios
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Icons.TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">
                GTD Total:{" "}
                <span className="font-bold">
                  {formatNumber(totals.totalGTD)}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border">
              <span className="text-sm text-muted-foreground">
                R${" "}
                <span className="font-bold text-foreground">
                  {formatNumber(totals.totalGTD * 5)}
                </span>
                <span className="text-xs ml-1 opacity-60">(×5)</span>
              </span>
            </div>
          </div>

          {/* Days */}
          <div className="space-y-4">
            {dayOrder.map((day) => {
              const events = groupedEvents[day];
              if (!events || events.length === 0) return null;
              return <DaySection key={day} day={day} events={events} />;
            })}
          </div>
        </div>
      ) : (
        /* Empty State - Vault Style */
        <div className="h-[calc(100vh-250px)] flex items-center justify-center">
          <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col">
            <div className="flex w-full flex-col relative text-center">
              <div className="pb-4">
                <h2 className="font-medium text-lg">
                  Importar grade de torneios
                </h2>
              </div>

              <p className="pb-6 text-sm text-[#878787]">
                Faça upload da planilha XLSX com a programação semanal de
                torneios PPST.
              </p>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
