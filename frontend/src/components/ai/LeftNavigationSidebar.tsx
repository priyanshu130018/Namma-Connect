import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Calendar,
  BookmarkPlus,
  BrainCircuit,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LeftNavigationSidebarProps {
  tripId: string | null;
  destination?: string;
  duration?: number;
  totalDays?: number;
  onNewChat: () => void;
  onOpenMemory?: () => void;
  className?: string;
}

export const LeftNavigationSidebar: React.FC<LeftNavigationSidebarProps> = ({
  tripId,
  destination,
  duration,
  totalDays,
  onNewChat,
  onOpenMemory,
  className,
}) => {
  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-slate-50/70 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-4 overflow-y-auto select-none",
        className
      )}
    >
      {/* New Trip Chat Button */}
      <Button
        type="button"
        onClick={onNewChat}
        className="w-full text-xs h-9 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs gap-1.5 justify-center"
      >
        <Plus className="h-4 w-4" />
        <span>New Trip Plan</span>
      </Button>

      {/* Active Conversation Section */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Active Workspace
        </span>

        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-purple-900 dark:text-purple-200">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="truncate">{destination ? `${destination} Journey` : "New Adventure"}</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 font-extrabold uppercase">
              Live
            </span>
          </div>
          <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 font-medium">
            {totalDays || duration || 2} Days Itinerary & Booking
          </p>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Saved Journeys & Trips
        </span>

        {tripId ? (
          <Link
            to="/app/my-trip"
            className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2 truncate">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Saved Itinerary ({destination || "Karnataka"})</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0" />
          </Link>
        ) : (
          <Link
            to="/app/my-trip"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 transition-all group"
          >
            <div className="flex items-center gap-2 truncate">
              <Clock className="h-4 w-4 text-slate-400 group-hover:text-purple-600" />
              <span className="truncate">All My Trips & Bookings</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        )}

        <Link
          to="/app/saved"
          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 transition-all group"
        >
          <div className="flex items-center gap-2 truncate">
            <BookmarkPlus className="h-4 w-4 text-slate-400 group-hover:text-purple-600" />
            <span className="truncate">Wishlist & Saved Places</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      </div>

      {/* Memory & Travel Preferences Button */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Traveler DNA
        </span>
        <button
          type="button"
          onClick={onOpenMemory}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all shadow-2xs group text-left"
        >
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Namma Memory</span>
              <span className="text-[10px] text-slate-400">Nature • Budget • Coffee</span>
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
        </button>
      </div>
    </aside>
  );
};
