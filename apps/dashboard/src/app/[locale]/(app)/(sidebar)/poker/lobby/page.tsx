import { ErrorBoundary } from "@/components/error-boundary";
import { LobbyPage } from "@/components/poker/lobby-page";
import { getI18n } from "@/locales/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lobby | Poker Club | Midday",
};

export default async function PokerLobbyPage() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-6">
      <div className="pt-6">
        <h1 className="text-2xl font-medium">
          {t("poker.lobby.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("poker.lobby.description")}
        </p>
      </div>

      <ErrorBoundary>
        <LobbyPage />
      </ErrorBoundary>
    </div>
  );
}
