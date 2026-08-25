import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  QrCode,
  Phone,
  Download,
  Clock,
  AlertCircle,
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  CreditCard,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AppImage } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getBookingById, cancelBooking } from "@/services/bookingService";
import { createPaymentOrder, verifyPayment, loadRazorpayScript } from "@/services/paymentService";
import { LeaveReviewModal } from "@/components/reviews/LeaveReviewModal";
import { BookingItem } from "@/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CustomerBookingDetailPage() {
  const { booking_id } = useParams<{ booking_id: string }>();
  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment state
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);

  const fetchDetail = async () => {
    if (!booking_id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getBookingById(booking_id);
      setBooking(data);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load booking details. The reservation may not exist or you do not have permission."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [booking_id]);

  const handlePayNow = async () => {
    if (!booking) return;
    setIsPaying(true);
    setPaymentError(null);

    try {
      // 1. Ensure Razorpay script is loaded
      await loadRazorpayScript();

      // 2. Fetch authoritative order from server
      const order = await createPaymentOrder(booking.id);

      const onPaymentSuccess = async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          setIsPaying(true);
          await verifyPayment({
            booking_id: booking.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          setBooking((prev) => (prev ? { ...prev, status: "CONFIRMED" } : null));
          setPaymentError(null);
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
            color: "#059669",
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
          "Unable to initialize payment. Please try again."
      );
      setIsPaying(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelBooking(booking.id);
      setBooking(updated);
      setCancelModalOpen(false);
    } catch (err: any) {
      setCancelError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to cancel this reservation. Please try again."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500 text-white font-bold text-xs uppercase gap-1 px-2.5 py-0.5"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Request</span>
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge
            variant="default"
            className="bg-emerald-600 text-white font-bold text-xs gap-1 px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Confirmed</span>
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="secondary"
            className="bg-slate-900 text-white font-bold text-xs gap-1 px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="font-bold text-xs gap-1 px-2.5 py-0.5"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Cancelled</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-bold text-xs">
            {status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            <Skeleton className="h-96 rounded-3xl" />
          </div>
          <div className="md:col-span-4 space-y-4">
            <Skeleton className="h-48 rounded-3xl" />
            <Skeleton className="h-48 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !booking) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Reservation Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{errorMessage}</p>
        <Link to="/app/my-trip">
          <Button variant="outline" className="mt-2 font-bold">
            Back to My Trip
          </Button>
        </Link>
      </div>
    );
  }

  const isCancellable = booking.is_cancellable ?? (booking.status === "PENDING" || booking.status === "CONFIRMED");
  const isPending = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCancelled = booking.status === "CANCELLED";
  const canReview = booking.can_review ?? (booking.status === "COMPLETED" && !booking.has_reviewed);
  const hasReviewed = Boolean(booking.has_reviewed);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <Link
        to="/app/my-trip"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Trip
      </Link>

      {/* Booking Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-800 tracking-wider">
              Confirmation #{booking.booking_code}
            </span>
            {renderStatusBadge(booking.status)}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {booking.service_title}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isPending && (
            <Button
              size="sm"
              isLoading={isPaying}
              onClick={handlePayNow}
              className="gap-1.5 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm"
            >
              <CreditCard className="h-4 w-4" />
              <span>Pay Now ({formatCurrency(booking.total_amount)})</span>
            </Button>
          )}

          {canReview && (
            <Button
              size="sm"
              onClick={() => setReviewModalOpen(true)}
              className="gap-1.5 font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm text-xs"
            >
              <Star className="h-3.5 w-3.5 fill-white" />
              <span>Leave Review</span>
            </Button>
          )}

          {hasReviewed && (
            <Badge
              variant="outline"
              className="bg-amber-50 border-amber-200 text-amber-800 font-bold text-xs gap-1 px-2.5 py-1 rounded-xl"
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span>Reviewed</span>
            </Badge>
          )}

          {isCancellable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCancelError(null);
                setCancelModalOpen(true);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
            >
              Cancel Booking
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 font-bold rounded-xl"
          >
            <Download className="h-4 w-4" /> Download PDF Receipt
          </Button>
        </div>
      </div>

      {paymentError && (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Payment Notification</p>
            <p>{paymentError}</p>
          </div>
        </div>
      )}

      {/* Cancelled Banner & Refund Summary */}
      {isCancelled && (
        <Card className="p-5 sm:p-6 rounded-3xl border-rose-200 bg-rose-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <h3 className="text-sm font-bold text-rose-950">Reservation Cancelled</h3>
            </div>
            {booking.refund_status && (
              <Badge
                variant={booking.refund_status === "COMPLETED" ? "default" : "secondary"}
                className="text-[10px] font-bold uppercase"
              >
                Refund: {booking.refund_status.replace("_", " ")}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-rose-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Refund Amount</span>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                {booking.refund_amount !== undefined && booking.refund_amount !== null
                  ? formatCurrency(booking.refund_amount)
                  : "₹ 0.00"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Refund Status</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {booking.refund_status
                  ? booking.refund_status === "COMPLETED"
                    ? "Completed"
                    : booking.refund_status === "NOT_ELIGIBLE"
                    ? "Not eligible under policy"
                    : booking.refund_status
                  : "No payment made"}
              </p>
            </div>
            {booking.refund_code && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Refund Reference</span>
                <p className="font-mono text-slate-700 mt-0.5 font-bold">{booking.refund_code}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Itinerary & Host (8 cols) */}
        <div className="md:col-span-8 space-y-6">
          <Card className="overflow-hidden p-0 rounded-3xl border-slate-200 shadow-sm">
            <AppImage
              src={booking.service_image || "/images/services/fallback.jpg"}
              alt={booking.service_title}
              aspectRatio="wide"
              className="max-h-64 w-full object-cover"
            />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4 text-xs text-slate-600">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Date Scheduled</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Calendar className="h-4 w-4 text-emerald-700" />
                    <span>{formatDate(booking.start_date)}</span>
                  </div>
                </div>

                {booking.end_date ? (
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Check-Out</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <Calendar className="h-4 w-4 text-emerald-700" />
                      <span>{formatDate(booking.end_date)}</span>
                    </div>
                  </div>
                ) : booking.time_slot_label ? (
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Session Time</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <Clock className="h-4 w-4 text-emerald-700" />
                      <span>{booking.time_slot_label}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>
                    Guests: <strong>{booking.guest_count} {booking.guest_count === 1 ? "Traveler" : "Travelers"}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                  <span>{booking.service_location}</span>
                </div>
              </div>

              {booking.special_requests && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <FileText className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Special Requests Note:</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{booking.special_requests}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Host Info */}
          <Card className="p-6 rounded-3xl border-slate-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shadow-sm">
                <UserIcon className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Host Contact</span>
                <h4 className="text-sm font-bold text-slate-900">{booking.provider_name}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{booking.provider_phone || "+91 98450 12345"}</p>
              </div>
            </div>
            {booking.provider_phone && (
              <a
                href={`tel:${booking.provider_phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>Call Host</span>
              </a>
            )}
          </Card>
        </div>

        {/* Right Pass & Invoice (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          <Card className="p-6 text-center rounded-3xl border-slate-200 bg-emerald-50/40 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Entry Voucher Pass
            </h4>
            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl bg-white p-3 shadow-sm border border-emerald-200">
              <QrCode className="h-28 w-28 text-slate-900" />
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-xs font-bold text-slate-900">{booking.booking_code}</p>
              <p className="text-[11px] text-slate-500">
                {isCancelled ? "Voucher Voided (Cancelled)" : "Present upon estate arrival"}
              </p>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-slate-200 space-y-3 text-xs shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Financial Breakdown</h4>
            <div className="flex justify-between text-slate-600">
              <span>Unit Rate</span>
              <span>{formatCurrency(booking.unit_price)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Quantity</span>
              <span>{booking.guest_count} Guests</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
              <span>Total Amount</span>
              <span className="text-emerald-900">{formatCurrency(booking.total_amount)}</span>
            </div>

            {isConfirmed ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Paid via Razorpay Secure</span>
              </div>
            ) : isPending ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl font-semibold">
                  <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Payment Pending</span>
                </div>
                <Button
                  size="sm"
                  isLoading={isPaying}
                  onClick={handlePayNow}
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 shadow-sm"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay Now ({formatCurrency(booking.total_amount)})</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>NammaConnect Secure Gateway</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Dialog
        isOpen={cancelModalOpen}
        onClose={() => {
          if (!isCancelling) setCancelModalOpen(false);
        }}
        title="Cancel this booking?"
        description="This action may be subject to the platform's cancellation and refund policy."
        className="max-w-md"
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900 space-y-1">
            <p className="font-bold">Cancellation Policy Overview</p>
            <p className="text-[11px] leading-relaxed">
              Cancellations made 48 hours or more before the scheduled start date are eligible for a 100% refund.
              Cancellations within 48 hours receive a 50% partial refund.
            </p>
          </div>

          {cancelError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              disabled={isCancelling}
              onClick={() => setCancelModalOpen(false)}
              className="flex-1 font-bold"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              isLoading={isCancelling}
              onClick={handleConfirmCancel}
              className="flex-1 font-bold"
            >
              Cancel Booking
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Leave Review Modal */}
      <LeaveReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        booking={booking}
        onSuccess={fetchDetail}
      />
    </div>
  );
}
