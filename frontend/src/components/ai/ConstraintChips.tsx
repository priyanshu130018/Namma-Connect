import React from "react";
import { MapPin, Calendar, Users, IndianRupee, Sparkles } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";

interface ConstraintChipsProps {
  requirements: AgentRunResponse["extracted_requirements"] | null;
  onChipClick?: (promptText: string) => void;
  className?: string;
}

export const ConstraintChips: React.FC<ConstraintChipsProps> = ({
  requirements,
  onChipClick,
  className,
}) => {
  if (!requirements) return null;

  const {
    destination_district,
    duration_days,
    party_size,
    max_budget,
    preferred_categories = [],
    keywords = [],
  } = requirements;

  const hasAnyConstraint =
    destination_district ||
    duration_days ||
    party_size ||
    max_budget ||
    preferred_categories.length > 0 ||
    keywords.length > 0;

  if (!hasAnyConstraint) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 py-1 text-xs select-none",
        className
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-purple-500" />
        Preferences:
      </span>

      {/* Destination Chip */}
      {destination_district && (
        <button
          type="button"
          onClick={() => onChipClick?.(`Show top experiences in ${destination_district}`)}
          className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all font-medium text-[11px]"
          title="Click to view destination experiences"
        >
          <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>{destination_district}</span>
        </button>
      )}

      {/* Duration Chip */}
      {duration_days && (
        <button
          type="button"
          onClick={() => onChipClick?.(`Add another day to this ${duration_days} day trip`)}
          className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all font-medium text-[11px]"
          title="Click to extend duration"
        >
          <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span>{duration_days} {duration_days === 1 ? "Day" : "Days"}</span>
        </button>
      )}

      {/* Party Size Chip */}
      {party_size && (
        <button
          type="button"
          onClick={() => onChipClick?.(`Make it ${party_size + 1} people`)}
          className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all font-medium text-[11px]"
          title="Click to adjust guests"
        >
          <Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          <span>{party_size} {party_size === 1 ? "Traveler" : "Travelers"}</span>
        </button>
      )}

      {/* Budget Chip */}
      {max_budget && (
        <button
          type="button"
          onClick={() => onChipClick?.("Make it cheaper")}
          className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all font-medium text-[11px]"
          title="Click to optimize budget"
        >
          <IndianRupee className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>Cap: {formatCurrency(max_budget)}</span>
        </button>
      )}

      {/* Category / Keyword Tags */}
      {preferred_categories.map((cat: string, idx: number) => (
        <span
          key={`cat-${idx}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium capitalize"
        >
          {cat.replace(/-/g, " ")}
        </span>
      ))}

      {keywords.map((kw: string, idx: number) => (
        <span
          key={`kw-${idx}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-medium capitalize"
        >
          #{kw}
        </span>
      ))}
    </div>
  );
};
