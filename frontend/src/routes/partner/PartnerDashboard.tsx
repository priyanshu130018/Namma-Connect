import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  PlusCircle,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Coins,
  Award,
  Check,
  X,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { providerService, ProviderDashboardSummary } from "@/services/providerService";

export function PartnerDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<ProviderDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await providerService.getDashboard("30d");
      setDashboard(data);
    } catch (err: any) {
      console.error("Failed to load provider dashboard:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load provider summary. Please verify server connection."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookingAction = async (bookingId: string, action: "confirm" | "cancel" | "complete") => {
    try {
      setActionMessage(null);
      if (action === "confirm") {
        await providerService.confirmBooking(bookingId);
        setActionMessage(`Booking #${bookingId.slice(0, 8)} confirmed successfully!`);
      } else if (action === "cancel") {
        await providerService.cancelBooking(bookingId, "Cancelled by provider from dashboard");
        setActionMessage(`Booking #${bookingId.slice(0, 8)} cancelled.`);
      } else if (action === "complete") {
        await providerService.completeBooking(bookingId);
        setActionMessage(`Booking #${bookingId.slice(0, 8)} marked as completed!`);
      }
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Action ${action} failed.`);
    }
  };

  const displayName = dashboard?.provider_name || user?.full_name || "Provider Host";

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* ── Header & Verification Badge ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="border-harvest-600/40 bg-harvest-50 dark:bg-harvest-950/40 text-harvest-800 dark:text-harvest-300 text-xs font-bold"
            >
              {dashboard?.badge_text || "✓ Verified Provider"}
            </Badge>
            {dashboard?.is_verified && (
              <Badge className="bg-harvest-600 text-white text-[10px] font-bold gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>KYC Approved</span>
              </Badge>
            )}
          </div>
          <PageHeader
            title="Provider Operations Dashboard"
            subtitle={dashboard?.greeting || `Welcome back, ${displayName}. Manage your bookings, earnings, multi-category listings, and performance analytics.`}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="rounded-xl font-bold text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link to="/provider/listings">
            <Button
              size="sm"
              className="gap-1.5 font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm text-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Add Service</span>
            </Button>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <Card className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>{actionMessage}</span>
          <Button size="sm" variant="ghost" onClick={() => setActionMessage(null)} className="h-6 w-6 p-0 text-emerald-800">
            ✕
          </Button>
        </Card>
      )}

      {error && (
        <Card className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} className="text-xs font-bold">
            Retry
          </Button>
        </Card>
      )}

      {/* ── 5 Compact Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Total Bookings */}
        <Card className="p-4 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Bookings
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-harvest-50 text-harvest-700 dark:bg-harvest-950 dark:text-harvest-300">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-12 rounded-lg" />
            ) : (
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {dashboard?.overview_cards?.total_bookings?.value ?? 0}
              </span>
            )}
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {dashboard?.overview_cards?.total_bookings?.trend || "+12.5%"}
            </span>
          </div>
          <Link
            to="/provider/bookings"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-harvest-700 dark:text-harvest-400 hover:underline"
          >
            <span>View all</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>

        {/* 2. Total Earnings */}
        <Card className="p-4 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Earnings
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Coins className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-20 rounded-lg" />
            ) : (
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {dashboard?.overview_cards?.total_earnings?.formatted || formatCurrency(dashboard?.overview_cards?.total_earnings?.value ?? 0)}
              </span>
            )}
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {dashboard?.overview_cards?.total_earnings?.trend || "+15.2%"}
            </span>
          </div>
          <Link
            to="/provider/earnings"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <span>Payouts</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>

        {/* 3. Active Listings */}
        <Card className="p-4 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Services
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-12 rounded-lg" />
            ) : (
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {dashboard?.overview_cards?.active_listings?.value ?? 0}
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              of {dashboard?.overview_cards?.active_listings?.total_listings ?? 0} total
            </span>
          </div>
          <Link
            to="/provider/listings"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline"
          >
            <span>Catalog</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>

        {/* 4. NC Score */}
        <Card className="p-4 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              NC Score
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Award className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-16 rounded-lg" />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600">
                  {dashboard?.overview_cards?.nc_score?.score ?? 850}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  ({dashboard?.overview_cards?.nc_score?.tier || "Gold"})
                </span>
              </div>
            )}
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              {dashboard?.overview_cards?.nc_score?.review_count ?? 0} reviews
            </span>
          </div>
          <Link
            to="/provider/analytics"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <span>Reputation</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>

        {/* 5. Pending Actions */}
        <Card className="p-4 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Actions
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-7 w-12 rounded-lg" />
            ) : (
              <span className="text-xl font-black text-rose-600">
                {dashboard?.overview_cards?.pending_actions?.value ?? 0}
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Tasks requiring review
            </span>
          </div>
          <Link
            to="/provider/bookings"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:underline"
          >
            <span>Resolve</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      {/* ── Action Required Section ── */}
      <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span>Action Required Tasks</span>
          </h3>
          {dashboard?.action_required?.all_caught_up ? (
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              ✓ All Caught Up
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
              {dashboard?.action_required?.tasks?.length || 0} Action Items
            </Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : dashboard?.action_required?.all_caught_up || !dashboard?.action_required?.tasks?.length ? (
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>You have no pending host actions! All booking requests and listing checks are updated.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {dashboard.action_required.tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{task.title}</span>
                    <Badge
                      className={
                        task.priority === "HIGH"
                          ? "bg-rose-100 text-rose-800 text-[9px] font-bold"
                          : "bg-amber-100 text-amber-800 text-[9px] font-bold"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">{task.description}</p>
                </div>
                <Link to={task.target}>
                  <Button size="sm" className="bg-harvest-600 hover:bg-harvest-700 text-white font-bold text-xs shrink-0">
                    Review
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Booking Overview & Allowed Actions ── */}
      <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-harvest-600" />
              <span>Recent Booking Reservations</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Total: {dashboard?.booking_overview?.total ?? 0} | Pending: {dashboard?.booking_overview?.pending ?? 0} | Confirmed: {dashboard?.booking_overview?.confirmed ?? 0}
            </p>
          </div>
          <Link to="/provider/bookings" className="text-xs font-bold text-harvest-700 hover:underline">
            View All Bookings
          </Link>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : !dashboard?.booking_overview?.recent_bookings?.length ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No guest bookings recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {dashboard.booking_overview.recent_bookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={b.service_image}
                    alt={b.service_name}
                    className="h-12 w-12 rounded-xl object-cover shrink-0 bg-slate-100"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{b.service_name}</span>
                      <Badge
                        variant="outline"
                        className={
                          b.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold"
                            : b.status === "PENDING"
                            ? "bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold"
                            : "bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold"
                        }
                      >
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Guest: <span className="font-semibold text-slate-700 dark:text-slate-300">{b.customer_name}</span> ({b.guest_count} guests) • {b.start_date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {formatCurrency(b.total_amount)}
                  </span>

                  {/* Allowed Status Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {b.allowed_actions?.includes("confirm") && (
                      <Button
                        size="sm"
                        onClick={() => handleBookingAction(b.id, "confirm")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 h-7 gap-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Confirm</span>
                      </Button>
                    )}
                    {b.allowed_actions?.includes("complete") && (
                      <Button
                        size="sm"
                        onClick={() => handleBookingAction(b.id, "complete")}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] px-2.5 h-7 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Complete</span>
                      </Button>
                    )}
                    {b.allowed_actions?.includes("cancel") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBookingAction(b.id, "cancel")}
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold px-2.5 h-7 gap-1"
                      >
                        <X className="h-3 w-3" />
                        <span>Cancel</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── My Services (Top 3 Listings) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              My Featured Services
            </h2>
            <p className="text-xs text-slate-500">Top active offerings published on NammaConnect</p>
          </div>
          <Link
            to="/provider/listings"
            className="text-xs font-bold text-harvest-700 dark:text-harvest-400 hover:underline"
          >
            View Catalog ({dashboard?.my_services?.total_count ?? 0})
          </Link>
        </div>

        {isLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : !dashboard?.my_services?.top_services?.length ? (
          <Card className="p-8 text-center border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No services added yet.</p>
            <Link to="/provider/listings">
              <Button size="sm" className="bg-harvest-600 hover:bg-harvest-700 text-white font-bold text-xs">
                + Create Service
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dashboard.my_services.top_services.map((srv) => (
              <Card
                key={srv.id}
                className="p-4 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 hover:border-harvest-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="h-32 w-full rounded-2xl overflow-hidden bg-slate-100 relative">
                    <img
                      src={srv.primary_image || "https://images.unsplash.com/photo-1500382017468-9049fed747ef"}
                      alt={srv.title}
                      className="h-full w-full object-cover"
                    />
                    <Badge className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold">
                      {srv.status}
                    </Badge>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {srv.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="capitalize">{srv.category}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(srv.price)}/{srv.unit}</span>
                  </div>
                </div>
                <Link to="/provider/listings">
                  <Button size="sm" variant="outline" className="w-full text-xs font-bold rounded-xl mt-2">
                    Manage Listing
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
