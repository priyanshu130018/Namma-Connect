import React, { useState } from "react";
import { Star, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/services/marketplaceService";
import { BookingItem } from "@/types";

export interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingItem | null;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor (1 Star)",
  2: "Fair (2 Stars)",
  3: "Good (3 Stars)",
  4: "Very Good (4 Stars)",
  5: "Excellent (5 Stars)",
};

export function LeaveReviewModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: LeaveReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (rating < 1 || rating > 5) {
      setErrorMessage("Please select a valid rating between 1 and 5 stars.");
      return;
    }

    if (!comment.trim() || comment.trim().length < 3) {
      setErrorMessage("Please share at least a few words about your experience (min 3 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview(booking.service_id, {
        booking_id: booking.id,
        rating,
        comment: comment.trim(),
      });

      setSuccessMessage("Review submitted successfully.");
      setTimeout(() => {
        setIsSubmitting(false);
        setComment("");
        setRating(5);
        setSuccessMessage(null);
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Failed to submit review. Please check your network and try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Leave a Review"
      description={`Share your experience for ${booking.service_title}`}
      className="max-w-lg"
    >
      {successMessage ? (
        <div className="py-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{successMessage}</h3>
          <p className="text-xs text-slate-500">Thank you for supporting verified host families and fellow travelers!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Booking Summary */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900 line-clamp-1">{booking.service_title}</p>
              <p className="font-mono text-emerald-800 text-[11px] mt-0.5">#{booking.booking_code}</p>
            </div>
            <span className="font-bold text-[10px] uppercase bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full shadow-xs">
              Verified Stay
            </span>
          </div>

          {/* Star Rating Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Overall Rating <span className="text-rose-500">*</span>
            </label>
            <div
              className="flex items-center gap-2"
              role="radiogroup"
              aria-label="Star rating from 1 to 5"
            >
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isFilled = (hoverRating || rating) >= starVal;
                return (
                  <button
                    key={starVal}
                    type="button"
                    role="radio"
                    aria-checked={rating === starVal}
                    aria-label={`${starVal} star${starVal > 1 ? "s" : ""}`}
                    onClick={() => setRating(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 rounded-xl hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
                  >
                    <Star
                      className={`h-7 w-7 transition-all ${
                        isFilled
                          ? "fill-amber-400 text-amber-500 scale-110"
                          : "text-slate-300 hover:text-amber-300"
                      }`}
                    />
                  </button>
                );
              })}
              <span className="text-xs font-semibold text-slate-600 ml-2">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Written Review Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="review-comment"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              What was your experience like? <span className="text-rose-500">*</span>
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review... (Describe the agro-tour, host hospitality, local food, or stay comfort)"
              rows={4}
              required
              minLength={3}
              maxLength={1000}
              className="rounded-2xl border-slate-200 text-xs focus:ring-emerald-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
              <span>Minimum 3 characters</span>
              <span>{comment.length} / 1000</span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
              className="font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
            >
              <Star className="h-3.5 w-3.5 fill-white" />
              <span>Submit Review</span>
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
