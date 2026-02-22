import {
  endOfMonth,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

export interface CommandSuggestion {
  command: string;
  title: string;
  toolName?: string;
  toolParams?: Record<string, any>;
  keywords: string[];
  executionType?: "tool" | "ui" | "insert";
  uiAction?: "new_session";
  insertText?: string;
}

export interface NanobotToolManifestItem {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface NanobotCommandPayload {
  command?: string;
  title: string;
  toolName: string;
  toolParams?: Record<string, any>;
  keywords?: string[];
}

function splitToolNameToKeywords(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function prettifyToolName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^get\s+/i, "mostrar ")
    .replace(/^create\s+/i, "criar ")
    .replace(/^update\s+/i, "atualizar ")
    .replace(/^delete\s+/i, "remover ")
    .replace(/^stop\s+/i, "parar ");
}

function defaultSlashForTool(toolName: string): string {
  if (/^get/i.test(toolName)) return "/mostrar";
  if (/^(create|update|delete|stop)/i.test(toolName)) return "/executar";
  return "/nano";
}

export function createNanobotCommandSuggestions(
  tools: NanobotToolManifestItem[],
): CommandSuggestion[] {
  return tools.map((tool) => {
    const baseKeywords = splitToolNameToKeywords(tool.name);
    const descriptionKeywords = (tool.description ?? "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 10);

    return {
      command: defaultSlashForTool(tool.name),
      title: prettifyToolName(tool.name),
      toolName: tool.name,
      toolParams: {},
      executionType: "tool",
      keywords: [...new Set([...baseKeywords, ...descriptionKeywords])],
    };
  });
}

export function normalizeNanobotCommands(
  commands: NanobotCommandPayload[] | undefined,
): CommandSuggestion[] {
  if (!commands?.length) return [];

  return commands
    .filter((command) => command?.title && command.toolName)
    .map((command) => ({
      command: command.command || defaultSlashForTool(command.toolName),
      title: command.title,
      toolName: command.toolName,
      toolParams: command.toolParams ?? {},
      executionType: "tool",
      keywords: command.keywords ?? splitToolNameToKeywords(command.toolName),
    }));
}

export interface NanobotSkillPayload {
  name: string;
  description?: string;
  aliases?: string[];
}

export function createNanobotSessionCommands(): CommandSuggestion[] {
  return [
    {
      command: "/nano",
      title: "Nova sessão Nanobot",
      executionType: "ui",
      uiAction: "new_session",
      keywords: ["nova", "sessao", "new", "session", "chat", "nanobot"],
    },
  ];
}

export function normalizeNanobotSkills(
  skills: NanobotSkillPayload[] | undefined,
): CommandSuggestion[] {
  if (!skills?.length) return [];

  return skills
    .filter((skill) => skill?.name)
    .map((skill) => ({
      command: "/skill",
      title: `Usar skill ${skill.name}`,
      executionType: "insert",
      insertText: `Use a skill '${skill.name}' para resolver isso. `,
      keywords: [
        "skill",
        "nanobot",
        skill.name.toLowerCase(),
        ...(skill.aliases ?? []).map((alias) => alias.toLowerCase()),
        ...(skill.description ?? "")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((word) => word.length > 2)
          .slice(0, 8),
      ],
    }));
}

export function mergeCommandSuggestions(
  baseCommands: CommandSuggestion[],
  dynamicCommands: CommandSuggestion[],
): CommandSuggestion[] {
  if (!dynamicCommands.length) return baseCommands;

  // Prefer curated local commands for tools already covered by the product UX.
  const coveredToolNames = new Set(
    baseCommands.map((command) => command.toolName).filter(Boolean),
  );

  const result = [...baseCommands];
  const seen = new Set(
    baseCommands.map((command) => `${command.toolName}::${command.title}`),
  );

  for (const command of dynamicCommands) {
    if (command.toolName && coveredToolNames.has(command.toolName)) {
      continue;
    }

    const key = `${command.toolName}::${command.title}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(command);
  }

  return result;
}

// Command system with / prefix - natural language suggestions
export const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    command: "/mostrar",
    title: "Mostrar ultimas transacoes",
    toolName: "getTransactions",
    toolParams: { pageSize: 10, sort: ["date", "desc"] },
    keywords: [
      "mostrar",
      "ultimas",
      "transacoes",
      "recentes",
      "show",
      "latest",
      "transactions",
      "recent",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar queima de caixa e top 3 aumentos de fornecedores",
    toolName: "getBurnRate",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "queima",
      "caixa",
      "fornecedores",
      "aumentos",
      "show",
      "burn",
      "cash",
      "vendor",
      "increases",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar onde estamos gastando mais este mes",
    toolName: "getSpending",
    toolParams: {
      from: startOfMonth(new Date()).toISOString(),
      to: endOfMonth(new Date()).toISOString(),
      showCanvas: true,
    },
    keywords: [
      "mostrar",
      "gastos",
      "mais",
      "este mes",
      "onde",
      "show",
      "spending",
      "most",
      "this month",
      "where",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar tendencias e insights semanais",
    toolName: "getBurnRate",
    toolParams: {
      from: subDays(new Date(), 7).toISOString(),
      to: new Date().toISOString(),
      showCanvas: true,
    },
    keywords: [
      "mostrar",
      "semanais",
      "tendencias",
      "insights",
      "show",
      "weekly",
      "trends",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar desempenho de receita",
    toolName: "getRevenueSummary",
    toolParams: {
      from: startOfYear(new Date()).toISOString(),
      to: endOfMonth(new Date()).toISOString(),
      showCanvas: true,
    },
    keywords: [
      "mostrar",
      "receita",
      "desempenho",
      "analisar",
      "show",
      "revenue",
      "performance",
      "analyze",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar detalhamento de despesas por categoria",
    toolName: "getSpending",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "despesas",
      "detalhamento",
      "categoria",
      "show",
      "expense",
      "breakdown",
      "category",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar margens de lucro",
    toolName: "getProfitAnalysis",
    toolParams: { showCanvas: true },
    keywords: ["mostrar", "lucro", "margens", "show", "profit", "margins"],
  },
  {
    command: "/mostrar",
    title: "Mostrar fluxo de caixa",
    toolName: "getRunway",
    toolParams: { showCanvas: true },
    keywords: ["mostrar", "fluxo", "caixa", "runway", "show", "cash", "left"],
  },
  {
    command: "/mostrar",
    title: "Mostrar teste de estresse do fluxo de caixa",
    toolName: "getCashFlowStressTest",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "estresse",
      "teste",
      "cenario",
      "resiliencia",
      "financeiro",
      "show",
      "stress",
      "test",
      "scenario",
      "resilience",
      "financial",
    ],
  },
  {
    command: "/encontrar",
    title: "Encontrar transacoes sem tag do mes passado",
    toolName: "getTransactions",
    toolParams: {
      from: subMonths(new Date(), 1).toISOString(),
      to: new Date().toISOString(),
      statuses: ["pending"],
    },
    keywords: [
      "encontrar",
      "sem tag",
      "transacoes",
      "mes passado",
      "find",
      "untagged",
      "transactions",
      "last month",
    ],
  },
  {
    command: "/encontrar",
    title: "Encontrar pagamentos recorrentes",
    toolName: "getTransactions",
    toolParams: { recurring: true },
    keywords: [
      "encontrar",
      "recorrentes",
      "pagamentos",
      "assinaturas",
      "find",
      "recurring",
      "payments",
      "subscriptions",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar tendencias de taxa de queima",
    toolName: "getBurnRate",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "queima",
      "taxa",
      "tendencias",
      "analyze",
      "burn",
      "rate",
      "trends",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar padroes de gastos",
    toolName: "getSpending",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "gastos",
      "padroes",
      "analyze",
      "spending",
      "patterns",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar resiliencia financeira",
    toolName: "getCashFlowStressTest",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "estresse",
      "teste",
      "resiliencia",
      "cenarios",
      "financeiro",
      "analyze",
      "stress",
      "test",
      "resilience",
      "scenarios",
      "financial",
    ],
  },
  // Balanco Patrimonial
  {
    command: "/mostrar",
    title: "Mostrar balanco patrimonial",
    toolName: "getBalanceSheet",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "balanco",
      "patrimonial",
      "ativos",
      "passivos",
      "patrimonio",
      "show",
      "balance",
      "sheet",
      "assets",
      "liabilities",
      "equity",
    ],
  },
  // Taxa de Crescimento
  {
    command: "/mostrar",
    title: "Mostrar analise de taxa de crescimento",
    toolName: "getGrowthRate",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "crescimento",
      "taxa",
      "receita",
      "lucro",
      "tendencias",
      "show",
      "growth",
      "rate",
      "revenue",
      "profit",
      "trends",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar tendencias de crescimento de receita",
    toolName: "getGrowthRate",
    toolParams: { showCanvas: true, type: "revenue" },
    keywords: [
      "analisar",
      "receita",
      "crescimento",
      "tendencias",
      "periodo",
      "analyze",
      "revenue",
      "growth",
      "trends",
      "period",
    ],
  },
  // Analise de Pagamento de Faturas
  {
    command: "/mostrar",
    title: "Mostrar analise de pagamento de faturas",
    toolName: "getInvoicePaymentAnalysis",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "fatura",
      "pagamento",
      "analise",
      "dias",
      "vencidas",
      "show",
      "invoice",
      "payment",
      "analysis",
      "days",
      "overdue",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar padroes de pagamento de clientes",
    toolName: "getInvoicePaymentAnalysis",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "cliente",
      "pagamento",
      "padroes",
      "faturas",
      "analyze",
      "customer",
      "payment",
      "patterns",
      "invoices",
    ],
  },
  // Resumo de Impostos
  {
    command: "/mostrar",
    title: "Mostrar resumo de impostos",
    toolName: "getTaxSummary",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "imposto",
      "resumo",
      "deducoes",
      "ano",
      "show",
      "tax",
      "summary",
      "deductions",
      "year",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar detalhamento de impostos por categoria",
    toolName: "getTaxSummary",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "imposto",
      "detalhamento",
      "categoria",
      "deducoes",
      "show",
      "tax",
      "breakdown",
      "category",
      "deductions",
    ],
  },
  // Pontuacao de Saude do Negocio
  {
    command: "/mostrar",
    title: "Mostrar pontuacao de saude do negocio",
    toolName: "getBusinessHealthScore",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "negocio",
      "saude",
      "pontuacao",
      "metricas",
      "show",
      "business",
      "health",
      "score",
      "metrics",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar metricas de saude do negocio",
    toolName: "getBusinessHealthScore",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "negocio",
      "saude",
      "metricas",
      "desempenho",
      "analyze",
      "business",
      "health",
      "metrics",
      "performance",
    ],
  },
  // Previsao
  {
    command: "/mostrar",
    title: "Mostrar previsao de receita",
    toolName: "getForecast",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "receita",
      "previsao",
      "projecao",
      "futuro",
      "show",
      "revenue",
      "forecast",
      "projection",
      "future",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar projecoes de receita",
    toolName: "getForecast",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "receita",
      "projecoes",
      "previsao",
      "tendencias",
      "analyze",
      "revenue",
      "projections",
      "forecast",
      "trends",
    ],
  },
  // Detalhamento de Despesas
  {
    command: "/mostrar",
    title: "Mostrar detalhamento de despesas",
    toolName: "getExpensesBreakdown",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "despesas",
      "detalhamento",
      "categoria",
      "analise",
      "show",
      "expenses",
      "breakdown",
      "category",
      "analysis",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar categorias de despesas",
    toolName: "getExpensesBreakdown",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "despesa",
      "categorias",
      "detalhamento",
      "analyze",
      "expense",
      "categories",
      "breakdown",
    ],
  },
  // Resumo de Receita
  {
    command: "/mostrar",
    title: "Mostrar resumo de receita",
    toolName: "getRevenueSummary",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "receita",
      "resumo",
      "renda",
      "ganhos",
      "show",
      "revenue",
      "summary",
      "income",
      "earnings",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar tendencias de receita deste ano",
    toolName: "getRevenueSummary",
    toolParams: {
      from: startOfYear(new Date()).toISOString(),
      to: endOfMonth(new Date()).toISOString(),
      showCanvas: true,
    },
    keywords: [
      "mostrar",
      "receita",
      "tendencias",
      "ano",
      "este ano",
      "show",
      "revenue",
      "trends",
      "year",
      "this year",
    ],
  },
  // Analise de Lucro
  {
    command: "/mostrar",
    title: "Mostrar demonstrativo de lucros e perdas",
    toolName: "getProfitAnalysis",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "lucro",
      "perdas",
      "demonstrativo",
      "dre",
      "show",
      "profit",
      "loss",
      "statement",
      "p&l",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar margens de lucro",
    toolName: "getProfitAnalysis",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "lucro",
      "margens",
      "lucratividade",
      "analyze",
      "profit",
      "margins",
      "profitability",
    ],
  },
  // Saldos das Contas
  {
    command: "/mostrar",
    title: "Mostrar saldos das contas",
    toolName: "getAccountBalances",
    toolParams: {},
    keywords: [
      "mostrar",
      "conta",
      "saldos",
      "banco",
      "contas",
      "show",
      "account",
      "balances",
      "bank",
      "accounts",
    ],
  },
  // Faturas
  {
    command: "/mostrar",
    title: "Mostrar ultimas faturas",
    toolName: "getInvoices",
    toolParams: { pageSize: 10, sort: ["createdAt", "desc"] },
    keywords: [
      "mostrar",
      "ultimas",
      "faturas",
      "recentes",
      "show",
      "latest",
      "invoices",
      "recent",
    ],
  },
  {
    command: "/encontrar",
    title: "Encontrar faturas nao pagas",
    toolName: "getInvoices",
    toolParams: { statuses: ["unpaid"], pageSize: 20 },
    keywords: [
      "encontrar",
      "nao pagas",
      "faturas",
      "pendentes",
      "find",
      "unpaid",
      "invoices",
      "outstanding",
    ],
  },
  {
    command: "/encontrar",
    title: "Encontrar faturas vencidas",
    toolName: "getInvoices",
    toolParams: { statuses: ["overdue"], pageSize: 20 },
    keywords: [
      "encontrar",
      "vencidas",
      "faturas",
      "atrasadas",
      "find",
      "overdue",
      "invoices",
      "late",
    ],
  },
  // Clientes
  {
    command: "/mostrar",
    title: "Mostrar clientes",
    toolName: "getCustomers",
    toolParams: { pageSize: 10 },
    keywords: [
      "mostrar",
      "clientes",
      "lista",
      "show",
      "customers",
      "clients",
      "list",
    ],
  },
  {
    command: "/encontrar",
    title: "Encontrar melhores clientes",
    toolName: "getCustomers",
    toolParams: { pageSize: 10 },
    keywords: [
      "encontrar",
      "melhores",
      "clientes",
      "top",
      "find",
      "top",
      "customers",
      "clients",
    ],
  },
  // Fluxo de Caixa
  {
    command: "/mostrar",
    title: "Mostrar fluxo de caixa",
    toolName: "getCashFlow",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "caixa",
      "fluxo",
      "receitas",
      "despesas",
      "show",
      "cash",
      "flow",
      "income",
      "expenses",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar fluxo de caixa deste mes",
    toolName: "getCashFlow",
    toolParams: {
      from: startOfMonth(new Date()).toISOString(),
      to: endOfMonth(new Date()).toISOString(),
      showCanvas: true,
    },
    keywords: [
      "mostrar",
      "caixa",
      "fluxo",
      "mes",
      "este mes",
      "show",
      "cash",
      "flow",
      "month",
      "this month",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar tendencias de fluxo de caixa",
    toolName: "getCashFlow",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "caixa",
      "fluxo",
      "tendencias",
      "padroes",
      "analyze",
      "cash",
      "flow",
      "trends",
      "patterns",
    ],
  },
  // Despesas
  {
    command: "/mostrar",
    title: "Mostrar despesas",
    toolName: "getExpenses",
    toolParams: { showCanvas: true },
    keywords: [
      "mostrar",
      "despesas",
      "custos",
      "gastos",
      "show",
      "expenses",
      "costs",
      "spending",
    ],
  },
  {
    command: "/mostrar",
    title: "Mostrar despesas deste mes",
    toolName: "getExpenses",
    toolParams: {
      from: startOfMonth(new Date()).toISOString(),
      to: endOfMonth(new Date()).toISOString(),
      showCanvas: true,
    },
    keywords: [
      "mostrar",
      "despesas",
      "mes",
      "este mes",
      "show",
      "expenses",
      "month",
      "this month",
    ],
  },
  {
    command: "/analisar",
    title: "Analisar tendencias de despesas",
    toolName: "getExpenses",
    toolParams: { showCanvas: true },
    keywords: [
      "analisar",
      "despesa",
      "tendencias",
      "padroes",
      "analyze",
      "expense",
      "trends",
      "patterns",
    ],
  },
];
