import React from "react";
import {
  Sparkles,
  Calendar,
  Users,
  Compass,
  Home,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  TrendingDown,
  Plus,
  RefreshCw,
  Trash2,
  MapPin,
  Clock,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";

interface TripOverviewCardProps {
  itinerary: AgentRunResponse["itinerary"];
  budget?: AgentRunResponse["budget"] | null;
  requirements?: AgentRunResponse["extracted_requirements"] | null;
  tripId?: string | null;
  onViewDetailed?: () => void;
  onCustomize?: (prompt: string) => void;
  onBookTrip?: () => void;
  className?: string;
}

export const TripOverviewCard: React.FC<TripOverviewCardProps> = ({
  itinerary,
  budget,
  requirements,
  tripId,
  onViewDetailed,
  onCustomize,
  onBookTrip,
  className,
}) => {
  if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
    return null;
  }

  const totalDays = itinerary.total_days || itinerary.days.length;
  const partySize = requirements?.party_size || 2;
  const destination = requirements?.destination_district || "Karnataka";
  const totalCost = itinerary.total_estimated_cost || 0;
  const maxBudget = requirements?.max_budget || budget?.max_budget;
  const isWithinBudget = maxBudget ? totalCost <= maxBudget : true;

  const getItemIcon = (cat?: string, title?: string) => {
    const text = `${cat || ""} ${title || ""}`.toLowerCase();
    if (text.includes("stay") || text.includes("hotel") || text.includes("resort") || text.includes("cottage") || text.includes("homestay")) {
      return <Home className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
    if (text.includes("food") || text.includes("dinner") || text.includes("lunch") || text.includes("culinary") || text.includes("meal")) {
      return <Utensils className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    return <Compass className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-purple-200/90 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/60 via-white to-purple-50/30 dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 shadow-sm space-y-4 my-2 text-left select-text",
        className
      )}
    >
      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-100 dark:border-purple-900/40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Trip Overview: {destination}
              </h3>
              {tripId && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  ID: {tripId.slice(0, 8)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                {totalDays} {totalDays === 1 ? "Day" : "Days"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                {partySize} {partySize === 1 ? "Traveler" : "Travelers"}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Estimated Total</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatCurrency(totalCost)}
            </div>
            {maxBudget && (
              <div className="flex items-center gap-1 justify-end text-[11px]">
                {isWithinBudget ? (
                  <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Within Budget
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-3 w-3" />
                    {formatCurrency(totalCost - maxBudget)} over
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Day-by-Day Structured Cards ── */}
      <div className="space-y-3">
        {itinerary.days.map((day) => (
          <div
            key={day.day_number}
            className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-2.5 transition-all hover:border-purple-300 dark:hover:border-purple-700"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  DAY {day.day_number}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {day.title || `Day ${day.day_number} Exploration`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {day.estimated_day_cost !== undefined && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(day.estimated_day_cost)}
                  </span>
                )}
              </div>
            </div>

            {/* Day Items List */}
            <div className="space-y-2 pt-1">
              {day.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">{getItemIcon(item.category, item.title)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {(item.start_time || item.end_time) && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {item.start_time} - {item.end_time}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="h-2.5 w-2.5" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Per-Item Inline Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      {formatCurrency(item.estimated_price)}
                    </span>
                    {onCustomize && (
                      <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => onCustomize(`Replace "${item.title}" with another option`)}
                          className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-colors"
                          title={`Replace ${item.title}`}
                          aria-label={`Replace ${item.title}`}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onCustomize(`Remove "${item.title}"`)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          title={`Remove ${item.title}`}
                          aria-label={`Remove ${item.title}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Per-Day Contextual Quick Actions */}
            {onCustomize && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onCustomize(`Make Day ${day.day_number} cheaper`)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors"
                >
                  <TrendingDown className="h-2.5 w-2.5" />
                  <span>Make Day {day.day_number} Cheaper</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCustomize(`Add a local food experience to Day ${day.day_number}`)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" />
                  <span>Add Local Food</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Budget Summary Breakdown ── */}
      {budget && (
        <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
            <Tag className="h-3 w-3 text-purple-600" />
            Budget Breakdown:
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
            {budget.stay !== undefined && <span>Stays: <b>{formatCurrency(budget.stay)}</b></span>}
            {budget.activities !== undefined && <span>Activities: <b>{formatCurrency(budget.activities)}</b></span>}
            <span>Total: <b className="text-purple-700 dark:text-purple-300">{formatCurrency(totalCost)}</b></span>
          </div>
        </div>
      )}

      {/* ── Global Interactive Actions Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-100 dark:border-purple-900/40">
        <div className="flex flex-wrap items-center gap-1.5">
          {onCustomize && (
            <>
              <button
                type="button"
                onClick={() => onCustomize("Make this trip cheaper and reduce the budget")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-2xs"
              >
                <TrendingDown className="h-3 w-3 text-emerald-600" />
                <span>Make Cheaper</span>
              </button>

              <button
                type="button"
                onClick={() => onCustomize("Add a local food experience")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-2xs"
              >
                <Plus className="h-3 w-3 text-amber-600" />
                <span>Add Local Food</span>
              </button>

              <button
                type="button"
                onClick={() => onCustomize("Change my hotel")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-2xs"
              >
                <Home className="h-3 w-3 text-blue-600" />
                <span>Change Hotel</span>
              </button>

              <button
                type="button"
                onClick={() => onCustomize("Show me another option for activity")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-2xs"
              >
                <RefreshCw className="h-3 w-3 text-purple-600" />
                <span>Show Alternatives</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onViewDetailed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewDetailed}
              className="text-xs h-8 font-bold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>View Trip</span>
            </Button>
          )}

          {onBookTrip && (
            <Button
              type="button"
              size="sm"
              onClick={onBookTrip}
              className="text-xs h-8 font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm shadow-purple-600/20"
            >
              <span>Proceed to Book</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
