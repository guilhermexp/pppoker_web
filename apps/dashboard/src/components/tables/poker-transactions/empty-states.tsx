"use client";

import { useI18n } from "@/locales/client";
import { Icons } from "@midday/ui/icons";

export function EmptyState() {
  const t = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed rounded-lg">
      <Icons.ReceiptLong className="size-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">Nenhuma transacao</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
        As transacoes aparecerao aqui apos importar dados do PPPoker.
      </p>
    </div>
  );
}

export function NoResults() {
  const t = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed rounded-lg">
      <Icons.Search className="size-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">Nenhum resultado</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
        Tente ajustar os filtros para encontrar transacoes.
      </p>
    </div>
  );
}
