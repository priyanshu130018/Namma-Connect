import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Users,
  Award,
  Clock,
  Sparkles,
  Zap,
  Info,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Lightbulb,
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
} from "@/services/providerService";

type PeriodOption = "7d" | "30d" | "3m";

export function PartnerAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendSeries | null>(null);
  const [bestServices, setBestServices] = useState<BestServiceItem[]>([]);
  const [demand, setDemand] = useState<AnalyticsDemand | null>(null);
  const [recommendations, setRecommendations] = useState<AnalyticsRecommendations | null>(null);

  const loadAnalytics = useCallback(async (selectedPeriod: PeriodOption) => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, trendsData, bestData, demandData, recsData] = await Promise.all([
        providerService.getAnalyticsOverview(selectedPeriod),
        providerService.getAnalyticsTrends(selectedPeriod),
        providerService.getBestServices("bookings"),
        providerService.getDemandAnalysis(),
        providerService.getRecommendations(),
      ]);

      setOverview(overviewData);
      setTrends(trendsData);
      setBestServices(bestData);
      setDemand(demandData);
      setRecommendations(recsData);
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
    loadAnalytics(period);
  }, [period, loadAnalytics]);

  const handleExportCSV = () => {
    const url = providerService.getExportUrl(period);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Header & Global Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Provider Performance & Analytics"
          subtitle="Track reservation volumes, revenue streams, occupancy trends, and smart slot advisory."
        />

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Period Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            {(["7d", "30d", "3m"] as PeriodOption[]).map((p) => (
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
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "3 Months"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(period)}
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
          <Button size="sm" variant="outline" onClick={() => loadAnalytics(period)} className="text-xs font-bold">
            Retry
          </Button>
        </Card>
      )}

      {/* ── 1. Four Compact Summary Cards ── */}
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
            <span className="text-xs font-semibold text-emerald-600">+12% vs prior</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Total completed & active guest reservations</p>
        </Card>

        {/* Total Revenue */}
        <Card className="p-5 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gross Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
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
          <p className="mt-2 text-[11px] text-slate-400">Gross customer booking volume</p>
        </Card>

        {/* Net Earnings */}
        <Card className="p-5 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Host Payout
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isLoading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : (
              <span className="text-2xl font-black text-teal-700 dark:text-teal-400">
                {formatCurrency(overview?.net_earnings ?? 0)}
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">95% payout</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">After 5% platform service fee deduction</p>
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
          <p className="mt-2 text-[11px] text-slate-400">Booked slots vs total available capacity</p>
        </Card>
      </div>

      {/* ── 2. Combined Bookings & Revenue Trend Chart ── */}
      <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-harvest-600" />
              <span>Bookings & Revenue Performance Trend</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chronological metrics showing volume and earnings progression over {period}.
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
            {/* Visual Bar Graph Representation */}
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

      {/* ── 3. Demand Analysis & Smart Slot Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Demand & Peak Times */}
        <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Demand & Peak Times</span>
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
                <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
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

                <div className="p-3 rounded-2xl bg-harvest-50/60 dark:bg-harvest-950/30 border border-harvest-200/60 dark:border-harvest-900/40">
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
                  Seasonality Insight
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {demand?.seasonality_insight || "High demand during upcoming harvest festivals and weekend getaways across Western Ghats & Malnad circuits."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Smart Slot Recommendations */}
        <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-harvest-600" />
              <span>Smart Slot Recommendations</span>
            </h3>
            <Badge className="bg-harvest-100 text-harvest-900 text-[10px] font-bold">
              AI Optimized
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
                  <Button size="sm" variant="outline" className="text-[11px] font-bold rounded-lg shrink-0">
                    Open Slot
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── 4. Pricing Insights (ADVISORY ONLY) & Growth Opportunities ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Advisory Box */}
        <Card className="p-6 rounded-3xl border-harvest-200/80 dark:border-harvest-800/40 bg-gradient-to-br from-harvest-50/60 via-white to-amber-50/30 dark:from-harvest-950/20 dark:via-slate-900 dark:to-amber-950/10 space-y-4">
          <div className="flex items-center justify-between border-b border-harvest-100 dark:border-harvest-900/40 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-harvest-600" />
              <span>Pricing Advisory Insights</span>
            </h3>
            <Badge variant="outline" className="border-harvest-300 text-harvest-800 dark:text-harvest-300 text-[10px] font-bold">
              Advisory Only
            </Badge>
          </div>

          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-harvest-200/60 dark:border-harvest-800/40">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Avg Price</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {formatCurrency(recommendations?.pricing_insight?.current_avg_price ?? 750)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-harvest-700 dark:text-harvest-400 block">Recommended Range</span>
                  <span className="text-base font-black text-harvest-800 dark:text-harvest-300">
                    {recommendations?.pricing_insight?.recommended_price_range || "₹800 - ₹1,200"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  {recommendations?.pricing_insight?.advisory_note || "Prices are never automatically altered. You maintain complete control over your service tariffs."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Growth Opportunities */}
        <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span>Host Growth Opportunities</span>
            </h3>
            <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
              Expansion
            </Badge>
          </div>

          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (
            <div className="space-y-3 text-xs">
              {(recommendations?.opportunities || [
                { title: "Add Farm Lunch Inclusion", description: "Services offering traditional organic lunches see 40% higher bookings.", impact: "High Impact" },
                { title: "Host Weekend Photography Tours", description: "Demand for early morning estate walks is surging in your district.", impact: "Medium Impact" },
              ]).map((opp, idx) => (
                <div key={idx} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{opp.title}</span>
                    <Badge variant="outline" className="text-[10px] font-bold text-harvest-700 border-harvest-200">
                      {opp.impact}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{opp.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── 5. Best Performing Services Table ── */}
      <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-harvest-600" />
              <span>Service Performance Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500">Individual listing metrics, revenue share, and customer ratings</p>
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
    </div>
  );
}
