"use client";

import { BrandBadge, softSpringEasing } from "@/lib/sidebar-svg-paths";
import type { SidebarContent } from "@/lib/sidebar-types";
import { ChevronDown } from "@carbon/icons-react";
import { cn } from "@midpoker/ui/cn";
import { MenuSection } from "./menu-items";
import { SearchContainer } from "./search-container";

interface SectionTitleProps {
  title: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Título da seção com botão de collapse
 */
function SectionTitle({
  title,
  isCollapsed,
  onToggleCollapse,
}: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      {/* Título - só mostra quando não está colapsado */}
      <div
        className={cn(
          "text-lg font-semibold text-neutral-50 transition-opacity duration-500",
          isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
        )}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        {title}
      </div>

      {/* Botão de collapse */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500",
          "hover:bg-neutral-800 text-neutral-400",
          isCollapsed ? "mx-auto" : "",
        )}
        style={{ transitionTimingFunction: softSpringEasing }}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronDown
          size={20}
          className="transition-transform duration-500"
          style={{
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transitionTimingFunction: softSpringEasing,
          }}
        />
      </button>
    </div>
  );
}

interface DetailSidebarProps {
  /** Conteúdo do sidebar para a seção atual */
  content: SidebarContent;
  /** Se o sidebar está colapsado */
  isCollapsed: boolean;
  /** Callback para toggle do collapse */
  onToggleCollapse: () => void;
  /** Set de items expandidos */
  expandedItems: Set<string>;
  /** Callback para toggle de item expandido */
  onToggleExpanded: (itemKey: string) => void;
}

/**
 * Painel direito do sidebar (320px expansível → 64px collapsed)
 * Contém brand badge, título, search, seções de menu
 */
export function DetailSidebar({
  content,
  isCollapsed,
  onToggleCollapse,
  expandedItems,
  onToggleExpanded,
}: DetailSidebarProps) {
  return (
    <div
      className={cn(
        "h-full bg-neutral-950 rounded-r-2xl flex flex-col transition-all duration-500 overflow-hidden",
        isCollapsed ? "w-16" : "w-80",
      )}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      {/* Brand Badge */}
      <div className="px-2 py-3 border-b border-neutral-800">
        <BrandBadge isCollapsed={isCollapsed} />
      </div>

      {/* Section Title com botão de collapse */}
      <div className="border-b border-neutral-800">
        <SectionTitle
          title={content.title}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Search Container */}
      <div className="px-3 py-3">
        <SearchContainer isCollapsed={isCollapsed} />
      </div>

      {/* Seções de Menu - scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-2">
        <div className="flex flex-col gap-4">
          {content.sections.map((section, index) => (
            <MenuSection
              key={section.title || `section-${index}`}
              title={section.title}
              items={section.items}
              expandedItems={expandedItems}
              onToggleItem={onToggleExpanded}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>

      {/* Footer (opcional - pode ser adicionado depois) */}
      {/* Placeholder para TeamDropdown integration se necessário */}
    </div>
  );
}
