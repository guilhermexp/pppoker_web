"use client";

import { cn } from "@midpoker/ui/cn";
import { softSpringEasing } from "@/lib/sidebar-svg-paths";
import { SearchContainer } from "./search-container";
import { MenuSection } from "./menu-items";
import type { SidebarContent } from "@/lib/sidebar-types";

interface DetailSidebarProps {
  /** Conteúdo do sidebar para a seção atual */
  content: SidebarContent;
  /** Se o sidebar está colapsado */
  isCollapsed: boolean;
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
  expandedItems,
  onToggleExpanded,
}: DetailSidebarProps) {
  return (
    <div
      className={cn(
        "h-full bg-neutral-950 rounded-r-2xl flex flex-col transition-all duration-500 overflow-hidden",
        isCollapsed ? "w-16" : "w-80"
      )}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      {/* Search Container */}
      <div className="px-3 py-3 border-b border-neutral-800">
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
