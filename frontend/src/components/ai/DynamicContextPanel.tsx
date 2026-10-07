import React from "react";
import {
  Calendar,
  Compass,
  CreditCard,
  PieChart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";
import { TripOverviewCard } from "./TripOverviewCard";
import { DayByDayItineraryCard } from "./DayByDayItineraryCard";
import { SearchResultCard } from "./SearchResultCard";
import { ComparisonCard } from "./ComparisonCard";
import { BudgetBreakdownCard } from "./BudgetBreakdownCard";
import { BookingStatusCard } from "./BookingStatusCard";
import { NammaMemoryCard } from "./NammaMemoryCard";

interface DynamicContextPanelProps {
  currentStep?: string;
  activeTab: "itinerary" | "marketplace" | "budget" | "booking";
  setActiveTab: (tab: "itinerary" | "marketplace" | "budget" | "booking") => void;
  itinerary: AgentRunResponse["itinerary"] | null;
  budget?: AgentRunResponse["budget"] | null;
  searchResults: AgentRunResponse["search_results"];
  bookingState: AgentRunResponse["booking_state"] | null;
  requirements: AgentRunResponse["extracted_requirements"] | null;
  changedItems: string[];
  savedServiceIds?: Set<string>;
  onSelectService?: (serviceId: string) => void;
  onAddToTrip?: (service: any) => void;
  onChooseComparison?: (item: any) => void;
  onItemAction?: (action: "replace" | "remove" | "view", item: any) => void;
  onPayNow?: () => void;
  isPaying?: boolean;
  onQuickPrompt?: (prompt: string) => void;
  className?: string;
}

export const DynamicContextPanel: React.FC<DynamicContextPanelProps> = ({
  activeTab,
  setActiveTab,
  itinerary,
  budget,
  searchResults,
  bookingState,
  requirements,
  changedItems,
  savedServiceIds = new Set(),
  onSelectService,
  onAddToTrip,
  onChooseComparison,
  onItemAction,
  onPayNow,
  isPaying = false,
  onQuickPrompt,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Dynamic Panel Header with Mode Tabs */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("itinerary")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              activeTab === "itinerary"
                ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Itinerary</span>
            {itinerary && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-extrabold">
                {itinerary.total_days || itinerary.days?.length || 0}d
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("marketplace")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              activeTab === "marketplace"
                ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Explore</span>
            {searchResults.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                {searchResults.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("budget")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              activeTab === "budget"
                ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>Budget</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("booking")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              activeTab === "booking"
                ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Checkout</span>
            {bookingState?.success && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {bookingState.payment_status === "PAID" ? "Paid" : "Reserved"}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: Itinerary & Daily Schedule */}
        {activeTab === "itinerary" && (
          <div className="space-y-4">
            {itinerary ? (
              <>
                <TripOverviewCard
                  itinerary={itinerary}
                  budget={budget}
                  requirements={requirements}
                  onViewDetailed={() => {}}
                  onCustomize={(prompt) => onQuickPrompt?.(prompt)}
                  onBookTrip={() => onQuickPrompt?.("Book this trip now")}
                />
                <DayByDayItineraryCard
                  itinerary={itinerary}
                  changedItems={changedItems}
                  onItemAction={onItemAction}
                  onSelectService={onSelectService}
                />
              </>
            ) : (
              <div className="text-center py-16 px-4 space-y-3">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Calendar className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Active Itinerary Loaded
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Ask Namma AI in the conversation to build a customized multi-day plan.
                </p>
                <Button
                  size="sm"
                  onClick={() => onQuickPrompt?.("Plan a 3-day Coorg trip for 2 people under ₹15,000")}
                  className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Plan Sample Coorg Trip
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Marketplace Search Results & Comparisons */}
        {activeTab === "marketplace" && (
          <div className="space-y-4">
            {searchResults.length > 0 && (
              <ComparisonCard
                items={searchResults.slice(0, 3)}
                onChooseItem={(item) => {
                  if (onChooseComparison) {
                    onChooseComparison(item);
                  } else {
                    onQuickPrompt?.(`Choose ${item.title} and add it to my itinerary`);
                  }
                }}
              />
            )}

            {searchResults.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2 text-slate-500">
                <Compass className="h-12 w-12 mx-auto mb-2 opacity-40 text-purple-500" />
                <p className="text-xs">No marketplace candidate listings retrieved yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickPrompt?.("Find quiet coffee plantation stays in Coorg")}
                  className="text-xs"
                >
                  Search Coorg Homestays
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.map((svc) => (
                  <SearchResultCard
                    key={svc.id}
                    service={svc}
                    isSaved={savedServiceIds.has(svc.id)}
                    onSelect={(s) => onQuickPrompt?.(`Select ${s.title} for this trip`)}
                    onAddToTrip={onAddToTrip}
                    onCardClick={onSelectService}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Budget Breakdown & Math */}
        {activeTab === "budget" && (
          <div className="space-y-4">
            <BudgetBreakdownCard
              budget={budget}
              requirements={requirements}
              onReviewAlternatives={() => onQuickPrompt?.("Make it cheaper and show alternatives")}
            />
            <NammaMemoryCard
              onQuickInterestClick={(prompt) => onQuickPrompt?.(prompt)}
            />
          </div>
        )}

        {/* Tab 4: Booking & Razorpay Checkout */}
        {activeTab === "booking" && (
          <div className="space-y-4">
            {bookingState ? (
              <BookingStatusCard
                bookingState={bookingState}
                isPaying={isPaying}
                onPayNow={onPayNow}
              />
            ) : (
              <div className="text-center py-16 px-4 space-y-3 text-slate-500">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-40 text-purple-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Active Booking Created
                </h4>
                <p className="text-xs max-w-xs mx-auto">
                  When you are satisfied with your itinerary, say &ldquo;Book it now&rdquo; to prepare your confirmed reservation.
                </p>
                <Button
                  size="sm"
                  onClick={() => onQuickPrompt?.("Book it now")}
                  className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Reserve Selected Trip
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
