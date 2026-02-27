"use client";

import { useBridgeStatus } from "@/hooks/use-bridge-status";
import { AlertCircle } from "lucide-react";

export function BridgeStatusBanner() {
  const { isDown, detail } = useBridgeStatus();
  if (!isDown) return null;

  return (
    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-center">
      <div className="flex items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-medium text-amber-700">
          Conexao com PPPoker instavel
        </p>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        Os dados exibidos podem estar desatualizados. Reconectando
        automaticamente...
      </p>
    </div>
  );
}
