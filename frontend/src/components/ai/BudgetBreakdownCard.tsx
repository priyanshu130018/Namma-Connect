import React from "react";
import {
  Home,
  Compass,
  Utensils,
  Car,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";

interface BudgetBreakdownCardProps {
  budget?: AgentRunResponse["budget"] | null;
  requirements?: AgentRunResponse["extracted_requirements"] | null;
  onReviewAlternatives?: () => void;
  className?: string;
}

export const BudgetBreakdownCard: React.FC<BudgetBreakdownCardProps> = ({
  budget,
  requirements,
  onReviewAlternatives,
  className,
}) => {
  if (!budget) return null;

  const total = budget.total || 0;
  const maxBudget = requirements?.max_budget || budget.max_budget;
  const isOverBudget = maxBudget ? total > maxBudget : false;
  const remaining = maxBudget ? maxBudget - total : null;

  const percentUsed = maxBudget ? Math.min(100, Math.round((total / maxBudget) * 100)) : 100;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3.5 my-2",
        isOverBudget
          ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/20"
          : "border-slate-200 dark:border-slate-800",
        className
      )}
    >
      {/* Header & Total */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Trip Budget Tracker
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatCurrency(total)}
            </span>
            {maxBudget && (
              <span className="text-xs font-semibold text-slate-500">
                / {formatCurrency(maxBudget)}
              </span>
            )}
          </div>
        </div>

        {maxBudget && (
          <div className="text-right">
            {isOverBudget ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formatCurrency(Math.abs(remaining || 0))} over budget
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {formatCurrency(remaining || 0)} remaining
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {maxBudget && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isOverBudget ? "bg-rose-500" : percentUsed > 85 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>
      )}

      {/* Category Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-1">
            <Home className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Stay</span>
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(budget.stay || 0)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-1">
            <Compass className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Activities</span>
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(budget.activities || 0)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-1">
            <Utensils className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Food (est)</span>
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(budget.food || 0)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-1">
            <Car className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Transport</span>
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(budget.transport || 0)}
          </span>
        </div>
      </div>

      {/* Over-budget optimization callout */}
      {isOverBudget && onReviewAlternatives && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
          <span className="text-xs text-rose-800 dark:text-rose-300 font-medium">
            Found cheaper stay and activity alternatives to stay under budget.
          </span>
          <Button
            type="button"
            size="sm"
            onClick={onReviewAlternatives}
            className="text-xs h-7 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 shrink-0"
          >
            <TrendingDown className="h-3 w-3" />
            Review Alternatives
          </Button>
        </div>
      )}
    </div>
  );
};
