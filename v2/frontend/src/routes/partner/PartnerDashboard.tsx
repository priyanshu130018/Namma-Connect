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

export function PartnerDashboardPage() {
  const publishedServices = SAMPLE_PARTNER_SERVICES.filter((s) => s.status === "PUBLISHED");
  const upcomingBookings = SAMPLE_PARTNER_BOOKINGS.filter((b) => b.status === "upcoming");
  const earnings30d = SAMPLE_EARNINGS_DATA["30 Days"];

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Quick Action */}
      <PageHeader
        title="Host Operations Dashboard"
        subtitle="Manage your agricultural stays, upcoming guest arrivals, and monthly earnings."
        actions={
          <Link to="/partner/services/new">
            <Button size="sm" className="gap-2 font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Add New Service</span>
            </Button>
          </Link>
        }
      />

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

      {/* Active Listings Overview */}
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
