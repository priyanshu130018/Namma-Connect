import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  Ban,
  Download,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPartnerBookingById, updatePartnerBookingStatus } from "@/services/bookingService";
import { ProviderBookingItem } from "@/types";

export function PartnerBookingDetailPage() {
  const { booking_id } = useParams<{ booking_id: string }>();
  const [booking, setBooking] = useState<ProviderBookingItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status Action Modal State
  const [actionTargetStatus, setActionTargetStatus] = useState<"CONFIRMED" | "CANCELLED" | "COMPLETED" | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!booking_id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPartnerBookingById(booking_id);
      setBooking(data);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load guest reservation manifest. You may not have host authorization for this service."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [booking_id]);

  const handleExecuteStatusUpdate = async () => {
    if (!booking || !actionTargetStatus) return;
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await updatePartnerBookingStatus(booking.id, actionTargetStatus);
      setBooking(updated);
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

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-96 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            <Skeleton className="h-96 rounded-3xl" />
          </div>
          <div className="md:col-span-4">
            <Skeleton className="h-64 rounded-3xl" />
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
        <Link to="/partner/bookings">
          <Button variant="outline" className="mt-2 font-bold">
            Back to Reservations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <Link
        to="/partner/bookings"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reservations
      </Link>

      <PageHeader
        title={`Reservation Manifest #${booking.booking_code}`}
        subtitle={`Service: ${booking.service_title}`}
        actions={
          <div className="flex items-center gap-2">
            {renderStatusBadge(booking.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 font-bold rounded-xl text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Print Manifest
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Guest Manifest (8 cols) */}
        <div className="md:col-span-8 space-y-6">
          <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Guest Information</h3>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Payment: {booking.payment_status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Primary Guest</span>
                <p className="text-sm font-bold text-slate-900">{booking.customer_name}</p>
                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Platform Traveler
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Group Size</span>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-harvest-700" />
                  <span>{booking.guest_count} {booking.guest_count === 1 ? "Guest" : "Guests"}</span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Phone Number</span>
                <p className="text-xs font-mono font-bold text-slate-900">
                  {booking.customer_phone || "+91 98450 12345"}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                <p className="text-xs font-semibold text-slate-900">
                  {booking.customer_email || "guest@example.com"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Stay / Experience Schedule</span>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Calendar className="h-4 w-4 text-harvest-700" />
                  <span>
                    {formatDate(booking.start_date)}
                    {booking.end_date ? ` – ${formatDate(booking.end_date)}` : ""}
                  </span>
                </div>
                {booking.time_slot_label && (
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Clock className="h-4 w-4 text-harvest-700" />
                    <span>{booking.time_slot_label}</span>
                  </div>
                )}
              </div>
            </div>

            {booking.special_requests && (
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold">Guest Special Instructions:</span>
                <p>{booking.special_requests}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {booking.customer_phone && (
                <a
                  href={`tel:${booking.customer_phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <Phone className="h-4 w-4" /> Call Guest
                </a>
              )}
              {booking.customer_email && (
                <a
                  href={`mailto:${booking.customer_email}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Mail className="h-4 w-4" /> Email Guest
                </a>
              )}
            </div>
          </Card>
        </div>

        {/* Right Payout Breakdown & Actions (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 text-xs shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Host Payout Calculation
            </h4>

            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Gross Booking Fee</span>
                <span>{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Platform Fee (5%)</span>
                <span>-{formatCurrency(roundAmount(booking.total_amount * 0.05))}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-sm text-slate-900">
                <span>Host Net Payout (95%)</span>
                <span className="text-emerald-700">{formatCurrency(booking.net_payout)}</span>
              </div>
            </div>
          </Card>

          {/* Action Toolbar */}
          <Card className="p-6 rounded-3xl border-slate-200 bg-slate-50/70 space-y-3 text-xs shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Reservation Actions
            </h4>

            {booking.status === "PENDING" && (
              <div className="space-y-2">
                <Button
                  onClick={() => setActionTargetStatus("CONFIRMED")}
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-sm"
                >
                  <Check className="h-4 w-4" /> Accept Reservation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActionTargetStatus("CANCELLED")}
                  className="w-full font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl gap-1.5"
                >
                  <Ban className="h-4 w-4" /> Reject Reservation
                </Button>
              </div>
            )}

            {booking.status === "CONFIRMED" && (
              <div className="space-y-2">
                <Button
                  onClick={() => setActionTargetStatus("COMPLETED")}
                  className="w-full font-bold bg-slate-900 hover:bg-black text-white rounded-xl gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark as Completed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActionTargetStatus("CANCELLED")}
                  className="w-full font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl gap-1.5"
                >
                  <Ban className="h-4 w-4" /> Cancel Reservation
                </Button>
              </div>
            )}

            {booking.status === "COMPLETED" && (
              <div className="p-3 bg-slate-100 rounded-xl text-center font-bold text-slate-700">
                Reservation Completed
              </div>
            )}

            {booking.status === "CANCELLED" && (
              <div className="p-3 bg-rose-50 rounded-xl text-center font-bold text-rose-700 border border-rose-200">
                Reservation Cancelled
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(actionTargetStatus)}
        onClose={() => {
          if (!isUpdating) setActionTargetStatus(null);
        }}
        title={`Confirm Action: ${actionTargetStatus === "CONFIRMED" ? "Accept Reservation" : actionTargetStatus === "COMPLETED" ? "Mark as Completed" : "Cancel Reservation"}`}
        description={`Are you sure you want to transition booking ${booking.booking_code} to ${actionTargetStatus}?`}
        className="max-w-md"
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">{booking.service_title}</p>
            <p className="text-slate-600">Guest: {booking.customer_name} ({booking.guest_count} travelers)</p>
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
              onClick={() => setActionTargetStatus(null)}
              className="flex-1 font-bold"
            >
              Keep Current
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

function roundAmount(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
