"use client";

import { useDocumentParams } from "@/hooks/use-document-params";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";

export function VaultViewSwitch() {
  const { params, setParams } = useDocumentParams();

  return (
    <div className="flex gap-2 text-[#878787]">
      <Button
        variant="outline"
        size="icon"
        className={cn(params.view === "grid" && "border-primary text-primary")}
        onClick={() => setParams({ view: "grid" })}
      >
        <Icons.GridView size={18} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={cn(params.view === "list" && "border-primary text-primary")}
        onClick={() => setParams({ view: "list" })}
      >
        <Icons.ListView size={18} />
      </Button>
    </div>
  );
}
