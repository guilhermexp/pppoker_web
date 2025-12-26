"use client";

import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import Link from "next/link";

export function SUDashboardHeader() {
  return (
    <div className="flex justify-between items-center mb-8">
      {/* Left side - Title */}
      <div>
        <h1 className="text-2xl font-medium">Painel Super Union</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral das ligas e torneios da Super Union
        </p>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/poker/league-import">
            <Icons.Import className="mr-2 h-4 w-4" />
            Importar Planilha
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/poker/league-import/grade">
            <Icons.CalendarMonth className="mr-2 h-4 w-4" />
            Grade de Torneios
          </Link>
        </Button>
      </div>
    </div>
  );
}
