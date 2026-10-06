import { Navigation, History, Clock } from "lucide-react";

export interface SearchPopoverProps {
  isOpen: boolean;
  onSelectGPS: () => void;
  onSelectQuery: (query: string) => void;
  recentSearches: string[];
  isLoadingRecent?: boolean;
  isLocating?: boolean;
  className?: string;
}

export function SearchPopover({
  isOpen,
  onSelectGPS,
  onSelectQuery,
  recentSearches,
  isLoadingRecent = false,
  isLocating = false,
  className = "",
}: SearchPopoverProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150 ${className}`}
    >
      {/* 1. GPS Current Location Action */}
      <div className="p-3">
        <button
          type="button"
          onClick={onSelectGPS}
          disabled={isLocating}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/70 transition-colors"
        >
          <Navigation className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`} />
          <span>{isLocating ? "Locating your GPS..." : "Use Current Location (GPS)"}</span>
        </button>
      </div>

      {/* 2. Recent Searches list */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <History className="h-3 w-3" />
          <span>Recent Searches</span>
        </div>

        {isLoadingRecent ? (
          <div className="px-3 py-2 text-xs text-slate-400">Loading recent searches...</div>
        ) : recentSearches.length > 0 ? (
          <div className="mt-1 space-y-1">
            {recentSearches.map((query, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuery(query)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{query}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-2 text-xs text-slate-400">No recent searches</div>
        )}
      </div>
    </div>
  );
}
