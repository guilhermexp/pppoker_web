"use client";

import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useState } from "react";
import { EnviarItensTab } from "./contador/enviar-itens-tab";
import { TicketTab } from "./contador/ticket-tab";
import { TrocarTab } from "./contador/trocar-tab";

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export function ContadorPage() {
  const [isContadorOpen, setIsContadorOpen] = useState(false);

  return (
    <>
      {!isContadorOpen && (
        <Button
          type="button"
          onClick={() => setIsContadorOpen(true)}
          className="fixed right-0 top-1/2 z-40 h-11 -translate-y-1/2 rounded-r-none rounded-l-lg px-4 shadow-lg"
        >
          Contador
        </Button>
      )}

      <div className="min-h-[680px]">
        <section className="hidden xl:flex min-h-[680px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
          <div className="max-w-sm px-6 text-center">
            <p className="text-sm font-medium">
              Área central vazia (temporário)
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A gestão do contador foi movida para o painel lateral.
            </p>
          </div>
        </section>
      </div>

      <Sheet open={isContadorOpen} onOpenChange={setIsContadorOpen}>
        <SheetContent
          className="w-full sm:max-w-lg p-0 bg-background"
          title="Contador"
        >
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contador</h2>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fechar painel"
                onClick={() => setIsContadorOpen(false)}
              >
                <Icons.Close className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="trocar" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
              <TabsTrigger
                value="trocar"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                Trocar
              </TabsTrigger>
              <TabsTrigger
                value="enviar"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                Enviar itens
              </TabsTrigger>
              <TabsTrigger
                value="ticket"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                Ticket
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="px-4 py-3">
                <TabsContent value="trocar" className="mt-0">
                  <TrocarTab />
                </TabsContent>

                <TabsContent value="enviar" className="mt-0">
                  <EnviarItensTab />
                </TabsContent>

                <TabsContent value="ticket" className="mt-0">
                  <TicketTab />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
