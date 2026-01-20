/**
 * Tipos TypeScript para o sidebar do 21st.dev
 */

import type React from "react";

/**
 * Item de menu individual
 */
export interface MenuItem {
  /** Ícone do item (componente React) */
  icon?: React.ReactNode;
  /** Label/texto do item */
  label: string;
  /** Path para navegação (se aplicável) */
  path?: string;
  /** Se o item tem dropdown/submenu */
  hasDropdown?: boolean;
  /** Se o item está ativo (rota atual) */
  isActive?: boolean;
  /** Items filhos (submenu) */
  children?: MenuItem[];
  /** Badge de contagem ou notificação */
  badge?: string | number;
  /** Callback ao clicar no item */
  onClick?: () => void;
}

/**
 * Seção de menu com título e lista de items
 */
export interface MenuSection {
  /** Título da seção */
  title: string;
  /** Lista de items da seção */
  items: MenuItem[];
}

/**
 * Conteúdo completo do sidebar para uma seção
 */
export interface SidebarContent {
  /** Título principal da seção */
  title: string;
  /** Seções de menu */
  sections: MenuSection[];
}

/**
 * Seção principal de navegação (ícone na rail esquerda)
 */
export interface NavigationSection {
  /** ID único da seção */
  id: string;
  /** Label/tooltip da seção */
  label: string;
  /** Ícone da seção (componente React) */
  icon: React.ReactNode;
  /** Path base da seção */
  path?: string;
}
