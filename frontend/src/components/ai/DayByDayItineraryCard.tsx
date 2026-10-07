import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  Compass,
  Utensils,
  Car,
  Star,
  RefreshCw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";

interface DayByDayItineraryCardProps {
  itinerary: AgentRunResponse["itinerary"];
  changedItems?: string[];
  onItemAction?: (action: "replace" | "remove" | "view", item: any) => void;
  onSelectService?: (serviceId: string) => void;
  className?: string;
}

export const DayByDayItineraryCard: React.FC<DayByDayItineraryCardProps> = ({
  itinerary,
  changedItems = [],
  onItemAction,
  onSelectService,
  className,
}) => {
  if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
    return null;
  }

  const getItemIcon = (category?: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("stay") || cat.includes("homestay") || cat.includes("resort")) {
      return <Home className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (cat.includes("food") || cat.includes("culinary") || cat.includes("walk")) {
      return <Utensils className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
    if (cat.includes("transport") || cat.includes("drive") || cat.includes("cab")) {
      return <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
    return <Compass className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
  };

  return (
    <div className={cn("space-y-4 my-3", className)}>
      {itinerary.days.map((day) => (
        <div
          key={day.day_number}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
        >
          {/* Day Header */}
          <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-extrabold text-[11px] tracking-wide">
                  DAY {day.day_number}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {day.title || "Scheduled Itinerary"}
                </h4>
              </div>
              {day.date && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3" />
                  <span>{day.date}</span>
                </div>
              )}
            </div>

            {day.estimated_day_cost !== undefined && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Day Total
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(day.estimated_day_cost)}
                </span>
              </div>
            )}
          </div>

          {/* Day Items List */}
          <div className="p-3 sm:p-4 space-y-2.5">
            {day.items.map((item) => {
              const isUpdated =
                changedItems.includes(item.id) ||
                changedItems.includes(item.service_id);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.service_id && onSelectService) {
                      onSelectService(item.service_id);
                    }
                  }}
                  className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative cursor-pointer group",
                    isUpdated
                      ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-400/50"
                      : "border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  {/* Updated Tag */}
                  {isUpdated && (
                    <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      UPDATED
                    </span>
                  )}

                  {/* Left: Timing & Icon */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                      {getItemIcon(item.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.start_time || "09:00"} – {item.end_time || "11:30"}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium capitalize">
                          {item.category?.replace(/-/g, " ") || "Activity"}
                        </span>
                      </div>

                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {item.title}
                      </h5>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        {item.location && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {item.location}
                          </span>
                        )}
                        {item.provider_name && (
                          <span className="truncate max-w-[130px] font-medium">
                            By {item.provider_name}
                          </span>
                        )}
                        {item.rating && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {item.rating}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/30 px-2 py-1 rounded-md mt-1.5 font-medium inline-block">
                          Why: {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Price & Quick Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.estimated_price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemAction?.("replace", item);
                        }}
                        className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 text-[10px] font-semibold flex items-center gap-1 shadow-2xs"
                        title="Swap with another activity"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Replace
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemAction?.("remove", item);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove from itinerary"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
