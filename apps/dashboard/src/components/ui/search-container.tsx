"use client";

import { softSpringEasing } from "@/lib/sidebar-svg-paths";
import { Search } from "@carbon/icons-react";
import { useState } from "react";

interface SearchContainerProps {
  /** Se o sidebar está colapsado */
  isCollapsed: boolean;
  /** Placeholder do input */
  placeholder?: string;
  /** Callback quando o valor muda */
  onSearchChange?: (value: string) => void;
}

/**
 * Container de busca que colapsa junto com o sidebar
 * Mantém o ícone visível quando colapsado
 */
export function SearchContainer({
  isCollapsed,
  placeholder = "Search...",
  onSearchChange,
}: SearchContainerProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearchChange?.(value);
  };

  return (
    <div
      className={`relative transition-all duration-500 ${
        isCollapsed ? "w-full flex justify-center" : "w-full"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <div
        className={`bg-neutral-900 h-10 rounded-lg flex items-center gap-2 transition-all duration-500 ${
          isCollapsed ? "w-10 min-w-10 justify-center" : "w-full px-3"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <Search size={16} className="text-neutral-400 shrink-0" />
        <div
          className={`flex-1 transition-opacity duration-500 ${
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <input
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={handleChange}
            tabIndex={isCollapsed ? -1 : 0}
            className="w-full bg-transparent border-none outline-none text-neutral-50 text-sm placeholder:text-neutral-500"
          />
        </div>
      </div>
    </div>
  );
}
