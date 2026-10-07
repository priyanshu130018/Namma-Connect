import React from "react";
import {
  Star,
  MapPin,
  CheckCircle2,
  BookmarkPlus,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";

interface SearchResultCardProps {
  service: AgentRunResponse["search_results"][0];
  isSaved?: boolean;
  onSelect?: (service: any) => void;
  onAddToTrip?: (service: any) => void;
  onCardClick?: (serviceId: string) => void;
  className?: string;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  service,
  isSaved = false,
  onSelect,
  onAddToTrip,
  onCardClick,
  className,
}) => {
  const fallbackImage =
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick?.(service.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick?.(service.id);
        }
      }}
      className={cn(
        "group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500",
        className
      )}
    >
      <div>
        {/* Thumbnail Image Header */}
        <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={service.primary_image || fallbackImage}
            alt={service.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider shadow-xs">
              {service.category || "Experience"}
            </span>

            {service.rating && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-xs">
                <Star className="h-3 w-3 fill-slate-950" />
                {service.rating}
              </span>
            )}
          </div>

          {/* Bottom Overlay Info */}
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white">
            {service.district && (
              <span className="text-[11px] font-medium flex items-center gap-1 drop-shadow-sm">
                <MapPin className="h-3 w-3 text-emerald-400" />
                {service.district}
              </span>
            )}
            {service.available !== false && (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-full backdrop-blur-xs">
                Available
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {service.title}
            </h4>
          </div>

          {service.provider_name && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>Hosted by {service.provider_name}</span>
            </p>
          )}

          {/* Amenities & Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Breakfast
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Free Cancellation
            </span>
          </div>

          {/* Pricing */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Price
            </span>
            <div className="text-right">
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(service.price)}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">/ person</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Strip */}
      <div className="p-3 pt-0 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/60 mt-1">
        {onAddToTrip && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToTrip(service);
            }}
            className={cn(
              "flex-1 text-[11px] h-8 font-semibold gap-1",
              isSaved
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400"
            )}
          >
            {isSaved ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="h-3 w-3" />
                <span>Add to Trip</span>
              </>
            )}
          </Button>
        )}

        {onSelect && (
          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(service);
            }}
            className="flex-1 text-[11px] h-8 font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1 shadow-xs"
          >
            <span>Select</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
