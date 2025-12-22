"use client";

import type { ValidationCheck } from "@/lib/poker/types";
import { Badge } from "@midday/ui/badge";
import { Icons } from "@midday/ui/icons";
import { useState } from "react";

type ValidationTabProps = {
  checks: ValidationCheck[];
};

// Category labels and order
const CATEGORY_INFO = {
  structure: {
    label: "Estrutura",
    description: "Verifica se as abas e colunas da planilha existem",
    icon: "FileSpreadsheet",
  },
  integrity: {
    label: "Integridade",
    description: "Valida se os dados estão corretos (IDs, valores, datas)",
    icon: "Shield",
  },
  consistency: {
    label: "Consistência",
    description: "Confirma que os dados batem entre as abas",
    icon: "Link",
  },
  math: {
    label: "Matemática",
    description: "Verifica se os cálculos e somas estão corretos",
    icon: "Calculator",
  },
} as const;

const CATEGORY_ORDER = ["structure", "integrity", "consistency", "math"] as const;

export function ValidationTab({ checks }: ValidationTabProps) {
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  const toggleCheck = (checkId: string) => {
    setExpandedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(checkId)) {
        next.delete(checkId);
      } else {
        next.add(checkId);
      }
      return next;
    });
  };

  const criticalFailed = checks.filter((c) => c.status === "failed" && c.severity === "critical").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const passedCount = checks.filter((c) => c.status === "passed").length;

  // Group checks by category
  const checksByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    info: CATEGORY_INFO[category],
    checks: checks.filter((c) => c.category === category),
  }));

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{checks.length}</p>
            <p className="text-xs text-muted-foreground">verificações</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Icons.Check className="w-4 h-4 text-[#00C969]" />
              <span className="text-[#00C969] font-medium">{passedCount} aprovadas</span>
            </span>
            {warningCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Icons.AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-amber-500 font-medium">{warningCount} avisos</span>
              </span>
            )}
            {criticalFailed > 0 && (
              <span className="flex items-center gap-1.5">
                <Icons.Close className="w-4 h-4 text-[#FF3638]" />
                <span className="text-[#FF3638] font-medium">{criticalFailed} falhas</span>
              </span>
            )}
          </div>
        </div>

        {criticalFailed > 0 ? (
          <Badge variant="destructive" className="gap-1.5 px-3 py-1">
            <Icons.AlertCircle className="w-3.5 h-3.5" />
            Bloqueado
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 bg-[#00C969]/10 text-[#00C969] border-[#00C969]/20">
            <Icons.Check className="w-3.5 h-3.5" />
            Aprovado
          </Badge>
        )}
      </div>

      {/* Critical errors warning */}
      {criticalFailed > 0 && (
        <div className="p-4 border border-[#FF3638]/30 rounded-lg bg-[#FF3638]/5">
          <div className="flex items-start gap-3">
            <Icons.AlertCircle className="w-5 h-5 text-[#FF3638] mt-0.5" />
            <div>
              <p className="font-medium text-[#FF3638]">
                {criticalFailed} verificação(ões) crítica(s) falhou(aram)
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                A importação será bloqueada até que todas as verificações críticas passem.
                Verifique se a planilha está no formato correto do PPPoker.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Checks by category */}
      {checksByCategory.map(({ category, info, checks: categoryChecks }) => {
        if (categoryChecks.length === 0) return null;

        const categoryPassed = categoryChecks.filter((c) => c.status === "passed").length;
        const categoryFailed = categoryChecks.filter((c) => c.status === "failed").length;
        const categoryTotal = categoryChecks.length;

        return (
          <div key={category} className="border rounded-lg overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
              <div className="flex items-center gap-3">
                <CategoryIcon category={category} />
                <div>
                  <h3 className="font-medium">{info.label}</h3>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {categoryFailed > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {categoryFailed} falha(s)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-[#00C969]/10 text-[#00C969]">
                    {categoryPassed}/{categoryTotal}
                  </Badge>
                )}
              </div>
            </div>

            {/* Checks list */}
            <div className="divide-y">
              {categoryChecks.map((check) => {
                const isExpanded = expandedChecks.has(check.id);
                const hasDebug = check.debug && (check.debug.logic || check.debug.expected || check.debug.failedItems?.length);

                return (
                  <div
                    key={check.id}
                    className={`${check.status === "failed" ? "bg-[#FF3638]/5" : ""}`}
                  >
                    {/* Main check row */}
                    <div
                      className={`flex items-center justify-between p-4 ${hasDebug ? "cursor-pointer hover:bg-muted/30" : ""}`}
                      onClick={() => hasDebug && toggleCheck(check.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <StatusIcon status={check.status} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{check.label}</p>
                            {check.severity === "critical" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-[#FF3638]/30 text-[#FF3638]">
                                OBRIGATÓRIO
                              </Badge>
                            )}
                            {hasDebug && (
                              <Icons.ChevronDown
                                className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{check.description}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                          {check.details}
                        </p>
                      </div>
                    </div>

                    {/* Debug panel (collapsible) */}
                    {isExpanded && check.debug && (
                      <div className="px-4 pb-4 pt-0 ml-9 mr-4">
                        <div className="p-3 rounded-md bg-muted/50 border border-border/50 space-y-3 text-xs font-mono">
                          {/* Logic */}
                          <div>
                            <p className="text-muted-foreground mb-1 font-sans font-medium">Lógica:</p>
                            <p className="text-foreground bg-background/50 p-2 rounded">{check.debug.logic}</p>
                          </div>

                          {/* Expected */}
                          <div>
                            <p className="text-muted-foreground mb-1 font-sans font-medium">Esperado:</p>
                            <p className="text-[#00C969] bg-background/50 p-2 rounded">{check.debug.expected}</p>
                          </div>

                          {/* Actual */}
                          {check.debug.actual && (
                            <div>
                              <p className="text-muted-foreground mb-1 font-sans font-medium">Atual:</p>
                              <p className={`bg-background/50 p-2 rounded ${check.status === "failed" ? "text-[#FF3638]" : check.status === "warning" ? "text-amber-500" : "text-foreground"}`}>
                                {check.debug.actual}
                              </p>
                            </div>
                          )}

                          {/* Failed items */}
                          {check.debug.failedItems && check.debug.failedItems.length > 0 && (
                            <div>
                              <p className="text-muted-foreground mb-1 font-sans font-medium">
                                Itens com problema ({check.debug.failedItems.length > 10 ? "10 primeiros" : check.debug.failedItems.length}):
                              </p>
                              <div className="bg-background/50 p-2 rounded space-y-1">
                                {check.debug.failedItems.map((item, idx) => (
                                  <p key={idx} className="text-[#FF3638]">• {item}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusIcon({ status }: { status: ValidationCheck["status"] }) {
  switch (status) {
    case "passed":
      return (
        <div className="w-6 h-6 rounded-full bg-[#00C969]/10 flex items-center justify-center">
          <Icons.Check className="w-3.5 h-3.5 text-[#00C969]" />
        </div>
      );
    case "warning":
      return (
        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Icons.AlertCircle className="w-3.5 h-3.5 text-amber-500" />
        </div>
      );
    case "failed":
      return (
        <div className="w-6 h-6 rounded-full bg-[#FF3638]/10 flex items-center justify-center">
          <Icons.Close className="w-3.5 h-3.5 text-[#FF3638]" />
        </div>
      );
  }
}

function CategoryIcon({ category }: { category: keyof typeof CATEGORY_INFO }) {
  const iconClass = "w-5 h-5 text-muted-foreground";

  switch (category) {
    case "structure":
      return <Icons.Description className={iconClass} />;
    case "integrity":
      return <Icons.Check className={iconClass} />;
    case "consistency":
      return <Icons.Link className={iconClass} />;
    case "math":
      return <Icons.DateFormat className={iconClass} />;
  }
}
