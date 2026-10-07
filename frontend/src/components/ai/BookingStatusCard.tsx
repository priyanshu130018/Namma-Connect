import React from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { AgentRunResponse } from "@/services/aiService";

interface BookingStatusCardProps {
  bookingState: AgentRunResponse["booking_state"];
  isPaying?: boolean;
  onPayNow?: () => void;
  className?: string;
}

export const BookingStatusCard: React.FC<BookingStatusCardProps> = ({
  bookingState,
  isPaying = false,
  onPayNow,
  className,
}) => {
  if (!bookingState || !bookingState.success) return null;

  const isPaid = bookingState.payment_status === "PAID";
  const isCancelled = bookingState.status === "CANCELLED" || bookingState.action === "CANCELLED";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-4 p-4 sm:p-5 my-3",
        isPaid
          ? "border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-b from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900"
          : isCancelled
          ? "border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
          : "border-purple-200 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/30 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900",
        className
      )}
    >
      {/* Header Status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-xs",
              isPaid
                ? "bg-emerald-600"
                : isCancelled
                ? "bg-slate-600"
                : "bg-purple-600"
            )}
          >
            {isPaid ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : isCancelled ? (
              <Receipt className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {isPaid
                ? "🎉 Trip Booked & Confirmed!"
                : isCancelled
                ? "Booking Cancelled"
                : "Reservation Reserved — Awaiting Payment"}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {bookingState.service_title || "Verified Karnataka Experience"}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
            isPaid
              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
              : isCancelled
              ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
          )}
        >
          {isPaid ? "Paid" : isCancelled ? "Cancelled" : "Payment Pending"}
        </span>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 select-none">
        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Reserved</span>
        </div>
        <div className="h-0.5 flex-1 mx-2 bg-emerald-200 dark:bg-emerald-800" />
        <div
          className={cn(
            "flex items-center gap-1.5 font-bold",
            isPaid
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400 animate-pulse"
          )}
        >
          {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          <span>Payment</span>
        </div>
        <div
          className={cn(
            "h-0.5 flex-1 mx-2",
            isPaid ? "bg-emerald-200 dark:bg-emerald-800" : "bg-slate-200 dark:bg-slate-800"
          )}
        />
        <div
          className={cn(
            "flex items-center gap-1.5 font-bold",
            isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
          )}
        >
          {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          <span>Ready</span>
        </div>
      </div>

      {/* Details Box */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
        {bookingState.booking_code && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Booking ID:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {bookingState.booking_code}
            </span>
          </div>
        )}

        {bookingState.start_date && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Check-in Date:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {bookingState.start_date}
            </span>
          </div>
        )}

        {bookingState.guests_count && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Guests:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {bookingState.guests_count} Travelers
            </span>
          </div>
        )}

        {bookingState.total_amount !== undefined && (
          <div className="flex items-baseline justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400 font-bold">Total Paid / Due:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(bookingState.total_amount)}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!isPaid && !isCancelled && bookingState.payment_order_id && onPayNow && (
          <Button
            type="button"
            size="sm"
            onClick={onPayNow}
            disabled={isPaying}
            className="flex-1 min-w-[160px] text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm shadow-emerald-600/20"
          >
            <CreditCard className="h-4 w-4" />
            <span>
              {isPaying
                ? "Launching Gateway..."
                : `Pay ${formatCurrency(bookingState.total_amount || 0)} via Razorpay`}
            </span>
          </Button>
        )}

        <Link to="/app/my-trip" className="flex-1 min-w-[120px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs h-9 font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>View in My Trips</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
