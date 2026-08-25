import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  CreditCard,
  Lock,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/image";
import { formatCurrency } from "@/lib/utils";
import { createBooking } from "@/services/bookingService";
import { createPaymentOrder, verifyPayment, loadRazorpayScript } from "@/services/paymentService";
import { MarketplaceService, TimeSlot, BookingItem, PaymentVerificationResult } from "@/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface BookingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: MarketplaceService;
  startDate: string;
  endDate?: string;
  selectedSlot?: TimeSlot | null;
}

export function BookingReviewModal({
  isOpen,
  onClose,
  service,
  startDate,
  endDate,
  selectedSlot,
}: BookingReviewModalProps) {
  const navigate = useNavigate();

  const [guestCount, setGuestCount] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Post-Creation Payment State
  const [createdBooking, setCreatedBooking] = useState<BookingItem | null>(null);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState<PaymentVerificationResult | null>(null);

  // Max guests calculation
  const maxGuests = Math.min(
    service.max_capacity || 10,
    selectedSlot?.remaining_capacity || service.max_capacity || 10
  );

  // Nights calculation for stays
  let nights = 1;
  if (endDate && startDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    nights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
  }

  // Estimated price calculation
  const isStay = service.category_slug === "stay";
  const estimatedPrice = isStay
    ? service.price * nights
    : service.unit === "person"
    ? service.price * guestCount
    : service.price;

  const handleIncrementGuests = () => {
    if (guestCount < maxGuests) {
      setGuestCount((prev) => prev + 1);
    }
  };

  const handleDecrementGuests = () => {
    if (guestCount > 1) {
      setGuestCount((prev) => prev - 1);
    }
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const slotLabel = selectedSlot
        ? `${selectedSlot.start_time} – ${selectedSlot.end_time}`
        : undefined;

      const booking = await createBooking({
        service_id: service.id,
        start_date: startDate,
        end_date: endDate || undefined,
        time_slot_id: selectedSlot?.id || undefined,
        time_slot_label: slotLabel,
        guest_count: guestCount,
        special_requests: specialRequests.trim() || undefined,
      });

      setCreatedBooking(booking);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Unable to create booking reservation. Please check availability and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!createdBooking) return;
    setIsPaying(true);
    setPaymentError(null);

    try {
      // 1. Ensure Razorpay checkout script is loaded
      await loadRazorpayScript();

      // 2. Fetch authoritative Razorpay Order from server
      const order = await createPaymentOrder(createdBooking.id);

      // 3. Razorpay Checkout Handler
      const onPaymentSuccess = async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          setIsPaying(true);
          const verification = await verifyPayment({
            booking_id: createdBooking.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          setConfirmedPayment(verification);
          setCreatedBooking((prev) => (prev ? { ...prev, status: "CONFIRMED" } : null));
        } catch (err: any) {
          setPaymentError(
            err.response?.data?.detail ||
              err.message ||
              "Payment verification failed. Please contact host helpline."
          );
        } finally {
          setIsPaying(false);
        }
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: "NammaConnect Agro-Tourism",
          description: `Booking #${order.booking_code} - ${order.service_title}`,
          order_id: order.order_id,
          prefill: {
            name: order.customer_name,
            email: order.customer_email,
            contact: order.customer_phone,
          },
          theme: {
            color: "#166534",
          },
          handler: onPaymentSuccess,
          modal: {
            ondismiss: () => {
              setIsPaying(false);
              setPaymentError("Payment was not completed. You can try again.");
            },
          },
        });
        rzp.open();
      } else if (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test") {
        // Safe unit testing mock handler
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSignature = "mock_sig_123456";
        await onPaymentSuccess({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
        });
      } else {
        throw new Error(
          "Unable to load Razorpay payment gateway checkout. Please check your internet connection or disable ad-blockers and try again."
        );
      }
    } catch (err: any) {
      setPaymentError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to initialize payment gateway. Please try again."
      );
      setIsPaying(false);
    }
  };

  const handleCloseAndReset = () => {
    setCreatedBooking(null);
    setConfirmedPayment(null);
    setErrorMessage(null);
    setPaymentError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCloseAndReset}
      title={
        confirmedPayment
          ? "Payment Successful & Booking Confirmed"
          : createdBooking
          ? "Reservation Request Queued"
          : "Review Your Reservation"
      }
      description={
        confirmedPayment
          ? "Your payment was verified via Razorpay. Your reservation is 100% confirmed."
          : createdBooking
          ? "Complete payment to guarantee your stay or experience."
          : "Verify schedule, guests, and estimated breakdown before submitting your booking request."
      }
      className="max-w-xl"
    >
      {/* ── 1. Confirmed Payment & Booking Success View ── */}
      {confirmedPayment && createdBooking ? (
        <div className="space-y-5 py-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Payment Verified & Booking Confirmed
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              {createdBooking.booking_code}
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Status:{" "}
              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase font-mono font-bold">
                CONFIRMED
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-2 text-slate-700">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex justify-between">
              <span>{createdBooking.service_title}</span>
              <span className="text-emerald-700 font-bold">Paid: {formatCurrency(confirmedPayment.amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Dates</span>
                <strong>
                  {createdBooking.start_date}{" "}
                  {createdBooking.end_date ? `to ${createdBooking.end_date}` : ""}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Travelers</span>
                <strong>{createdBooking.guest_count} Guests</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Transaction ID</span>
                <strong className="font-mono text-slate-800">{confirmedPayment.payment_id}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Security</span>
                <span className="text-emerald-700 font-semibold">Razorpay Verified</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-bold"
              onClick={handleCloseAndReset}
            >
              Close
            </Button>
            <Button
              className="flex-1 font-bold gap-2 bg-harvest-600 hover:bg-harvest-700 text-white"
              onClick={() => {
                handleCloseAndReset();
                navigate("/app/my-trip");
              }}
            >
              <span>View in My Trip</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : createdBooking ? (
        /* ── 2. Pending Booking & Payment Action View ── */
        <div className="space-y-5 py-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
            <Clock className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Reservation Pending Payment
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              {createdBooking.booking_code}
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Status:{" "}
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase font-mono">
                PENDING
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-2 text-slate-700">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              {createdBooking.service_title}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Dates</span>
                <strong>
                  {createdBooking.start_date}{" "}
                  {createdBooking.end_date ? `to ${createdBooking.end_date}` : ""}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Travelers</span>
                <strong>{createdBooking.guest_count} Guests</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Authoritative Total</span>
                <strong className="text-slate-900 text-xs">
                  {formatCurrency(createdBooking.total_amount)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Gateway</span>
                <span className="text-slate-700 font-medium">Razorpay 256-bit Secure</span>
              </div>
            </div>
          </div>

          {paymentError && (
            <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 text-left">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <p>{paymentError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-bold"
              onClick={handleCloseAndReset}
            >
              Pay Later
            </Button>
            <Button
              isLoading={isPaying}
              onClick={handleInitiatePayment}
              className="flex-1 font-bold gap-2 bg-harvest-600 hover:bg-harvest-700 text-white shadow-md"
            >
              <CreditCard className="h-4 w-4" />
              <span>Pay Now ({formatCurrency(createdBooking.total_amount)})</span>
            </Button>
          </div>
        </div>
      ) : (
        /* ── 3. Booking Review & Confirmation Form ── */
        <div className="space-y-5 py-2">
          {/* Service Summary Card */}
          <div className="flex gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-200">
              <AppImage
                src={service.primary_image}
                alt={service.title}
                aspectRatio="auto"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-harvest-800 font-bold">
                <Sparkles className="h-3 w-3" />
                <span>{service.category}</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 leading-snug">
                {service.title}
              </h4>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3 text-harvest-700" />
                <span className="truncate">{service.location}</span>
              </div>
            </div>
          </div>

          {/* Schedule Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs text-slate-700 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-semibold">
                <Calendar className="h-4 w-4 text-harvest-700" />
                <span>
                  Date: {startDate} {endDate ? `to ${endDate} (${nights} nights)` : ""}
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Available
              </span>
            </div>

            {selectedSlot && (
              <div className="flex items-center gap-2 pt-1 font-semibold text-slate-800">
                <Clock className="h-4 w-4 text-harvest-700" />
                <span>
                  Slot: {selectedSlot.start_time} – {selectedSlot.end_time}
                </span>
              </div>
            )}
          </div>

          {/* Guest Count Selector */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div>
              <label className="text-xs font-bold text-slate-900 block">Number of Guests</label>
              <span className="text-[11px] text-slate-400">Max capacity: {maxGuests}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={guestCount <= 1 || isSubmitting}
                onClick={handleDecrementGuests}
                aria-label="Decrease guests"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-5 text-center text-sm font-bold text-slate-900">
                {guestCount}
              </span>
              <button
                type="button"
                disabled={guestCount >= maxGuests || isSubmitting}
                onClick={handleIncrementGuests}
                aria-label="Increase guests"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Special Requests or Dietary Preferences (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Vegetarian food preference, early arrival note..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-harvest-600 shadow-sm resize-none"
            />
          </div>

          {/* Pricing Calculation Summary */}
          <div className="rounded-2xl bg-harvest-50/70 border border-harvest-100 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Rate ({service.unit})</span>
              <span>{formatCurrency(service.price)}</span>
            </div>
            {isStay && nights > 1 && (
              <div className="flex justify-between text-slate-600">
                <span>Duration</span>
                <span>{nights} nights</span>
              </div>
            )}
            {!isStay && service.unit === "person" && guestCount > 1 && (
              <div className="flex justify-between text-slate-600">
                <span>Quantity</span>
                <span>{guestCount} travelers</span>
              </div>
            )}
            <div className="flex justify-between border-t border-harvest-200 pt-2 text-sm font-extrabold text-slate-900">
              <span>Payable Amount</span>
              <span className="text-harvest-900">{formatCurrency(estimatedPrice)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-harvest-800 font-semibold pt-1">
              <Lock className="h-3.5 w-3.5 text-harvest-700 shrink-0" />
              <span>Direct Razorpay Gateway. 95% settlement to local farmer.</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseAndReset}
              disabled={isSubmitting}
              className="flex-1 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={isSubmitting}
              onClick={handleConfirmBooking}
              className="flex-1 font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-md"
            >
              Confirm Booking Request
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
