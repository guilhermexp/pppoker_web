"use client";

import { Icons } from "@midpoker/ui/icons";
import { cn } from "@midpoker/ui/cn";
import { MidPokerLogoSquare, AvatarCircle } from "@/lib/sidebar-svg-paths";
import type { NavigationSection } from "@/lib/sidebar-types";
import Link from "next/link";

interface IconNavButtonProps {
  section: NavigationSection;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Botão individual de navegação no rail
 */
function IconNavButton({ section, isActive, onClick }: IconNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200",
        "hover:bg-neutral-800",
        isActive ? "bg-neutral-800 text-neutral-50" : "text-neutral-400",
      )}
      title={section.label}
    >
      {section.icon}
    </button>
  );
}

interface IconNavigationProps {
  /** Seção atualmente ativa */
  activeSection: string;
  /** Callback quando uma seção é selecionada */
  onSectionChange: (sectionId: string) => void;
}

/**
 * Rail de navegação esquerdo (64px) com ícones principais
 * Baseado no componente 21st.dev
 */
export function IconNavigation({
  activeSection,
  onSectionChange,
}: IconNavigationProps) {
  // Definir todas as seções de navegação
  const sections: NavigationSection[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <Icons.Overview size={20} />,
      path: "/",
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: <Icons.Transactions size={20} />,
      path: "/transactions",
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: <Icons.Inbox2 size={20} />,
      path: "/inbox",
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: <Icons.Invoice size={20} />,
      path: "/invoices",
    },
    {
      id: "tracker",
      label: "Tracker",
      icon: <Icons.Tracker size={20} />,
      path: "/tracker",
    },
    {
      id: "customers",
      label: "Customers",
      icon: <Icons.Customers size={20} />,
      path: "/customers",
    },
    {
      id: "vault",
      label: "Vault",
      icon: <Icons.Vault size={20} />,
      path: "/vault",
    },
    {
      id: "poker",
      label: "Poker",
      icon: <Icons.PieChart size={20} />,
      path: "/poker",
    },
    {
      id: "leagues",
      label: "Ligas",
      icon: <Icons.Link size={20} />,
      path: "/poker/leagues",
    },
    {
      id: "fastchips",
      label: "FastChips",
      icon: <Icons.Accounts size={20} />,
      path: "/fastchips",
    },
    {
      id: "su",
      label: "SU",
      icon: <Icons.GridView size={20} />,
      path: "/su",
    },
  ];

  return (
    <div className="w-16 h-full bg-neutral-950 rounded-l-2xl flex flex-col items-center py-4 shrink-0">
      {/* Logo no topo */}
      <Link href="/" className="w-10 h-10 mb-6">
        <MidPokerLogoSquare />
      </Link>

      {/* Seções principais */}
      <nav className="flex flex-col gap-2 flex-1">
        {sections.map((section) => (
          <IconNavButton
            key={section.id}
            section={section}
            isActive={activeSection === section.id}
            onClick={() => onSectionChange(section.id)}
          />
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section: Settings + Avatar */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onSectionChange("settings")}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200",
            "hover:bg-neutral-800",
            activeSection === "settings"
              ? "bg-neutral-800 text-neutral-50"
              : "text-neutral-400",
          )}
          title="Settings"
        >
          <Icons.Settings size={20} />
        </button>

        <button
          type="button"
          onClick={() => onSectionChange("apps")}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200",
            "hover:bg-neutral-800",
            activeSection === "apps"
              ? "bg-neutral-800 text-neutral-50"
              : "text-neutral-400",
          )}
          title="Apps"
        >
          <Icons.Apps size={20} />
        </button>

        <div className="mt-2">
          <AvatarCircle size={40} />
        </div>
      </div>
    </div>
  );
}
