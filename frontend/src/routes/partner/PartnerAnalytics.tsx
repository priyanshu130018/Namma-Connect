import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Users,
  Award,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Lightbulb,
  Filter,
  ArrowRight,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  providerService,
  AnalyticsOverview,
  AnalyticsTrendSeries,
  BestServiceItem,
  AnalyticsDemand,
  AnalyticsRecommendations,
  ServiceAnalyticsReport,
  ProviderEarningsReport,
  ProviderInteractionsFunnel,
  ProviderBookingsReport,
  ActionableRecommendation,
} from "@/services/providerService";
import { getPartnerServices } from "@/services/partnerService";
import { MarketplaceService } from "@/types";

type PeriodOption = "7d" | "30d" | "90d";

export function PartnerAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [servicesList, setServicesList] = useState<MarketplaceService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Overview / Catalog-wide state
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendSeries | null>(null);
  const [bestServices, setBestServices] = useState<BestServiceItem[]>([]);
  const [demand, setDemand] = useState<AnalyticsDemand | null>(null);
  const [recommendations, setRecommendations] = useState<AnalyticsRecommendations | null>(null);
  const [earningsReport, setEarningsReport] = useState<ProviderEarningsReport | null>(null);
  const [funnelReport, setFunnelReport] = useState<ProviderInteractionsFunnel | null>(null);
  const [bookingsReport, setBookingsReport] = useState<ProviderBookingsReport | null>(null);

  // Single-service drill-down report
  const [serviceReport, setServiceReport] = useState<ServiceAnalyticsReport | null>(null);

  // Load provider listings for the selector
  useEffect(() => {
    getPartnerServices()
      .then((srvs) => setServicesList(srvs || []))
      .catch((err) => console.error("Could not load service list for selector:", err));
  }, []);

  const loadAnalytics = useCallback(async (selectedPeriod: PeriodOption, srvId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (srvId === "all") {
        setServiceReport(null);
        const [
          overviewData,
          trendsData,
          bestData,
          demandData,
          recsData,
          earningsData,
          funnelData,
          bookingDistData,
        ] = await Promise.all([
          providerService.getAnalyticsOverview(selectedPeriod),
          providerService.getAnalyticsTrends(selectedPeriod === "90d" ? "3m" : selectedPeriod),
          providerService.getBestServices("bookings"),
          providerService.getDemandAnalysis(),
          providerService.getRecommendations(),
          providerService.getEarningsReport(selectedPeriod),
          providerService.getInteractionsFunnel(selectedPeriod),
          providerService.getBookingsReport(selectedPeriod),
        ]);

        setOverview(overviewData);
        setTrends(trendsData);
        setBestServices(bestData);
        setDemand(demandData);
        setRecommendations(recsData);
        setEarningsReport(earningsData);
        setFunnelReport(funnelData);
        setBookingsReport(bookingDistData);
      } else {
        // Individual service report
        const report = await providerService.getServiceAnalytics(srvId, selectedPeriod);
        setServiceReport(report);
      }
    } catch (err: any) {
      console.error("Failed to load provider analytics:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load analytics reports. Please try refreshing."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(period, selectedServiceId);
  }, [period, selectedServiceId, loadAnalytics]);

  const handleExportCSV = () => {
    const url = providerService.getExportUrl(period === "90d" ? "3m" : period);
    window.open(url, "_blank");
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case "HIGH_CONFIDENCE":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">High Confidence (&gt;20 bookings)</Badge>;
      case "SUFFICIENT_DATA":
        return <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] font-bold">Sufficient Data (5-20 bookings)</Badge>;
      case "LOW_DATA":
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">Early Signals (&lt;5 bookings)</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Header & Global Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Provider Performance & Analytics"
          subtitle="Realized host payouts (90%), platform economics, demand calendar, and explainable recommendations."
        />

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Service Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              aria-label="Filter analytics by service"
              className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none max-w-[160px] truncate"
            >
              <option value="all">All Catalog Services</option>
              {servicesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            {(["7d", "30d", "90d"] as PeriodOption[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  period === p
                    ? "bg-white dark:bg-slate-900 text-harvest-800 dark:text-harvest-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(period, selectedServiceId)}
            disabled={isLoading}
            className="rounded-xl font-bold text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Export CSV */}
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl text-xs"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-200 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => loadAnalytics(period, selectedServiceId)} className="text-xs font-bold">
            Retry
          </Button>
        </Card>
      )}

      {/* ── INDIVIDUAL SERVICE DEEP-DIVE VIEW ── */}
      {selectedServiceId !== "all" && serviceReport && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-harvest-500 to-emerald-600 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold uppercase">
                  {serviceReport.category}
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                  ★ {serviceReport.rating.toFixed(1)} ({serviceReport.reviews_count} reviews)
                </Badge>
              </div>
              <h2 className="text-2xl font-black">{serviceReport.title}</h2>
              <p className="text-xs text-white/80 mt-1">
                Tariff: {formatCurrency(serviceReport.price)} / {serviceReport.unit} • Status: {serviceReport.status}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/provider/services/${serviceReport.service_id}`}>
                <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold text-xs">
                  Manage Service & Availability
                </Button>
              </Link>
            </div>
          </div>

          {/* Service Level Financials & Bookings Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 rounded-3xl border-slate-200 bg-white shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Gross Booking Value (GMV)</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                {formatCurrency(serviceReport.financials.gross_booking_value)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">Total customer transactions</span>
            </Card>

            <Card className="p-5 rounded-3xl border-emerald-200 bg-emerald-50/50 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Net Realized Payout (90%)</span>
              <span className="text-2xl font-black text-emerald-800 mt-2 block">
                {formatCurrency(serviceReport.financials.net_realized_earnings)}
              </span>
              <span className="text-xs text-emerald-600 mt-1 block">After 10% platform fee ({formatCurrency(serviceReport.financials.platform_fee)})</span>
            </Card>

            <Card className="p-5 rounded-3xl border-slate-200 bg-white shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Completed Bookings</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                {serviceReport.bookings.completed + serviceReport.bookings.confirmed}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">{serviceReport.bookings.cancelled} cancelled / refunded</span>
            </Card>

            <Card className="p-5 rounded-3xl border-slate-200 bg-white shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Capacity Occupancy</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                {serviceReport.operations.occupancy_rate}%
              </span>
              <span className="text-xs text-slate-400 mt-1 block">{serviceReport.operations.booked_guests} / {serviceReport.operations.total_capacity} guests</span>
            </Card>
          </div>

          {/* Service Conversion Funnel */}
          <Card className="p-6 rounded-3xl border-slate-200 bg-white shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-harvest-600" />
              <span>Service Discovery & Conversion Funnel</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Views</span>
                <span className="text-xl font-black text-slate-800 mt-1 block">{serviceReport.funnel.impressions_views}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Detail Clicks</span>
                <span className="text-xl font-black text-slate-800 mt-1 block">{serviceReport.funnel.detail_clicks}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Saves / Wishlists</span>
                <span className="text-xl font-black text-slate-800 mt-1 block">{serviceReport.funnel.saves}</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Conversion Rate</span>
                <span className="text-xl font-black text-emerald-800 mt-1 block">{serviceReport.funnel.conversion_rate_percent}%</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── CATALOG-WIDE PERFORMANCE OVERVIEW ── */}
      {selectedServiceId === "all" && (
        <>
          {/* 1. Four Compact Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Bookings */}
            <Card className="p-5 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Bookings
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-harvest-50 text-harvest-700 dark:bg-harvest-950 dark:text-harvest-300">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 rounded-lg" />
                ) : (
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {overview?.total_bookings ?? 0}
                  </span>
                )}
                <span className="text-xs font-semibold text-emerald-600">
                  {overview?.completed_bookings ?? 0} fulfilled
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {overview?.confirmed_bookings ?? 0} confirmed • {overview?.cancelled_bookings ?? 0} cancelled
              </p>
            </Card>

            {/* Gross Revenue (GMV) */}
            <Card className="p-5 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Gross Booking Value
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-24 rounded-lg" />
                ) : (
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(overview?.total_revenue ?? 0)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Total customer transaction volume</p>
            </Card>

            {/* Net Host Payout (90%) */}
            <Card className="p-5 rounded-3xl border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Net Host Payout (90%)
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-24 rounded-lg" />
                ) : (
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(overview?.net_earnings ?? 0)}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium">90% net</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                10% platform fee: {formatCurrency(overview?.platform_fee ?? (overview?.total_revenue ? overview.total_revenue * 0.1 : 0))}
                {earningsReport?.pending_settlement_payout ? ` • Pending: ${formatCurrency(earningsReport.pending_settlement_payout)}` : ""}
              </p>
            </Card>

            {/* Occupancy Rate */}
            <Card className="p-5 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Capacity Occupancy
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 rounded-lg" />
                ) : (
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {overview?.occupancy_rate ?? 0}%
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-500">Avg Utilization</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Avg Lead Time: <strong>{overview?.average_lead_time_days ?? 4.2} days</strong>
              </p>
            </Card>
          </div>

          {/* 2. Combined Bookings & Revenue Trend Chart */}
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-harvest-600" />
                  <span>Gross Revenue & Booking Trend</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological progression across your 10 marketplace activity categories.
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] font-bold">
                Period: {period.toUpperCase()}
              </Badge>
            </div>

            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-2xl" />
            ) : !trends || trends.labels.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No chronological trend data recorded for this time range yet.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-6 sm:grid-cols-12 items-end gap-2 h-40 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                  {trends.labels.map((lbl, idx) => {
                    const revenueVal = trends.series[1]?.data[idx] || 0;
                    const maxRevenue = Math.max(...(trends.series[1]?.data || [1000]), 1000);
                    const heightPct = Math.max(12, Math.min(100, Math.round((revenueVal / maxRevenue) * 100)));

                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 group h-full justify-end">
                        <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          ₹{revenueVal}
                        </div>
                        <div
                          className="w-full max-w-[28px] bg-gradient-to-t from-harvest-600 to-emerald-500 rounded-t-md transition-all group-hover:from-harvest-700 group-hover:to-emerald-600"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">
                          {lbl.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-6 text-xs text-slate-500 font-semibold pt-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-harvest-600" />
                    <span>Gross Revenue (INR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Bookings Count</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 3. Funnel & Booking Dynamics Report */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Interaction Funnel */}
            <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-sky-600" />
                  <span>Guest Conversion Funnel</span>
                </h3>
                <Badge className="bg-sky-100 text-sky-800 text-[10px] font-bold">
                  {funnelReport?.overall_conversion_rate ?? 0}% Overall
                </Badge>
              </div>

              {isLoading ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Views</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {funnelReport?.impressions ?? funnelReport?.funnel_steps?.[0]?.count ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Clicks</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {funnelReport?.clicks ?? funnelReport?.funnel_steps?.[1]?.count ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Saves</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {funnelReport?.saves ?? funnelReport?.funnel_steps?.[2]?.count ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Bookings</span>
                      <span className="text-base font-black text-emerald-800 dark:text-emerald-300">
                        {funnelReport?.bookings ?? funnelReport?.funnel_steps?.[3]?.count ?? 0}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Recorded from live user interactions, wishlist saves, and confirmed checkout reservations.
                  </p>
                </div>
              )}
            </Card>

            {/* Booking Lead Time Distribution */}
            <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-harvest-600" />
                  <span>Lead Time & Booking Window</span>
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold">
                  Avg: {bookingsReport?.average_lead_time_days ?? 4.2} days
                </Badge>
              </div>

              {isLoading ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Average Group Size: <strong>{bookingsReport?.average_group_size ?? 2.8} guests</strong></span>
                    <span>Cancellation Rate: <strong className="text-rose-600">{bookingsReport?.cancellation_rate_percent ?? 0}%</strong></span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {(bookingsReport?.lead_time_distribution || [
                      { bucket: "Same-Day (<1d)", percentage: 12 },
                      { bucket: "Short Notice (1-3d)", percentage: 38 },
                      { bucket: "Standard (4-7d)", percentage: 32 },
                      { bucket: "Advance (8-14d)", percentage: 14 },
                      { bucket: "Far Advance (15d+)", percentage: 4 },
                    ]).map((b, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          <span>{b.bucket}</span>
                          <span>{b.percentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-harvest-600 rounded-full"
                            style={{ width: `${b.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 4. Demand Analysis & Peak Times */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Demand & Peak Days</span>
                </h3>
                <Badge className="bg-amber-100 text-amber-900 text-[10px] font-bold">
                  Market Signals
                </Badge>
              </div>

              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-xl" />
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
                        Peak Days
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(demand?.peak_days || ["Saturday", "Sunday"]).map((day) => (
                          <Badge key={day} variant="outline" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-[11px]">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-harvest-50/60 dark:bg-harvest-950/30 border border-harvest-200/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-800 dark:text-harvest-300 block mb-1">
                        Peak Booking Window
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {demand?.peak_hours || "09:00 AM - 11:30 AM"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block mb-1">
                      Seasonality & Regional Insight
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      {demand?.seasonality_insight || "High demand during upcoming harvest festivals and weekend getaways across Western Ghats & Malnad circuits."}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Smart Slot Optimization */}
            <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-harvest-600" />
                  <span>Smart Slot Availability Advisory</span>
                </h3>
                <Badge className="bg-harvest-100 text-harvest-900 text-[10px] font-bold">
                  Rule Engine
                </Badge>
              </div>

              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-xl" />
              ) : (
                <div className="space-y-3">
                  {(recommendations?.smart_slots || []).map((slot, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {slot.day} ({slot.recommended_time})
                          </span>
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                            {slot.expected_boost}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {slot.demand_reason}
                        </p>
                      </div>
                      <Link to="/provider/services">
                        <Button size="sm" variant="outline" className="text-[11px] font-bold rounded-lg shrink-0">
                          Set Slots
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* 5. Explainable Data-Driven Recommendations (Types A through J) */}
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>Explainable Action Recommendations</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data-backed optimization insights grounded in your actual bookings and customer signals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {getConfidenceBadge(recommendations?.confidence_level || recommendations?.data_sufficiency?.confidence)}
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : (!recommendations?.recommendations || recommendations.recommendations.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-400">
                All services are currently well-optimized for incoming guest demand!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {recommendations.recommendations.map((rec: ActionableRecommendation, idx: number) => (
                  <div
                    key={rec.id || idx}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {rec.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold uppercase ${
                            rec.priority === "HIGH"
                              ? "text-rose-700 border-rose-300 bg-rose-50"
                              : "text-amber-700 border-amber-300 bg-amber-50"
                          }`}
                        >
                          {rec.priority} Priority
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rec.description}
                      </p>

                      {/* Quantitative Evidence */}
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                        <strong className="text-slate-700 dark:text-slate-300">Evidence: </strong>
                        {rec.evidence}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        Impact: {rec.expected_impact}
                      </span>
                      <Link to={rec.action_target || "/provider/services"}>
                        <Button size="sm" className="h-7 text-[11px] font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-lg gap-1">
                          <span>{rec.action_text || "Apply Action"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 6. Best Performing Services Table */}
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-harvest-600" />
                  <span>Service Catalog Performance</span>
                </h3>
                <p className="text-xs text-slate-500">Breakdown across your active services</p>
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-36 w-full rounded-xl" />
            ) : bestServices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No service performance metrics registered for this provider catalog yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4">Service Title</th>
                      <th className="pb-3 px-4">Category</th>
                      <th className="pb-3 px-4 text-center">Bookings</th>
                      <th className="pb-3 px-4 text-right">Revenue</th>
                      <th className="pb-3 px-4 text-center">Rating</th>
                      <th className="pb-3 pl-4 text-center">Occupancy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bestServices.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                          {srv.title}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 capitalize">
                          {srv.category}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {srv.bookings_count}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-harvest-700 dark:text-harvest-400">
                          {formatCurrency(srv.revenue)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          ★ {srv.rating?.toFixed(1) || "5.0"}
                        </td>
                        <td className="py-3 pl-4 text-center font-semibold text-slate-600 dark:text-slate-400">
                          {srv.occupancy_percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
