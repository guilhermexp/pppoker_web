"use client";

import { useChatInterface } from "@/hooks/use-chat-interface";
import { useI18n } from "@/locales/client";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const icons = {
  "/": () => <Icons.Overview size={20} />,
  "/transactions": () => <Icons.Transactions size={20} />,
  "/invoices": () => <Icons.Invoice size={20} />,
  "/tracker": () => <Icons.Tracker size={20} />,
  "/customers": () => <Icons.Customers size={20} />,
  "/vault": () => <Icons.Vault size={20} />,
  "/settings": () => <Icons.Settings size={20} />,
  "/apps": () => <Icons.Apps size={20} />,
  "/inbox": () => <Icons.Inbox2 size={20} />,
  "/poker": () => <Icons.PieChart size={20} />,
  "/poker/league-import": () => <Icons.Globle size={20} />,
  "/poker/leagues": () => <Icons.Link size={20} />,
  "/su": () => <Icons.GridView size={20} />,
  "/fastchips": () => <Icons.Accounts size={20} />,
} as const;

const getItems = (t: ReturnType<typeof useI18n>) => [
  {
    path: "/",
    name: t("sidebar.overview"),
  },
  {
    path: "/transactions",
    name: t("sidebar.transactions"),
    children: [
      {
        path: "/transactions/categories",
        name: t("sidebar.categories"),
      },
      {
        path: "/transactions?step=connect",
        name: t("sidebar.connect_bank"),
      },
      {
        path: "/transactions?step=import&hide=true",
        name: t("sidebar.import"),
      },
      {
        path: "/transactions?createTransaction=true",
        name: t("sidebar.create_new"),
      },
    ],
  },
  {
    path: "/inbox",
    name: t("sidebar.inbox"),
    children: [{ path: "/inbox/settings", name: t("sidebar.settings") }],
  },
  {
    path: "/invoices",
    name: t("sidebar.invoices"),
    children: [
      { path: "/invoices/products", name: t("sidebar.products") },
      { path: "/invoices?type=create", name: t("sidebar.create_new") },
    ],
  },
  {
    path: "/tracker",
    name: t("sidebar.tracker"),
    children: [{ path: "/tracker?create=true", name: t("sidebar.create_new") }],
  },
  {
    path: "/customers",
    name: t("sidebar.customers"),
    children: [
      { path: "/customers?createCustomer=true", name: t("sidebar.create_new") },
    ],
  },
  {
    path: "/vault",
    name: t("sidebar.vault"),
  },
  {
    path: "/poker",
    name: t("sidebar.poker"),
    children: [
      { path: "/poker/players", name: t("sidebar.poker_players") },
      { path: "/poker/agents", name: t("sidebar.poker_agents") },
      { path: "/poker/membros", name: t("sidebar.poker_members") },
      { path: "/poker/contador", name: t("sidebar.poker_contador") },
      { path: "/poker/lobby", name: t("sidebar.poker_lobby") },
      { path: "/poker/sessions", name: t("sidebar.poker_sessions") },
      { path: "/poker/transactions", name: t("sidebar.poker_transactions") },
      { path: "/poker/settlements", name: t("sidebar.poker_settlements") },
      { path: "/poker/import", name: t("sidebar.poker_import") },
    ],
  },
  {
    path: "/poker/leagues",
    name: t("sidebar.ligas"),
    children: [
      { path: "/poker/leagues/import", name: t("sidebar.ligas_import") },
    ],
  },
  {
    path: "/fastchips",
    name: t("sidebar.fastchips"),
    children: [
      {
        path: "/fastchips/transacoes",
        name: t("sidebar.fastchips_transacoes"),
      },
      {
        path: "/fastchips/contas-vinculadas",
        name: t("sidebar.fastchips_contas_vinculadas"),
      },
      { path: "/fastchips/jogadores", name: t("sidebar.fastchips_jogadores") },
      {
        path: "/fastchips/movimentacao",
        name: t("sidebar.fastchips_movimentacao"),
      },
      { path: "/fastchips/controle", name: t("sidebar.fastchips_controle") },
    ],
  },
  {
    path: "/su",
    name: t("sidebar.su"),
    children: [
      { path: "/su/ligas", name: t("sidebar.su_ligas") },
      { path: "/su/jogos", name: t("sidebar.su_jogos") },
      { path: "/su/acertos", name: t("sidebar.su_acertos") },
      { path: "/su/import", name: t("sidebar.su_import") },
      { path: "/su/grade", name: t("sidebar.su_grade") },
    ],
  },
  {
    path: "/apps",
    name: t("sidebar.apps"),
    children: [
      { path: "/apps", name: t("sidebar.all") },
      { path: "/apps?tab=installed", name: t("sidebar.installed") },
    ],
  },
  {
    path: "/settings",
    name: t("sidebar.settings"),
    children: [
      { path: "/settings", name: t("sidebar.general") },
      { path: "/settings/accounts", name: t("sidebar.bank_connections") },
      { path: "/settings/members", name: t("sidebar.members") },
      { path: "/settings/notifications", name: t("sidebar.notifications") },
      { path: "/settings/developer", name: t("sidebar.developer") },
    ],
  },
];

// Known menu base paths that should not be treated as chat IDs
const KNOWN_MENU_PATHS = [
  "/transactions",
  "/inbox",
  "/invoices",
  "/tracker",
  "/customers",
  "/vault",
  "/poker",
  "/poker/league-import",
  "/poker/leagues",
  "/fastchips",
  "/su",
  "/apps",
  "/settings",
];

interface ItemProps {
  item: {
    path: string;
    name: string;
    children?: { path: string; name: string }[];
  };
  isActive: boolean;
  isExpanded: boolean;
  isItemExpanded: boolean;
  onToggle: (path: string) => void;
  onSelect?: () => void;
}

const ChildItem = ({
  child,
  isActive,
  isExpanded,
  shouldShow,
  onSelect,
  index,
}: {
  child: { path: string; name: string };
  isActive: boolean;
  isExpanded: boolean;
  shouldShow: boolean;
  onSelect?: () => void;
  index: number;
}) => {
  const showChild = isExpanded && shouldShow;

  return (
    <Link
      prefetch
      href={child.path}
      onClick={() => onSelect?.()}
      className="block group/child"
    >
      <div className="relative">
        {/* Child item text */}
        <div
          className={cn(
            "ml-[35px] mr-[15px] h-[32px] flex items-center",
            "border-l border-[#DCDAD2] dark:border-[#2C2C2C] pl-3",
            "transition-all duration-200 ease-out",
            showChild
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2",
          )}
          style={{
            transitionDelay: showChild
              ? `${40 + index * 20}ms`
              : `${index * 20}ms`,
          }}
        >
          <span
            className={cn(
              "text-xs font-medium transition-colors duration-200",
              "text-[#888] group-hover/child:text-primary",
              "whitespace-nowrap overflow-hidden",
              isActive && "text-primary",
            )}
          >
            {child.name}
          </span>
        </div>
      </div>
    </Link>
  );
};

const Item = ({
  item,
  isActive,
  isExpanded,
  isItemExpanded,
  onToggle,
  onSelect,
}: ItemProps) => {
  const Icon = icons[item.path as keyof typeof icons];
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;

  // Children should be visible when: expanded sidebar AND this item is expanded
  const shouldShowChildren = isExpanded && isItemExpanded;

  const handleChevronClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(item.path);
  };

  return (
    <div className="group">
      <Link
        prefetch
        href={item.path}
        onClick={() => onSelect?.()}
        className="group"
      >
        <div className="relative">
          {/* Background that expands */}
          <div
            className={cn(
              "border border-transparent h-[40px] transition-all duration-200 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb; mr-[15px]",
              isActive &&
                "bg-[#F2F1EF] dark:bg-secondary border-[#DCDAD2] dark:border-[#2C2C2C]",
              isExpanded
                ? "ml-[15px] w-[calc(100%-30px)]"
                : "ml-[8px] w-[40px]",
            )}
          />

          {/* Icon - always in same position from sidebar edge */}
          <div
            className={cn(
              "absolute top-0 w-[40px] h-[40px] flex items-center justify-center dark:text-[#666666] text-black group-hover:!text-primary pointer-events-none",
              isExpanded ? "left-[15px]" : "left-[8px]",
            )}
          >
            <div className={cn(isActive && "dark:!text-white")}>
              <Icon />
            </div>
          </div>

          {isExpanded && (
            <div className="absolute top-0 left-[55px] right-[4px] h-[40px] flex items-center pointer-events-none">
              <span
                className={cn(
                  "text-sm font-medium transition-opacity duration-200 ease-in-out text-[#666] group-hover:text-primary",
                  "whitespace-nowrap overflow-hidden",
                  hasChildren ? "pr-2" : "",
                  isActive && "text-primary",
                )}
              >
                {item.name}
              </span>
              {hasChildren && (
                <button
                  type="button"
                  onClick={handleChevronClick}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center transition-all duration-200 ml-auto mr-3",
                    "text-[#888] hover:text-primary pointer-events-auto",
                    isActive && "text-primary/60",
                    shouldShowChildren && "rotate-180",
                  )}
                >
                  <Icons.ChevronDown size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Children */}
      {hasChildren && (
        <div
          className={cn(
            "transition-all duration-300 ease-out overflow-hidden",
            shouldShowChildren ? "max-h-96 mt-1" : "max-h-0",
          )}
        >
          {item.children!.map((child, index) => {
            const isChildActive = pathname === child.path;
            return (
              <ChildItem
                key={child.path}
                child={child}
                isActive={isChildActive}
                isExpanded={isExpanded}
                shouldShow={shouldShowChildren}
                onSelect={onSelect}
                index={index}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

type Props = {
  onSelect?: () => void;
  isExpanded?: boolean;
};

export function MainMenu({ onSelect, isExpanded = false }: Props) {
  const pathname = usePathname();
  const { isChatPage } = useChatInterface();
  const t = useI18n();
  const items = getItems(t);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Check if current pathname is a known menu path (including sub-paths)
  const pathnameWithoutQuery = pathname?.split("?")[0] || "";
  const isKnownMenuPath = KNOWN_MENU_PATHS.some((knownPath) =>
    pathnameWithoutQuery.startsWith(knownPath),
  );

  // Only treat as chat page if isChatPage is true AND it's not a known menu path
  const isValidChatPage = isChatPage && !isKnownMenuPath;

  // Reset expanded item when sidebar expands/collapses
  useEffect(() => {
    setExpandedItem(null);
  }, [isExpanded]);

  // Find the best matching item (longest path that is a prefix of pathname)
  const findBestMatchPath = (currentPath: string) => {
    let bestMatch = "";
    for (const item of items) {
      if (
        currentPath === item.path ||
        currentPath.startsWith(`${item.path}/`)
      ) {
        if (item.path.length > bestMatch.length) {
          bestMatch = item.path;
        }
      }
    }
    return bestMatch;
  };

  const bestMatchPath = findBestMatchPath(pathnameWithoutQuery);

  return (
    <div className="mt-6 w-full">
      <nav className="w-full">
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isActive =
              (pathname === "/" && item.path === "/") ||
              (item.path === "/" && isValidChatPage) ||
              item.path === bestMatchPath;

            return (
              <Item
                key={item.path}
                item={item}
                isActive={isActive}
                isExpanded={isExpanded}
                isItemExpanded={expandedItem === item.path}
                onToggle={(path) => {
                  setExpandedItem(expandedItem === path ? null : path);
                }}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </nav>
    </div>
  );
}
