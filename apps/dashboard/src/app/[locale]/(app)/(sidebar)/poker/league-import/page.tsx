"use client";

import { LeagueImportUploader } from "@/components/league/league-import-uploader";

export default function PokerLeagueImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="pt-6">
        <h1 className="text-2xl font-medium">Importar Planilha de SuperUnion</h1>
        <p className="text-muted-foreground mt-1">
          Faça upload da planilha de SuperUnion PPPoker para validação e importação
        </p>
      </div>

      <LeagueImportUploader />
    </div>
  );
}
