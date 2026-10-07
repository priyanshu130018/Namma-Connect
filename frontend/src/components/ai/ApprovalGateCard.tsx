import React from "react";
import {
  ShieldCheck,
  Check,
  X,
  Compass,
  Home,
  Utensils,
  Calendar,
  Users,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";

interface ApprovalGateCardProps {
  prompt: string;
  requirements?: AgentRunResponse["extracted_requirements"] | null;
  itinerary?: AgentRunResponse["itinerary"] | null;
  budget?: AgentRunResponse["budget"] | null;
  onApprove: () => void;
  onDecline: () => void;
  onKeepSearching?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const ApprovalGateCard: React.FC<ApprovalGateCardProps> = ({
  prompt,
  requirements,
  itinerary,
  budget,
  onApprove,
  onDecline,
  isLoading = false,
  className,
}) => {
  const destination = requirements?.destination_district || "Karnataka";
  const duration = requirements?.duration_days || itinerary?.total_days || 2;
  const partySize = requirements?.party_size || 2;
  const totalCost = itinerary?.total_estimated_cost || budget?.total || 0;

  // Extract Stays vs Activities from itinerary
  const allItems = itinerary?.days?.flatMap((d) => d.items) || [];
  const stays = allItems.filter((it) =>
    it.category?.toLowerCase().includes("stay") ||
    it.category?.toLowerCase().includes("homestay") ||
    it.category?.toLowerCase().includes("hotel") ||
    it.category?.toLowerCase().includes("resort")
  );
  const activities = allItems.filter((it) => !stays.includes(it));

  return (
    <div
      className={cn(
        "rounded-2xl border border-purple-300 dark:border-purple-800 bg-gradient-to-b from-purple-50/80 via-white to-purple-50/40 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 shadow-sm space-y-4 my-3 text-left select-text",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-200 dark:border-purple-900/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Ready to Confirm & Book</span>
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {prompt || "Please review your booking summary and confirm to create your reservation."}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold uppercase tracking-wider border border-purple-200 dark:border-purple-800">
          Booking Review
        </span>
      </div>

      {/* Structured Booking Summary */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3 text-xs">
        {/* Destination & Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-purple-600" />
              {destination}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3 text-purple-600" />
              {duration} Days
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Travelers</span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
              <Users className="h-3 w-3 text-purple-600" />
              {partySize} {partySize === 1 ? "Traveler" : "Travelers"}
            </span>
          </div>
        </div>

        {/* Stays List */}
        {stays.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Stay</span>
            {stays.map((s, idx) => (
              <div key={s.id || idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 truncate">
                  <Home className="h-3 w-3 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.title}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                  {formatCurrency(s.estimated_price)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activities List */}
        {activities.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Activities & Experiences</span>
            {activities.map((a, idx) => (
              <div key={a.id || idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 truncate">
                  {a.category?.toLowerCase().includes("food") ? (
                    <Utensils className="h-3 w-3 text-amber-600 shrink-0" />
                  ) : (
                    <Compass className="h-3 w-3 text-emerald-600 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{a.title}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                  {formatCurrency(a.estimated_price)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Total Cost Row */}
        <div className="flex items-baseline justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700">
          <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">Total Amount</span>
          <span className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300">
            {formatCurrency(totalCost)}
          </span>
        </div>
      </div>

      {/* Action Confirmation Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 min-w-[140px] text-xs h-9 font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm shadow-purple-600/20"
        >
          <Check className="h-4 w-4" />
          <span>Confirm & Pay</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDecline}
          disabled={isLoading}
          className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          <span>Not Now</span>
        </Button>
      </div>
    </div>
  );
};
