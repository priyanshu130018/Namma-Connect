import { Link } from "react-router-dom";
import {
  Layers,
  Calendar,
  Wallet,
  PlusCircle,
  ArrowUpRight,
  MapPin,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  SAMPLE_PARTNER_SERVICES,
  SAMPLE_PARTNER_BOOKINGS,
  SAMPLE_EARNINGS_DATA,
} from "@/features/partner/data/partnerData";

import { useAuth } from "@/app/providers";

import { useState, useEffect } from "react";
import { getProviderNCScore, getProviderRecommendations } from "@/services/marketplaceService";
import { Award, Zap, TrendingUp } from "lucide-react";

export function PartnerDashboardPage() {
  const { user } = useAuth();
  const [ncScoreData, setNcScoreData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [nc, recs] = await Promise.all([
          getProviderNCScore(),
          getProviderRecommendations(),
        ]);
        setNcScoreData(nc);
        setRecommendations(recs);
      } catch {
        setNcScoreData({
          nc_score: 91.4,
          trend: "+2.4%",
          components: {
            rating_quality: 91.0,
            review_depth: 76.0,
            fulfillment_rate: 98.0,
            response_rate: 82.0,
            profile_completeness: 100.0,
            availability_reliability: 95.0,
            recency: 85.0,
          },
        });
        setRecommendations([
          {
            title: "Expand Saturday Availability",
            reason: "High demand detected during weekend search traffic.",
            evidence: "18 travelers searched for weekend stays in your district.",
            expected_impact: "Increase weekend bookable capacity.",
            action_text: "Update Calendar",
            priority_score: 88.5,
          },
          {
            title: "Collaborate with Local Creator",
            reason: "3 verified travel creators active in Coorg district.",
            evidence: "Creators matching your category have 50K+ reach.",
            expected_impact: "Boost social media promotion & direct bookings.",
            action_text: "View Creator Opportunities",
            priority_score: 82.0,
          },
        ]);
      } finally {
        // loaded
      }
    }
    loadData();
  }, []);

  const publishedServices = SAMPLE_PARTNER_SERVICES.filter((s) => s.status === "PUBLISHED");
  const upcomingBookings = SAMPLE_PARTNER_BOOKINGS.filter((b) => b.status === "upcoming");
  const earnings30d = SAMPLE_EARNINGS_DATA["30 Days"];

  const roleLabelMap: Record<string, string> = {
    farmer: "Farmer & Plantation Host",
    hotel: "Homestay & Accommodation Host",
    food: "Culinary & Local Food Host",
    guide: "Rural Tour & Heritage Guide",
    travel: "Mobility & Transport Partner",
    creator: "Content Creator Partner",
    artisan: "Craft & Artisan Partner",
    partner: "Verified Partner Host",
  };
  const roleTitle = roleLabelMap[user?.role || ""] || "NammaConnect Partner";
  const displayName = user?.business_name || user?.full_name || "Partner Operations";

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-harvest-600/40 bg-harvest-50 dark:bg-harvest-950/40 text-harvest-700 dark:text-harvest-300 text-xs font-bold">
              {roleTitle}
            </Badge>
            {user?.is_verified && (
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                KYC Verified
              </Badge>
            )}
          </div>
          <PageHeader
            title="Host Operations Dashboard"
            subtitle={`Welcome, ${displayName}. Manage your listed services, guest bookings, collaboration proposals, and payouts.`}
          />
        </div>
        <Link to="/partner/services/new">
          <Button size="sm" className="gap-2 font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm shrink-0">
            <PlusCircle className="h-4 w-4" />
            <span>Add New Service</span>
          </Button>
        </Link>
      </div>

      {/* Primary KPI Overview (Services, Bookings, Earnings ONLY) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Services Metric */}
        <Card className="p-5 rounded-3xl border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Services
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-harvest-50 text-harvest-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{publishedServices.length}</span>
            <span className="text-xs text-slate-500 font-medium">Published / {SAMPLE_PARTNER_SERVICES.length} Total</span>
          </div>
          <Link to="/partner/services" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-harvest-700 hover:underline">
            <span>Manage listings</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>

        {/* 2. Bookings Metric */}
        <Card className="p-5 rounded-3xl border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Upcoming Bookings
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{upcomingBookings.length}</span>
            <span className="text-xs text-slate-500 font-medium">Confirmed arrivals</span>
          </div>
          <Link to="/partner/bookings" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
            <span>View reservations</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>

        {/* 3. Earnings Metric */}
        <Card className="p-5 rounded-3xl border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Payout (30 Days)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(earnings30d.netPayout)}
            </span>
            <span className="text-xs text-emerald-700 font-bold">Direct to Bank</span>
          </div>
          <Link to="/partner/earnings" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
            <span>Detailed breakdown</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      {/* Upcoming Guest Arrivals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upcoming Guest Arrivals</h2>
            <p className="text-xs text-slate-500">Check-in manifest for confirmed reservations</p>
          </div>
          <Link to="/partner/bookings" className="text-xs font-bold text-harvest-700 hover:underline">
            View All ({upcomingBookings.length})
          </Link>
        </div>

        <div className="space-y-3">
          {upcomingBookings.map((b) => (
            <Card key={b.id} className="p-5 rounded-2xl border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-harvest-800">{b.bookingCode}</span>
                  <Badge variant="default" dot className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                    Upcoming
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{b.serviceTitle}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1 font-semibold">
                    <Clock className="h-3.5 w-3.5 text-harvest-700" />
                    <span>{formatDate(b.checkInDate)} – {formatDate(b.checkOutDate)}</span>
                  </div>
                  <span>•</span>
                  <span>Guest: <strong>{b.customerName}</strong> ({b.guestsCount} guests)</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payout</span>
                  <span className="text-sm font-black text-slate-900">{formatCurrency(b.netPayout)}</span>
                </div>
                <Link to={`/partner/bookings/${b.id}`}>
                  <Button size="sm" variant="outline" className="text-xs font-bold">
                    View Pass
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Explainable NC Score & Decision-Support Action Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NC Score Breakdown */}
        <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-harvest-100 text-harvest-800">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Provider NC Score</h3>
                <p className="text-[11px] text-slate-500">Quality & Reliability Rating</p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{ncScoreData?.trend || "+2.4%"}</span>
            </Badge>
          </div>

          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-3xl font-black text-slate-900">{ncScoreData?.nc_score || 91.4}</span>
            <span className="text-xs text-slate-500 font-bold">/ 100 Quality Rating</span>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Quality Score Factors</p>
            {Object.entries(ncScoreData?.components || {}).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-slate-600">
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
                <span className="font-mono font-bold text-slate-900">{Number(val).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Recommendations */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Recommended Growth Actions</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Explainable priority decisions</span>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <Card key={idx} className="p-4 rounded-2xl border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                    <Badge className="bg-amber-100 text-amber-900 text-[10px] font-bold">
                      Priority {rec.priority_score || 85}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{rec.reason}</p>
                  <p className="text-[11px] text-slate-400 italic">Evidence: {rec.evidence}</p>
                </div>
                <Button size="sm" className="bg-harvest-600 hover:bg-harvest-700 text-white font-bold text-xs shrink-0">
                  {rec.action_text || "Take Action"}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Active Offerings</h2>
            <p className="text-xs text-slate-500">Live experiences receiving bookings on NammaConnect</p>
          </div>
          <Link to="/partner/services" className="text-xs font-bold text-harvest-700 hover:underline">
            Manage All ({SAMPLE_PARTNER_SERVICES.length})
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {publishedServices.map((service) => (
            <Card key={service.id} className="p-5 rounded-2xl border-slate-200 bg-white flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-[10px]">
                    {service.category}
                  </Badge>
                  <span className="text-xs font-black text-slate-900">
                    {formatCurrency(service.price)} / {service.unit}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{service.title}</h3>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-harvest-700" />
                  <span>{service.location}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {service.activeBookings} active reservations
                </span>
                <Link to={`/partner/services/${service.id}`} className="text-xs font-bold text-harvest-700 hover:underline">
                  Edit Details →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
