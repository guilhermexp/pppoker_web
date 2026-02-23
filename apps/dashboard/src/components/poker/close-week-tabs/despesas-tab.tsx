"use client";

import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { useState } from "react";

export type Expense = {
  id: string;
  name: string;
  type: "fixed" | "variable";
  category: string;
  amount: number;
  percentage?: number;
  isPercentage: boolean;
};

type DespesasTabProps = {
  totalRake: number;
  totalRakeback: number;
  leagueFee?: number;
  leagueFeePercent?: number;
  appFee?: number;
  appFeePercent?: number;
  expenses: Expense[];
  onExpensesChange?: (expenses: Expense[]) => void;
  onLeagueFeeChange?: (percent: number) => void;
  onAppFeeChange?: (percent: number) => void;
};

const VARIABLE_SUGGESTIONS = [
  { id: "marketing", name: "Marketing" },
  { id: "bonus", name: "Bônus" },
  { id: "chippix", name: "Chippix" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function DespesasTab({
  totalRake,
  totalRakeback,
  leagueFee = 0,
  leagueFeePercent,
  appFee = 0,
  appFeePercent,
  expenses,
  onExpensesChange,
  onLeagueFeeChange,
  onAppFeeChange,
}: DespesasTabProps) {
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Calculate fixed expenses
  const fixedExpenses = {
    rakeback: totalRakeback,
    league_fee: leagueFee,
    app_fee: appFee,
    team: expenses.find((e) => e.category === "team")?.amount || 0,
    tax: expenses.find((e) => e.category === "tax")?.amount || 0,
  };

  const totalFixedExpenses = Object.values(fixedExpenses).reduce(
    (sum, val) => sum + val,
    0,
  );

  // Variable expenses from props
  const variableExpenses = expenses.filter((e) => e.type === "variable");
  const totalVariableExpenses = variableExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  const totalExpenses = totalFixedExpenses + totalVariableExpenses;
  const netProfit = totalRake - totalExpenses;
  const marginPercent = totalRake > 0 ? (netProfit / totalRake) * 100 : 0;

  // Handle adding new expense
  const handleAddExpense = () => {
    if (!newExpenseName.trim() || !newExpenseAmount || !onExpensesChange)
      return;

    const newExpense: Expense = {
      id: `var_${Date.now()}`,
      name: newExpenseName.trim(),
      type: "variable",
      category: newExpenseName.toLowerCase().replace(/\s+/g, "_"),
      amount: Number.parseFloat(newExpenseAmount) || 0,
      isPercentage: false,
    };

    onExpensesChange([...expenses, newExpense]);
    setNewExpenseName("");
    setNewExpenseAmount("");
    setShowAddForm(false);
  };

  // Handle removing expense
  const handleRemoveExpense = (id: string) => {
    if (!onExpensesChange) return;
    onExpensesChange(expenses.filter((e) => e.id !== id));
  };

  // Handle updating fixed expense amount
  const handleUpdateFixedExpense = (category: string, amount: number) => {
    if (!onExpensesChange) return;

    const existingIndex = expenses.findIndex((e) => e.category === category);
    if (existingIndex >= 0) {
      const updated = [...expenses];
      updated[existingIndex] = { ...updated[existingIndex], amount };
      onExpensesChange(updated);
    } else {
      const categoryNames: Record<string, string> = {
        team: "Equipe",
        tax: "Imposto",
      };
      onExpensesChange([
        ...expenses,
        {
          id: `fixed_${category}`,
          name: categoryNames[category] || category,
          type: "fixed",
          category,
          amount,
          isPercentage: false,
        },
      ]);
    }
  };

  // Quick add suggestion
  const handleQuickAdd = (suggestion: { id: string; name: string }) => {
    if (!onExpensesChange) return;

    const newExpense: Expense = {
      id: `var_${suggestion.id}_${Date.now()}`,
      name: suggestion.name,
      type: "variable",
      category: suggestion.id,
      amount: 0,
      isPercentage: false,
    };

    onExpensesChange([...expenses, newExpense]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icons.ReceiptLong className="w-4 h-4" />
        <span className="font-medium">Gestão de Despesas</span>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Financial Summary */}
        <div className="space-y-5">
          {/* Hero: Lucro Líquido */}
          <div className="pb-4 border-b border-[#2a2a2a]">
            <span className="text-xs text-muted-foreground">Lucro Líquido</span>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span
                className={cn(
                  "text-3xl font-bold font-mono",
                  netProfit >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                )}
              >
                {formatCurrency(netProfit)}
              </span>
              <span
                className={cn(
                  "text-xs font-mono",
                  marginPercent >= 0
                    ? "text-[#00C969]/60"
                    : "text-[#FF3638]/60",
                )}
              >
                {formatPercent(marginPercent)} margem
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rake Bruto</span>
              <span className="font-mono text-[#00C969]">
                {formatCurrency(totalRake)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                − Rakeback
                <span className="text-[10px] ml-1 opacity-50">
                  (
                  {totalRake > 0
                    ? formatPercent((totalRakeback / totalRake) * 100)
                    : "0%"}
                  )
                </span>
              </span>
              <span className="font-mono text-orange-500">
                {formatCurrency(totalRakeback)}
              </span>
            </div>

            {leagueFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  − Taxa Liga
                  <span className="text-[10px] ml-1 opacity-50">
                    ({leagueFeePercent || 0}%)
                  </span>
                </span>
                <span className="font-mono text-purple-500">
                  {formatCurrency(leagueFee)}
                </span>
              </div>
            )}

            {appFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  − Taxa App
                  <span className="text-[10px] ml-1 opacity-50">
                    ({appFeePercent || 0}%)
                  </span>
                </span>
                <span className="font-mono text-blue-500">
                  {formatCurrency(appFee)}
                </span>
              </div>
            )}

            {fixedExpenses.team > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">− Equipe</span>
                <span className="font-mono text-cyan-500">
                  {formatCurrency(fixedExpenses.team)}
                </span>
              </div>
            )}

            {fixedExpenses.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">− Imposto</span>
                <span className="font-mono text-red-500">
                  {formatCurrency(fixedExpenses.tax)}
                </span>
              </div>
            )}

            {variableExpenses.map((expense) => (
              <div key={expense.id} className="flex justify-between">
                <span className="text-muted-foreground">− {expense.name}</span>
                <span className="font-mono text-[#FF3638]">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}

            <div className="flex justify-between pt-2 border-t border-[#2a2a2a]">
              <span className="text-muted-foreground">= Lucro Líquido</span>
              <span
                className={cn(
                  "font-mono font-medium",
                  netProfit >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                )}
              >
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="space-y-2 pt-4 border-t border-[#2a2a2a]">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Total Despesas Fixas
              </span>
              <span className="font-mono text-[#FF3638]">
                {formatCurrency(totalFixedExpenses)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Total Despesas Variáveis
              </span>
              <span className="font-mono text-[#FF3638]">
                {formatCurrency(totalVariableExpenses)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Total Geral</span>
              <span className="font-mono text-[#FF3638]">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Edit Expenses */}
        <div className="space-y-4">
          {/* Despesas Fixas */}
          <div className="pb-3 border-b border-[#2a2a2a]">
            <span className="text-xs text-muted-foreground font-medium">
              Despesas Fixas
            </span>
          </div>

          {/* Rakeback - Read only */}
          <div className="flex justify-between items-center pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Rakeback</span>
              <div className="text-lg font-bold font-mono text-orange-500">
                {formatCurrency(totalRakeback)}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Comissão dos agentes</div>
              {totalRake > 0 && (
                <div>
                  {formatPercent((totalRakeback / totalRake) * 100)} do rake
                </div>
              )}
            </div>
          </div>

          {/* Liga Fee */}
          <div className="flex justify-between items-center pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">
                Taxa da Liga
              </span>
              <div className="text-lg font-bold font-mono text-purple-500">
                {formatCurrency(leagueFee)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={leagueFeePercent ?? ""}
                onChange={(e) =>
                  onLeagueFeeChange?.(Number.parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className="w-16 text-right font-mono h-7 text-sm"
                min={0}
                max={100}
                step={0.1}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* App Fee */}
          <div className="flex justify-between items-center pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Taxa do App</span>
              <div className="text-lg font-bold font-mono text-blue-500">
                {formatCurrency(appFee)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={appFeePercent ?? ""}
                onChange={(e) =>
                  onAppFeeChange?.(Number.parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className="w-16 text-right font-mono h-7 text-sm"
                min={0}
                max={100}
                step={0.1}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Equipe */}
          <div className="flex justify-between items-center pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Equipe</span>
              <div className="text-lg font-bold font-mono text-cyan-500">
                {formatCurrency(fixedExpenses.team)}
              </div>
            </div>
            <Input
              type="number"
              value={fixedExpenses.team || ""}
              onChange={(e) =>
                handleUpdateFixedExpense(
                  "team",
                  Number.parseFloat(e.target.value) || 0,
                )
              }
              placeholder="0,00"
              className="w-24 text-right font-mono h-7 text-sm"
            />
          </div>

          {/* Imposto */}
          <div className="flex justify-between items-center pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Imposto</span>
              <div className="text-lg font-bold font-mono text-red-500">
                {formatCurrency(fixedExpenses.tax)}
              </div>
            </div>
            <Input
              type="number"
              value={fixedExpenses.tax || ""}
              onChange={(e) =>
                handleUpdateFixedExpense(
                  "tax",
                  Number.parseFloat(e.target.value) || 0,
                )
              }
              placeholder="0,00"
              className="w-24 text-right font-mono h-7 text-sm"
            />
          </div>

          {/* Despesas Variáveis */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
              <span className="text-xs text-muted-foreground font-medium">
                Despesas Variáveis
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Icons.Add className="w-3 h-3 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Quick Add Suggestions */}
            {variableExpenses.length === 0 && !showAddForm && (
              <div className="flex items-center gap-2 py-3">
                <span className="text-[10px] text-muted-foreground">
                  Sugestões:
                </span>
                {VARIABLE_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-2"
                    onClick={() => handleQuickAdd(suggestion)}
                  >
                    <Icons.Add className="w-2.5 h-2.5 mr-1" />
                    {suggestion.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Add Form */}
            {showAddForm && (
              <div className="flex items-center gap-2 py-3">
                <Input
                  placeholder="Nome"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  className="flex-1 h-7 text-sm"
                />
                <Input
                  type="number"
                  placeholder="Valor"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  className="w-24 h-7 text-sm text-right font-mono"
                />
                <Button
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleAddExpense}
                >
                  <Icons.Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowAddForm(false)}
                >
                  <Icons.Close className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Variable Expenses List */}
            {variableExpenses.length === 0 && !showAddForm ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground/50">
                <span className="text-xs">Nenhuma despesa variável</span>
              </div>
            ) : (
              <div className="space-y-0">
                {variableExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex justify-between items-center py-3 border-b border-[#2a2a2a]"
                  >
                    <div>
                      <span className="text-xs text-muted-foreground">
                        {expense.name}
                      </span>
                      <div className="text-lg font-bold font-mono text-[#FF3638]">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={expense.amount || ""}
                        onChange={(e) => {
                          if (!onExpensesChange) return;
                          const updated = expenses.map((exp) =>
                            exp.id === expense.id
                              ? {
                                  ...exp,
                                  amount:
                                    Number.parseFloat(e.target.value) || 0,
                                }
                              : exp,
                          );
                          onExpensesChange(updated);
                        }}
                        className="w-24 text-right font-mono h-7 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-[#FF3638]"
                        onClick={() => handleRemoveExpense(expense.id)}
                      >
                        <Icons.Delete className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
