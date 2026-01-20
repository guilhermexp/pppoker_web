/**
 * Mapeamento da navegação atual para o formato do 21st.dev sidebar
 */

import { Icons } from "@midpoker/ui/icons";
import type { SidebarContent } from "./sidebar-types";

/**
 * Retorna o conteúdo do sidebar baseado na seção ativa
 * Mapeia as 14 seções principais para o formato MenuSection[]
 */
export function getSidebarContent(
  sectionId: string,
  t: (key: string) => string,
  pathname: string
): SidebarContent {
  // Helper para verificar se um path está ativo
  const isActive = (path: string) => {
    const cleanPath = pathname.split("?")[0];
    return cleanPath === path || cleanPath.startsWith(`${path}/`);
  };

  switch (sectionId) {
    case "overview":
      return {
        title: t("sidebar.overview"),
        sections: [
          {
            title: t("sidebar.quick_actions"),
            items: [
              {
                icon: <Icons.Overview size={16} />,
                label: t("sidebar.overview"),
                path: "/",
                isActive: isActive("/"),
              },
            ],
          },
        ],
      };

    case "transactions":
      return {
        title: t("sidebar.transactions"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Transactions size={16} />,
                label: t("sidebar.transactions"),
                path: "/transactions",
                isActive: isActive("/transactions") && !pathname.includes("categories"),
                hasDropdown: true,
                children: [
                  {
                    label: t("sidebar.connect_bank"),
                    path: "/transactions?step=connect",
                    isActive: pathname.includes("step=connect"),
                  },
                  {
                    label: t("sidebar.import"),
                    path: "/transactions?step=import&hide=true",
                    isActive: pathname.includes("step=import"),
                  },
                  {
                    label: t("sidebar.create_new"),
                    path: "/transactions?createTransaction=true",
                    isActive: pathname.includes("createTransaction=true"),
                  },
                ],
              },
              {
                icon: <Icons.Transactions size={16} />,
                label: t("sidebar.categories"),
                path: "/transactions/categories",
                isActive: isActive("/transactions/categories"),
              },
            ],
          },
        ],
      };

    case "inbox":
      return {
        title: t("sidebar.inbox"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Inbox2 size={16} />,
                label: t("sidebar.inbox"),
                path: "/inbox",
                isActive: isActive("/inbox") && !pathname.includes("settings"),
              },
              {
                icon: <Icons.Settings size={16} />,
                label: t("sidebar.settings"),
                path: "/inbox/settings",
                isActive: isActive("/inbox/settings"),
              },
            ],
          },
        ],
      };

    case "invoices":
      return {
        title: t("sidebar.invoices"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Invoice size={16} />,
                label: t("sidebar.invoices"),
                path: "/invoices",
                isActive: isActive("/invoices") && !pathname.includes("products") && !pathname.includes("type=create"),
                hasDropdown: true,
                children: [
                  {
                    label: t("sidebar.create_new"),
                    path: "/invoices?type=create",
                    isActive: pathname.includes("type=create"),
                  },
                ],
              },
              {
                icon: <Icons.Invoice size={16} />,
                label: t("sidebar.products"),
                path: "/invoices/products",
                isActive: isActive("/invoices/products"),
              },
            ],
          },
        ],
      };

    case "tracker":
      return {
        title: t("sidebar.tracker"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Tracker size={16} />,
                label: t("sidebar.tracker"),
                path: "/tracker",
                isActive: isActive("/tracker"),
                hasDropdown: true,
                children: [
                  {
                    label: t("sidebar.create_new"),
                    path: "/tracker?create=true",
                    isActive: pathname.includes("create=true"),
                  },
                ],
              },
            ],
          },
        ],
      };

    case "customers":
      return {
        title: t("sidebar.customers"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Customers size={16} />,
                label: t("sidebar.customers"),
                path: "/customers",
                isActive: isActive("/customers"),
                hasDropdown: true,
                children: [
                  {
                    label: t("sidebar.create_new"),
                    path: "/customers?createCustomer=true",
                    isActive: pathname.includes("createCustomer=true"),
                  },
                ],
              },
            ],
          },
        ],
      };

    case "vault":
      return {
        title: t("sidebar.vault"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Vault size={16} />,
                label: t("sidebar.vault"),
                path: "/vault",
                isActive: isActive("/vault"),
              },
            ],
          },
        ],
      };

    case "poker":
      return {
        title: t("sidebar.poker"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.PieChart size={16} />,
                label: t("sidebar.poker"),
                path: "/poker",
                isActive: isActive("/poker") && pathname === "/poker",
              },
              {
                icon: <Icons.PieChart size={16} />,
                label: t("sidebar.poker_players"),
                path: "/poker/players",
                isActive: isActive("/poker/players"),
              },
              {
                icon: <Icons.PieChart size={16} />,
                label: t("sidebar.poker_agents"),
                path: "/poker/agents",
                isActive: isActive("/poker/agents"),
              },
              {
                icon: <Icons.PieChart size={16} />,
                label: t("sidebar.poker_sessions"),
                path: "/poker/sessions",
                isActive: isActive("/poker/sessions"),
              },
              {
                icon: <Icons.PieChart size={16} />,
                label: t("sidebar.poker_transactions"),
                path: "/poker/transactions",
                isActive: isActive("/poker/transactions"),
              },
              {
                icon: <Icons.PieChart size={16} />,
                label: t("sidebar.poker_settlements"),
                path: "/poker/settlements",
                isActive: isActive("/poker/settlements"),
              },
              {
                icon: <Icons.PieChart size={16} />,
                label: t("sidebar.poker_import"),
                path: "/poker/import",
                isActive: isActive("/poker/import"),
              },
            ],
          },
        ],
      };

    case "leagues":
      return {
        title: t("sidebar.ligas"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Link size={16} />,
                label: t("sidebar.ligas"),
                path: "/poker/leagues",
                isActive: isActive("/poker/leagues") && pathname === "/poker/leagues",
              },
              {
                icon: <Icons.Link size={16} />,
                label: t("sidebar.ligas_import"),
                path: "/poker/leagues/import",
                isActive: isActive("/poker/leagues/import"),
              },
            ],
          },
        ],
      };

    case "fastchips":
      return {
        title: t("sidebar.fastchips"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Accounts size={16} />,
                label: t("sidebar.fastchips"),
                path: "/fastchips",
                isActive: isActive("/fastchips") && pathname === "/fastchips",
              },
              {
                icon: <Icons.Accounts size={16} />,
                label: t("sidebar.fastchips_transacoes"),
                path: "/fastchips/transacoes",
                isActive: isActive("/fastchips/transacoes"),
              },
              {
                icon: <Icons.Accounts size={16} />,
                label: t("sidebar.fastchips_contas_vinculadas"),
                path: "/fastchips/contas-vinculadas",
                isActive: isActive("/fastchips/contas-vinculadas"),
              },
              {
                icon: <Icons.Accounts size={16} />,
                label: t("sidebar.fastchips_jogadores"),
                path: "/fastchips/jogadores",
                isActive: isActive("/fastchips/jogadores"),
              },
              {
                icon: <Icons.Accounts size={16} />,
                label: t("sidebar.fastchips_movimentacao"),
                path: "/fastchips/movimentacao",
                isActive: isActive("/fastchips/movimentacao"),
              },
              {
                icon: <Icons.Accounts size={16} />,
                label: t("sidebar.fastchips_controle"),
                path: "/fastchips/controle",
                isActive: isActive("/fastchips/controle"),
              },
            ],
          },
        ],
      };

    case "su":
      return {
        title: t("sidebar.su"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.GridView size={16} />,
                label: t("sidebar.su"),
                path: "/su",
                isActive: isActive("/su") && pathname === "/su",
              },
              {
                icon: <Icons.GridView size={16} />,
                label: t("sidebar.su_ligas"),
                path: "/su/ligas",
                isActive: isActive("/su/ligas"),
              },
              {
                icon: <Icons.GridView size={16} />,
                label: t("sidebar.su_jogos"),
                path: "/su/jogos",
                isActive: isActive("/su/jogos"),
              },
              {
                icon: <Icons.GridView size={16} />,
                label: t("sidebar.su_acertos"),
                path: "/su/acertos",
                isActive: isActive("/su/acertos"),
              },
              {
                icon: <Icons.GridView size={16} />,
                label: t("sidebar.su_import"),
                path: "/su/import",
                isActive: isActive("/su/import"),
              },
              {
                icon: <Icons.GridView size={16} />,
                label: t("sidebar.su_grade"),
                path: "/su/grade",
                isActive: isActive("/su/grade"),
              },
            ],
          },
        ],
      };

    case "apps":
      return {
        title: t("sidebar.apps"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Apps size={16} />,
                label: t("sidebar.all"),
                path: "/apps",
                isActive: isActive("/apps") && !pathname.includes("tab=installed"),
              },
              {
                icon: <Icons.Apps size={16} />,
                label: t("sidebar.installed"),
                path: "/apps?tab=installed",
                isActive: pathname.includes("tab=installed"),
              },
            ],
          },
        ],
      };

    case "settings":
      return {
        title: t("sidebar.settings"),
        sections: [
          {
            title: t("sidebar.management"),
            items: [
              {
                icon: <Icons.Settings size={16} />,
                label: t("sidebar.general"),
                path: "/settings",
                isActive: pathname === "/settings",
              },
              {
                icon: <Icons.Settings size={16} />,
                label: t("sidebar.bank_connections"),
                path: "/settings/accounts",
                isActive: isActive("/settings/accounts"),
              },
              {
                icon: <Icons.Settings size={16} />,
                label: t("sidebar.members"),
                path: "/settings/members",
                isActive: isActive("/settings/members"),
              },
              {
                icon: <Icons.Settings size={16} />,
                label: t("sidebar.notifications"),
                path: "/settings/notifications",
                isActive: isActive("/settings/notifications"),
              },
              {
                icon: <Icons.Settings size={16} />,
                label: t("sidebar.developer"),
                path: "/settings/developer",
                isActive: isActive("/settings/developer"),
              },
            ],
          },
        ],
      };

    default:
      // Fallback para overview
      return {
        title: t("sidebar.overview"),
        sections: [
          {
            title: t("sidebar.quick_actions"),
            items: [
              {
                icon: <Icons.Overview size={16} />,
                label: t("sidebar.overview"),
                path: "/",
                isActive: isActive("/"),
              },
            ],
          },
        ],
      };
  }
}

/**
 * Detecta a seção ativa baseada no pathname atual
 */
export function detectActiveSection(pathname: string): string {
  const cleanPath = pathname.split("?")[0];

  // Exact matches primeiro
  if (cleanPath === "/") return "overview";
  if (cleanPath.startsWith("/transactions")) return "transactions";
  if (cleanPath.startsWith("/inbox")) return "inbox";
  if (cleanPath.startsWith("/invoices")) return "invoices";
  if (cleanPath.startsWith("/tracker")) return "tracker";
  if (cleanPath.startsWith("/customers")) return "customers";
  if (cleanPath.startsWith("/vault")) return "vault";
  if (cleanPath.startsWith("/poker/leagues")) return "leagues";
  if (cleanPath.startsWith("/poker")) return "poker";
  if (cleanPath.startsWith("/fastchips")) return "fastchips";
  if (cleanPath.startsWith("/su")) return "su";
  if (cleanPath.startsWith("/apps")) return "apps";
  if (cleanPath.startsWith("/settings")) return "settings";

  // Default
  return "overview";
}
