import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Check,
  Ban,
  User,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPartnerBookings, updatePartnerBookingStatus } from "@/services/bookingService";
import { ProviderBookingItem } from "@/types";

export function PartnerBookingsPage() {
  const [activeTab, setActiveTab] = useState<string>("upcoming");
  const [bookings, setBookings] = useState<ProviderBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status Action Modal State
  const [selectedBooking, setSelectedBooking] = useState<ProviderBookingItem | null>(null);
  const [actionTargetStatus, setActionTargetStatus] = useState<"CONFIRMED" | "CANCELLED" | "COMPLETED" | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBookings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPartnerBookings();
      setBookings(data.bookings || []);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load guest reservations. Please verify your host account connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleExecuteStatusUpdate = async () => {
    if (!selectedBooking || !actionTargetStatus) return;
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await updatePartnerBookingStatus(selectedBooking.id, actionTargetStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
      setSelectedBooking(null);
      setActionTargetStatus(null);
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.message ||
          `Failed to update reservation status to ${actionTargetStatus}.`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status === "PENDING" || b.status === "CONFIRMED"
  );
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const cancelledBookings = bookings.filter((b) => b.status === "CANCELLED");

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500 text-white font-bold text-xs uppercase gap-1 px-2.5 py-0.5"
          >
            <Clock className="h-3 w-3" />
            <span>Pending Request</span>
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge
            variant="default"
            className="bg-emerald-600 text-white font-bold text-xs gap-1 px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Confirmed</span>
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="secondary"
            className="bg-slate-900 text-white font-bold text-xs gap-1 px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="font-bold text-xs gap-1 px-2.5 py-0.5"
          >
            <XCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderPaymentBadge = (status: string) => {
    if (status === "PAID") {
      return (
        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          Paid
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
        Payment Pending
      </span>
    );
  };

  const renderBookingCard = (b: ProviderBookingItem) => (
    <Card key={b.id} className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-harvest-800 tracking-wider">
            {b.booking_code}
          </span>
          {renderStatusBadge(b.status)}
          {renderPaymentBadge(b.payment_status)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold uppercase">Host Net Payout:</span>
          <span className="text-base font-black text-emerald-800">
            {formatCurrency(b.net_payout)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
          {b.service_title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1 font-semibold text-slate-800">
            <User className="h-3.5 w-3.5 text-harvest-700" />
            <span>Primary Guest: {b.customer_name}</span>
          </span>
          <span className="flex items-center gap-1 font-semibold text-slate-600">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>{b.guest_count} {b.guest_count === 1 ? "Traveler" : "Travelers"}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-harvest-700 shrink-0" />
          <span className="font-medium">
            {formatDate(b.start_date)}
            {b.end_date ? ` – ${formatDate(b.end_date)}` : ""}
          </span>
        </div>
        {b.customer_phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
            <a href={`tel:${b.customer_phone}`} className="font-mono text-slate-800 hover:text-emerald-700 font-bold">
              {b.customer_phone}
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <Phone className="h-4 w-4 shrink-0" />
            <span>Phone protected</span>
          </div>
        )}
      </div>

      {b.special_requests && (
        <p className="text-xs text-slate-600 italic bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
          <strong className="text-amber-900 not-italic font-bold">Guest Note: </strong>
          "{b.special_requests}"
        </p>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {b.status === "PENDING" && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBooking(b);
                  setActionTargetStatus("CONFIRMED");
                  setActionError(null);
                }}
                className="gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Accept</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedBooking(b);
                  setActionTargetStatus("CANCELLED");
                  setActionError(null);
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                <span>Reject</span>
              </Button>
            </>
          )}

          {b.status === "CONFIRMED" && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBooking(b);
                  setActionTargetStatus("COMPLETED");
                  setActionError(null);
                }}
                className="gap-1 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-xl shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark Completed</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedBooking(b);
                  setActionTargetStatus("CANCELLED");
                  setActionError(null);
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                <span>Cancel</span>
              </Button>
            </>
          )}
        </div>

        <Link to={`/partner/bookings/${b.id}`}>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold rounded-xl">
            <span>View Manifest</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Guest Reservations"
          subtitle="Track upcoming guest arrivals, check-in manifests, and completed agricultural stays."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={loadBookings}
          disabled={isLoading}
          className="gap-2 font-bold self-start sm:self-auto rounded-xl"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Error Loading Reservations</p>
            <p>{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={loadBookings} className="mt-2 font-bold text-xs">
              Retry
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-80 rounded-2xl" />
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 rounded-3xl space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-1.5 font-bold">
              <Clock className="h-3.5 w-3.5" />
              <span>Upcoming ({upcomingBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Completed ({completedBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-1.5 font-bold">
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancelled ({cancelledBookings.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 pt-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(renderBookingCard)
            ) : (
              <EmptyState
                icon={Clock}
                title="No upcoming reservations"
                description="Confirmed bookings from travelers will appear here."
              />
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 pt-4">
            {completedBookings.length > 0 ? (
              completedBookings.map(renderBookingCard)
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No completed bookings on record"
                description="Past fulfilled reservations with released payouts will show here."
              />
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4 pt-4">
            {cancelledBookings.length > 0 ? (
              cancelledBookings.map(renderBookingCard)
            ) : (
              <EmptyState
                icon={XCircle}
                title="No cancelled bookings"
                description="Cancelled reservations appear here."
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Confirmation Dialog for Status Transitions */}
      <Dialog
        isOpen={Boolean(selectedBooking && actionTargetStatus)}
        onClose={() => {
          if (!isUpdating) {
            setSelectedBooking(null);
            setActionTargetStatus(null);
          }
        }}
        title={`Confirm Action: ${actionTargetStatus === "CONFIRMED" ? "Accept Booking" : actionTargetStatus === "COMPLETED" ? "Mark as Completed" : "Cancel Reservation"}`}
        description={`Are you sure you want to transition booking ${selectedBooking?.booking_code} to ${actionTargetStatus}?`}
        className="max-w-md"
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">{selectedBooking?.service_title}</p>
            <p className="text-slate-600">Guest: {selectedBooking?.customer_name} ({selectedBooking?.guest_count} travelers)</p>
            <p className="text-slate-600">Dates: {selectedBooking?.start_date} {selectedBooking?.end_date ? `– ${selectedBooking?.end_date}` : ""}</p>
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              {actionError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                setSelectedBooking(null);
                setActionTargetStatus(null);
              }}
              className="flex-1 font-bold"
            >
              Keep Current State
            </Button>
            <Button
              variant={actionTargetStatus === "CANCELLED" ? "destructive" : "default"}
              isLoading={isUpdating}
              onClick={handleExecuteStatusUpdate}
              className={`flex-1 font-bold ${actionTargetStatus === "CONFIRMED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              Confirm {actionTargetStatus}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
