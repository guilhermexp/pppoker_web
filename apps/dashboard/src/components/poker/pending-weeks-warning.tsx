"use client";

import { Alert, AlertDescription, AlertTitle } from "@midpoker/ui/alert";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingWeek {
  id: string;
  weekStart: string;
  weekEnd: string;
}

interface PendingWeeksWarningProps {
  pendingWeeks: PendingWeek[];
  currentWeekId?: string;
  onCloseClick: (weekId: string) => void;
}

export function PendingWeeksWarning({
  pendingWeeks,
  currentWeekId,
  onCloseClick,
}: PendingWeeksWarningProps) {
  // Filter out current week from pending weeks
  const oldPendingWeeks = pendingWeeks.filter((w) => w.id !== currentWeekId);

  if (oldPendingWeeks.length === 0) {
    return null;
  }

  const formatWeekRange = (start: string, end: string) => {
    // Use parseISO to correctly handle date-only strings without timezone shift
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    return `${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM", { locale: ptBR })}`;
  };

  return (
    <Alert
      variant="default"
      className="border-amber-500/30 bg-amber-500/5 mb-4"
    >
      <Icons.AlertCircle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400">
        Semanas Pendentes
      </AlertTitle>
      <AlertDescription className="text-muted-foreground">
        <span>
          Você tem {oldPendingWeeks.length} semana
          {oldPendingWeeks.length > 1 ? "s" : ""} não fechada
          {oldPendingWeeks.length > 1 ? "s" : ""}. Considere fechá-la
          {oldPendingWeeks.length > 1 ? "s" : ""} para finalizar os acertos.
        </span>
        <div className="flex flex-wrap gap-2 mt-2">
          {oldPendingWeeks.map((week) => (
            <Button
              key={week.id}
              variant="outline"
              size="sm"
              className="text-xs h-7 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => onCloseClick(week.id)}
            >
              <Icons.CalendarMonth className="mr-1.5 h-3 w-3" />
              {formatWeekRange(week.weekStart, week.weekEnd)}
            </Button>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
