"use client";

import { ConnectionStatus } from "@/components/connection-status";
import { NotificationCenter } from "@/components/notification-center";
import { OpenSearchButton } from "@/components/search/open-search-button";
import { Trial } from "@/components/trial";
import { UserMenu } from "@/components/user-menu";
import { MobileMenu } from "./mobile-menu";
import { useSidebarPinned } from "./sidebar-context";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function Header() {
  const { isPinned, setIsPinned } = useSidebarPinned();

  return (
    <header className="md:m-0 z-50 px-6 md:border-b h-[70px] flex justify-between items-center desktop:sticky desktop:top-0 desktop:bg-background sticky md:static top-0 backdrop-blur-xl md:[backdrop-filter:none] bg-background desktop:rounded-t-[10px]">
      <MobileMenu />

      <button
        type="button"
        onClick={() => setIsPinned((p) => !p)}
        className="hidden md:flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-2"
        title={isPinned ? "Fechar sidebar" : "Abrir sidebar"}
      >
        {isPinned ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>

      <OpenSearchButton />

      <div className="flex space-x-2 ml-auto">
        <Trial />
        <ConnectionStatus />
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
}
