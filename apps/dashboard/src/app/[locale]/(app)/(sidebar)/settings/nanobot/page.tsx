import { NanobotSettingsPanel } from "@/components/nanobot-settings-panel";
import { prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nanobot Settings | Midday",
};

export default async function Page() {
  prefetch(trpc.nanobot.getSettings.queryOptions());
  prefetch(trpc.nanobot.status.queryOptions());
  prefetch(trpc.nanobot.toolsManifest.queryOptions());

  return <NanobotSettingsPanel />;
}
