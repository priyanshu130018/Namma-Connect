import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  MapPin,
  QrCode,
  Phone,
  ArrowUpRight,
  Compass,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  User as UserIcon,
  Star,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { AppImage } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCustomerBookings, cancelBooking } from "@/services/bookingService";
import { LeaveReviewModal } from "@/components/reviews/LeaveReviewModal";
import { BookingItem } from "@/types";

export function CustomerMyTripPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined" && window.location.pathname.endsWith("/history")) return "completed";
    if (typeof window !== "undefined" && window.location.pathname.endsWith("/cancelled")) return "cancelled";
    return "upcoming";
  });

  useEffect(() => {
    if (location.pathname.endsWith("/history")) {
      setActiveTab("completed");
    } else if (location.pathname.endsWith("/cancelled")) {
      setActiveTab("cancelled");
    } else if (location.pathname.endsWith("/bookings") || location.pathname.endsWith("/trip") || location.pathname.endsWith("/my-trip")) {
      setActiveTab("upcoming");
    }
  }, [location.pathname]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);

  const loadBookings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getCustomerBookings();
      setBookings(data.bookings || []);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load your trip reservations. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const upcomingBookings = bookings.filter(
    (b) => b.status === "PENDING" || b.status === "CONFIRMED"
  );
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const cancelledBookings = bookings.filter((b) => b.status === "CANCELLED");

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(selectedBooking.id);
      setCancelModalOpen(false);
      setSelectedBooking(null);
      await loadBookings();
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
            className="bg-amber-500 text-white border-0 shadow-sm font-bold text-[11px] gap-1 px-2.5 py-0.5"
          >
            <Clock className="h-3 w-3" />
            <span>Pending Request</span>
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge
            variant="default"
            className="bg-emerald-600 text-white border-0 shadow-sm font-bold text-[11px] gap-1 px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Confirmed</span>
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="secondary"
            className="bg-slate-900 text-white border-0 shadow-sm font-bold text-[11px] gap-1 px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="shadow-sm font-bold text-[11px] gap-1 px-2.5 py-0.5"
          >
            <XCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px] font-bold">
            {status}
          </Badge>
        );
    }
  };

  const renderBookingCard = (booking: BookingItem) => {
    const isCancellable = booking.status === "PENDING" || booking.status === "CONFIRMED";
    const canReview = booking.can_review ?? (booking.status === "COMPLETED" && !booking.has_reviewed);
    const hasReviewed = Boolean(booking.has_reviewed);

    return (
      <Card
        key={booking.id}
        className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Photo Column */}
          <div className="md:col-span-4 relative min-h-[180px] bg-slate-100">
            <AppImage
              src={booking.service_image || "/images/services/fallback.jpg"}
              alt={booking.service_title}
              aspectRatio="auto"
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-3">
              {renderStatusBadge(booking.status)}
            </div>
          </div>

          {/* Content Details Column */}
          <div className="md:col-span-8 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-800 tracking-wider">
                    {booking.booking_code}
                  </span>
                  {booking.status === "CANCELLED" && booking.refund_status && (
                    <Badge
                      variant={booking.refund_status === "COMPLETED" ? "default" : "secondary"}
                      className="text-[10px] font-bold"
                    >
                      Refund: {booking.refund_status.replace("_", " ")}
                    </Badge>
                  )}
                </div>
                <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  {booking.guest_count} {booking.guest_count === 1 ? "Guest" : "Guests"}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {booking.service_title}
              </h3>

              <div className="flex items-center gap-1 text-xs text-slate-600">
                <UserIcon className="h-3.5 w-3.5 text-harvest-700 shrink-0" />
                <span className="font-medium">Host: {booking.provider_name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-harvest-700 shrink-0" />
                  <span>
                    {formatDate(booking.start_date)}
                    {booking.end_date ? ` – ${formatDate(booking.end_date)}` : ""}
                  </span>
                </div>
                {booking.time_slot_label && (
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-harvest-700 shrink-0" />
                    <span>{booking.time_slot_label}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-harvest-700 shrink-0" />
                  <span>{booking.service_location}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Amount</span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatCurrency(booking.total_amount)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* QR Pass Trigger */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setQrModalOpen(true);
                  }}
                  className="gap-1.5 text-xs font-bold rounded-xl"
                >
                  <QrCode className="h-4 w-4 text-harvest-700" />
                  <span>Entry QR</span>
                </Button>

                {/* Cancel Booking Action */}
                {isCancellable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setCancelError(null);
                      setCancelModalOpen(true);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                  >
                    Cancel
                  </Button>
                )}

                {/* Leave Review Action */}
                {canReview && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setReviewModalOpen(true);
                    }}
                    className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm"
                  >
                    <Star className="h-3.5 w-3.5 fill-white" />
                    <span>Leave Review</span>
                  </Button>
                )}

                {/* Reviewed Badge */}
                {hasReviewed && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    <span>Reviewed</span>
                  </span>
                )}

                {/* Pay Now for Pending Booking */}
                {booking.status === "PENDING" && (
                  <Link to={`/app/bookings/${booking.id}`}>
                    <Button
                      size="sm"
                      className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm"
                    >
                      Pay Now
                    </Button>
                  </Link>
                )}

                {/* View Details / Voucher */}
                <Link to={`/app/bookings/${booking.id}`}>
                  <Button
                    size="sm"
                    className="gap-1 text-xs font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl shadow-sm"
                  >
                    <span>View Booking</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Trip & Bookings"
        subtitle="Manage upcoming agricultural stays, view check-in passes, and review past experiences."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Upcoming ({upcomingBookings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed ({completedBookings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            <span>Cancelled ({cancelledBookings.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Loading Skeleton View */}
        {isLoading && (
          <div className="space-y-4 pt-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="p-6 rounded-3xl border-slate-200 space-y-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        )}

        {/* Error View */}
        {!isLoading && errorMessage && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3 mt-4">
            <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Unable to load your bookings</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">{errorMessage}</p>
            <Button size="sm" onClick={loadBookings} className="gap-1.5 font-bold">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {/* Real Content Tabs */}
        {!isLoading && !errorMessage && (
          <>
            <TabsContent value="upcoming" className="space-y-4 pt-2">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map(renderBookingCard)
              ) : (
                <EmptyState
                  icon={Compass}
                  title="No trips yet"
                  description="Explore services to start planning your agricultural trip across Karnataka."
                  actionLabel="Explore Marketplace"
                  onAction={() => window.location.assign("/app/explore")}
                />
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 pt-2">
              {completedBookings.length > 0 ? (
                completedBookings.map(renderBookingCard)
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="No completed trips yet"
                  description="Once you complete a farm stay or workshop experience, your past records will appear here."
                />
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4 pt-2">
              {cancelledBookings.length > 0 ? (
                cancelledBookings.map(renderBookingCard)
              ) : (
                <EmptyState
                  icon={XCircle}
                  title="No cancelled reservations"
                  description="You have no cancelled trips on record."
                />
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* ── QR Check-In Pass Modal ── */}
      <Dialog
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Check-In Digital Pass"
        description="Present this QR voucher to your host upon arrival at the farm."
        className="max-w-md text-center"
      >
        {selectedBooking && (
          <div className="space-y-4 py-2">
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-3xl border-2 border-dashed border-harvest-300 bg-harvest-50/70 p-4 shadow-sm">
              <div className="text-center space-y-1">
                <QrCode className="h-28 w-28 text-harvest-900 mx-auto" />
                <span className="font-mono text-xs font-bold text-slate-800">
                  {selectedBooking.booking_code}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-xs text-left space-y-1 text-slate-700">
              <p className="font-bold text-slate-900">{selectedBooking.service_title}</p>
              <p>
                Host Helpline:{" "}
                <span className="font-mono font-bold text-harvest-800">
                  {selectedBooking.provider_phone || "+91 98450 12345"}
                </span>
              </p>
              <p>
                Dates: {formatDate(selectedBooking.start_date)}{" "}
                {selectedBooking.end_date ? `– ${formatDate(selectedBooking.end_date)}` : ""}
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              {selectedBooking.provider_phone && (
                <a
                  href={`tel:${selectedBooking.provider_phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  <Phone className="h-3.5 w-3.5 text-harvest-700" />
                  <span>Call Host</span>
                </a>
              )}
              <Button onClick={() => setQrModalOpen(false)} size="sm">
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Cancel Booking Modal ── */}
      <Dialog
        isOpen={cancelModalOpen}
        onClose={() => {
          if (!isCancelling) setCancelModalOpen(false);
        }}
        title="Cancel this booking?"
        description="This action may be subject to the platform's cancellation and refund policy."
        className="max-w-md"
      >
        {selectedBooking && (
          <div className="space-y-4 py-2 text-xs text-slate-700">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900 space-y-1">
              <p className="font-bold">Cancellation Policy Overview</p>
              <p className="text-[11px] leading-relaxed">
                Cancellations made 48 hours or more before start date are eligible for 100% refund.
                Cancellations within 48 hours receive a 50% partial refund.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1 text-slate-800">
              <p className="font-bold">{selectedBooking.service_title}</p>
              <p className="font-mono text-slate-500">#{selectedBooking.booking_code}</p>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                {cancelError}
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
                onClick={handleCancelBooking}
                className="flex-1 font-bold"
              >
                Cancel Booking
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Leave Review Modal */}
      <LeaveReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        booking={selectedBooking}
        onSuccess={loadBookings}
      />
    </div>
  );
}
