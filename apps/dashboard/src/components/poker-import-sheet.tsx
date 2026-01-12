"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@midpoker/ui/sheet";
import { LeagueImportUploader as SUUploader } from "./league/league-import-uploader";
import { ImportUploader } from "./poker/import-uploader";
import { LeagueImportUploader as PokerLeagueUploader } from "./poker/league-import-uploader";

type PokerImportType = "club" | "league" | "su";

type PokerImportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PokerImportType | null;
};

const TITLES: Record<PokerImportType, string> = {
  club: "Importar Dados de Clube",
  league: "Importar Dados de Liga",
  su: "Importar Dados de Super Union",
};

export function PokerImportSheet({
  open,
  onOpenChange,
  type,
}: PokerImportSheetProps) {
  if (!type) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[900px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{TITLES[type]}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {type === "club" && <ImportUploader />}
          {type === "league" && <PokerLeagueUploader />}
          {type === "su" && <SUUploader />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
