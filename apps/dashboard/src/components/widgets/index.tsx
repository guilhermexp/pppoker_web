"use client";

import { useChatInterface } from "@/hooks/use-chat-interface";
import type { AppRouter } from "@midpoker/api/trpc/routers/_app";
import type { inferRouterOutputs } from "@trpc/server";
import { WidgetsHeader } from "./header";
import { WidgetProvider } from "./widget-provider";
import { WidgetsGrid } from "./widgets-grid";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type WidgetPreferences = RouterOutputs["widgets"]["getWidgetPreferences"];

function WidgetsContent() {
  const { isChatPage } = useChatInterface();

  if (isChatPage) {
    return null;
  }

  return (
    <div className="flex flex-col mt-6">
      <WidgetsHeader />
      <WidgetsGrid />
    </div>
  );
}

interface WidgetsProps {
  initialPreferences: WidgetPreferences;
}

export function Widgets({ initialPreferences }: WidgetsProps) {
  return (
    <WidgetProvider initialPreferences={initialPreferences}>
      <WidgetsContent />
    </WidgetProvider>
  );
}
