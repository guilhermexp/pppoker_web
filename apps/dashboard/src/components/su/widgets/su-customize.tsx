"use client";

import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { useSUIsCustomizing, useSUWidgetActions } from "./su-widget-provider";

export function SUCustomize() {
  const isCustomizing = useSUIsCustomizing();
  const { setIsCustomizing } = useSUWidgetActions();

  return (
    <Button
      variant={isCustomizing ? "default" : "outline"}
      size="sm"
      onClick={() => setIsCustomizing(!isCustomizing)}
      data-no-close
    >
      {isCustomizing ? (
        <>
          <Icons.Check className="mr-2 h-4 w-4" />
          Concluído
        </>
      ) : (
        <>
          <Icons.Tune className="mr-2 h-4 w-4" />
          Personalizar
        </>
      )}
    </Button>
  );
}
