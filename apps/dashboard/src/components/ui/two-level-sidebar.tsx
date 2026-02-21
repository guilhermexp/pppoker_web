"use client";

import {
  detectActiveSection,
  getSidebarContent,
} from "@/lib/sidebar-navigation";
import { useI18n } from "@/locales/client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DetailSidebar } from "./detail-sidebar";
import { IconNavigation } from "./icon-navigation";

/**
 * Componente principal do sidebar two-level do 21st.dev
 * Combina IconNavigation (64px) + DetailSidebar (320px expansível)
 */
export function TwoLevelSidebar() {
  const pathname = usePathname();
  const t = useI18n();

  // State management
  const [activeSection, setActiveSection] = useState("overview");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Auto-detectar seção ativa baseada no pathname
  useEffect(() => {
    const section = detectActiveSection(pathname);
    setActiveSection(section);
  }, [pathname]);

  // Handlers
  const toggleCollapse = () => setIsCollapsed((s) => !s);

  const toggleExpanded = (itemKey: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    // Expandir sidebar se estiver colapsado
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  // Obter conteúdo para a seção ativa
  const content = getSidebarContent(activeSection, t, pathname);

  return (
    <aside className="fixed top-0 left-0 h-screen hidden md:flex z-50">
      <div className="flex flex-row h-full">
        {/* Icon Navigation Rail (64px) */}
        <IconNavigation
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {/* Detail Sidebar (320px expansível) */}
        <DetailSidebar
          content={content}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          expandedItems={expandedItems}
          onToggleExpanded={toggleExpanded}
        />
      </div>
    </aside>
  );
}
