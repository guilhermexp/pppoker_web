"use client";

import { apps as appStoreApps } from "@midpoker/app-store";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@midpoker/ui/card";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { useMemo, useState } from "react";

export function Apps() {
  const [open, setOpen] = useState(false);

  const pppokerApp = useMemo(
    () => appStoreApps.find((app) => app.id === "pppoker"),
    [],
  );

  if (!pppokerApp) {
    return (
      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-sm text-muted-foreground">
          App PPPoker não encontrado no catálogo local.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-6">
      <Card className="w-full">
        <div className="flex h-16 items-center justify-between px-6 pt-6">
          {pppokerApp.logo && typeof pppokerApp.logo !== "string" ? (
            <pppokerApp.logo />
          ) : pppokerApp.logo ? (
            <img
              src={pppokerApp.logo as string}
              alt={pppokerApp.name}
              className="h-8 w-8"
            />
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>

        <CardHeader className="pb-0">
          <CardTitle className="text-md font-medium leading-none">
            {pppokerApp.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-6 pt-3">
          <p className="text-xs text-[#878787] dark:text-muted-foreground">
            {pppokerApp.short_description}
          </p>

          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
              Details
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title={pppokerApp.name}>
          <SheetHeader>
            <h2 className="text-lg font-semibold">{pppokerApp.name}</h2>
            <p className="text-sm text-muted-foreground">
              Card mantido sem integrações, imports ou backend nesta tela.
            </p>
          </SheetHeader>

          <ScrollArea className="mt-4 h-[calc(100vh-180px)]">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">Conteúdo removido</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A lógica de planilhas/importações e demais integrações da página
                de aplicativos foi removida daqui.
              </p>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
