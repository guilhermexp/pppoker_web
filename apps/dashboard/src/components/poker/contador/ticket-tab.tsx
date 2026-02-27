"use client";

import { Icons } from "@midpoker/ui/icons";

export function TicketTab() {
  return (
    <div className="flex flex-col items-center py-16">
      <Icons.Invoice className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Tickets em breve</p>
    </div>
  );
}
