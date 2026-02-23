"use client";

import { usePokerMembrosParams } from "@/hooks/use-poker-membros-params";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";

export function EmptyState() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center mt-40">
        <div className="p-4 bg-muted rounded-full mb-6">
          <Icons.Customers className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">Nenhum membro ainda</h2>
          <p className="text-[#606060] text-sm">
            Conecte seu clube PPPoker para sincronizar membros automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}

export function NoResults() {
  const { setParams } = usePokerMembrosParams();

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center mt-40">
        <div className="p-4 bg-muted rounded-full mb-6">
          <Icons.Search className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">Nenhum resultado encontrado</h2>
          <p className="text-[#606060] text-sm">
            Tente ajustar seus filtros de busca.
          </p>
        </div>

        <Button variant="outline" onClick={() => setParams(null)}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
