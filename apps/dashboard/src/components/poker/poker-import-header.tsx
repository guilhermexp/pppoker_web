import { getI18n } from "@/locales/server";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";

export async function PokerImportHeader() {
  const t = await getI18n();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("poker.import.supportedFormats")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://docs.pppoker.net/export"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icons.ExternalLink className="h-4 w-4 mr-2" />
            {t("poker.import.helpLink")}
          </a>
        </Button>
      </div>
    </div>
  );
}
