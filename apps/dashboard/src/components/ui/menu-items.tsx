"use client";

import { ChevronDown } from "@carbon/icons-react";
import { cn } from "@midpoker/ui/cn";
import Link from "next/link";
import { softSpringEasing } from "@/lib/sidebar-svg-paths";
import type { MenuItem as MenuItemType } from "@/lib/sidebar-types";

interface SubMenuItemProps {
  item: MenuItemType;
  isCollapsed: boolean;
}

/**
 * Item de submenu (filho de MenuItem)
 * Renderizado com indentação (pl-9)
 */
export function SubMenuItem({ item, isCollapsed }: SubMenuItemProps) {
  const content = (
    <div
      className={cn(
        "h-8 rounded-lg flex items-center gap-2 transition-colors duration-200 cursor-pointer",
        "hover:bg-neutral-800/50",
        item.isActive ? "bg-neutral-800/50 text-neutral-50" : "text-neutral-400",
        isCollapsed ? "pl-0 justify-center" : "pl-9"
      )}
    >
      {item.icon && <div className="shrink-0">{item.icon}</div>}
      {!isCollapsed && (
        <span className="text-sm font-normal truncate">{item.label}</span>
      )}
      {item.badge && !isCollapsed && (
        <span className="ml-auto text-xs bg-neutral-800 px-2 py-0.5 rounded">
          {item.badge}
        </span>
      )}
    </div>
  );

  if (item.path) {
    return <Link href={item.path}>{content}</Link>;
  }

  return (
    <div onClick={item.onClick} onKeyDown={(e) => e.key === "Enter" && item.onClick?.()} role="button" tabIndex={0}>
      {content}
    </div>
  );
}

interface MenuItemProps {
  item: MenuItemType;
  isExpanded: boolean;
  onToggle?: () => void;
  isCollapsed: boolean;
}

/**
 * Item de menu principal com suporte a dropdown
 * Pode ter ícone, label, badge, e children (submenu)
 */
export function MenuItem({
  item,
  isExpanded,
  onToggle,
  isCollapsed,
}: MenuItemProps) {
  const handleClick = () => {
    if (item.hasDropdown && onToggle) {
      onToggle();
    } else if (item.onClick) {
      item.onClick();
    }
  };

  const content = (
    <div
      className={cn(
        "rounded-lg cursor-pointer flex items-center gap-3 transition-all duration-500",
        item.isActive
          ? "bg-neutral-800 text-neutral-50"
          : "hover:bg-neutral-800 text-neutral-400",
        isCollapsed ? "w-10 h-10 justify-center p-0" : "w-full h-10 px-3"
      )}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      role="button"
      tabIndex={0}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      {/* Ícone */}
      {item.icon && <div className="shrink-0 flex items-center">{item.icon}</div>}

      {/* Label e Badge */}
      {!isCollapsed && (
        <>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{item.label}</span>
            {item.badge && (
              <span className="text-xs bg-neutral-900 px-2 py-0.5 rounded">
                {item.badge}
              </span>
            )}
          </div>

          {/* Chevron para dropdown */}
          {item.hasDropdown && (
            <ChevronDown
              size={16}
              className="shrink-0 transition-transform duration-500"
              style={{
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transitionTimingFunction: softSpringEasing,
              }}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* Item principal */}
      {item.path && !item.hasDropdown ? (
        <Link href={item.path}>{content}</Link>
      ) : (
        content
      )}

      {/* Children (submenu) - só renderiza quando expandido */}
      {isExpanded && item.children && !isCollapsed && (
        <div className="flex flex-col gap-1 mt-1">
          {item.children.map((child, index) => (
            <SubMenuItem
              key={child.path || child.label || index}
              item={child}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MenuSectionProps {
  title: string;
  items: MenuItemType[];
  expandedItems: Set<string>;
  onToggleItem: (itemKey: string) => void;
  isCollapsed: boolean;
}

/**
 * Seção de menu com título e lista de items
 */
export function MenuSection({
  title,
  items,
  expandedItems,
  onToggleItem,
  isCollapsed,
}: MenuSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Título da seção - só mostra quando não está colapsado */}
      {!isCollapsed && (
        <div
          className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider transition-opacity duration-500"
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          {title}
        </div>
      )}

      {/* Items da seção */}
      <div className="flex flex-col gap-1 px-2">
        {items.map((item, index) => {
          const itemKey = item.path || item.label || `item-${index}`;
          const isExpanded = expandedItems.has(itemKey);

          return (
            <MenuItem
              key={itemKey}
              item={item}
              isExpanded={isExpanded}
              onToggle={() => onToggleItem(itemKey)}
              isCollapsed={isCollapsed}
            />
          );
        })}
      </div>
    </div>
  );
}
