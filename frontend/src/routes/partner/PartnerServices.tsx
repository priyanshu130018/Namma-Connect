import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  MapPin,
  Edit,
  Eye,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  Copy,
  Send,
  Search,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppImage } from "@/components/ui/image";
import { formatCurrency } from "@/lib/utils";
import { getPartnerServices } from "@/services/partnerService";
import { providerService } from "@/services/providerService";
import { MarketplaceService } from "@/types";
import { useToast } from "@/hooks/useToast";

const OFFICIAL_CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "farm", label: "Farm Tours & Experiences" },
  { id: "adventure", label: "Adventure & Trekking" },
  { id: "water-sports", label: "Water Sports & Activities" },
  { id: "wildlife", label: "Wildlife Tours" },
  { id: "food", label: "Food Tours & Cooking" },
  { id: "cultural-historical", label: "Cultural & Historical Tours" },
  { id: "photography", label: "Photography" },
  { id: "videography", label: "Videography" },
  { id: "drone-aerial", label: "Drone & Aerial" },
  { id: "travel-reels", label: "Travel Reels" },
];

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT" | "PENDING_REVIEW" | "REJECTED";

export function PartnerServicesPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Action busy indicators
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPartnerServices();
      setServices(data || []);
    } catch (err: unknown) {
      console.error("Failed to load partner services:", err);
      setError("Unable to load your service catalog. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleDuplicate = async (serviceId: string, title: string) => {
    try {
      setDuplicatingId(serviceId);
      const duplicated = await providerService.duplicateListing(serviceId);
      toast({
        title: "Listing Duplicated",
        description: `Created draft copy: "${duplicated.title || title + ' (Copy)'}"`,
        variant: "success",
      });
      await loadServices();
    } catch (err: any) {
      toast({
        title: "Duplication Failed",
        description: err?.response?.data?.detail || "Could not duplicate listing.",
        variant: "destructive",
      });
    } finally {
      setDuplicatingId(null);
    }
  };

  const handlePublish = async (serviceId: string, title: string) => {
    try {
      setPublishingId(serviceId);
      await providerService.publishListing(serviceId);
      toast({
        title: "Listing Published",
        description: `"${title}" is now published on the marketplace!`,
        variant: "success",
      });
      await loadServices();
    } catch (err: any) {
      toast({
        title: "Publishing Failed",
        description: err?.response?.data?.detail || "Could not publish listing.",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      // Status filter
      if (statusFilter !== "ALL") {
        const srvStatus = (srv.status || "DRAFT").toUpperCase();
        if (statusFilter === "PENDING_REVIEW") {
          if (srvStatus !== "PENDING_REVIEW" && srvStatus !== "UNDER REVIEW") return false;
        } else if (srvStatus !== statusFilter) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all") {
        const catSlug = (srv.category || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
        if (!catSlug.includes(categoryFilter) && !categoryFilter.includes(catSlug)) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (srv.title || "").toLowerCase().includes(q);
        const matchLoc = (srv.location || "").toLowerCase().includes(q);
        const matchCat = (srv.category || "").toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchCat) return false;
      }

      return true;
    });
  }, [services, statusFilter, categoryFilter, searchQuery]);

  // Counts summary
  const counts = useMemo(() => {
    const total = services.length;
    let published = 0;
    let draft = 0;
    let pending = 0;
    let rejected = 0;

    services.forEach((s) => {
      const st = (s.status || "DRAFT").toUpperCase();
      if (st === "PUBLISHED" || st === "APPROVED") published++;
      else if (st === "DRAFT") draft++;
      else if (st === "PENDING_REVIEW" || st === "UNDER REVIEW") pending++;
      else if (st === "REJECTED" || st === "CHANGES REQUIRED") rejected++;
    });

    return { total, published, draft, pending, rejected };
  }, [services]);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PUBLISHED":
      case "APPROVED":
        return <Badge variant="default" dot className="bg-emerald-50 text-emerald-800 border-emerald-200">Published</Badge>;
      case "UNDER REVIEW":
      case "PENDING_REVIEW":
        return <Badge variant="warning" dot className="bg-amber-50 text-amber-800 border-amber-200">Under Review</Badge>;
      case "REJECTED":
      case "CHANGES REQUIRED":
        return <Badge variant="destructive" dot className="bg-rose-50 text-rose-800 border-rose-200">Changes Required</Badge>;
      case "DRAFT":
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50 font-bold">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      <PageHeader
        title="My Services Catalog"
        subtitle="Manage your 10 marketplace activity listings, set availability calendars, and duplicate offerings."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadServices}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link to="/provider/listings/new">
              <Button size="sm" className="gap-2 font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm">
                <PlusCircle className="h-4 w-4" />
                <span>+ Add Service</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Listings</span>
          <span className="text-xl font-black text-slate-900">{counts.total}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Active Published</span>
          <span className="text-xl font-black text-emerald-700">{counts.published}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Drafts (In Progress)</span>
          <span className="text-xl font-black text-slate-700">{counts.draft}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Pending Review</span>
          <span className="text-xl font-black text-amber-700">{counts.pending}</span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by service title, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(["ALL", "PUBLISHED", "DRAFT", "PENDING_REVIEW", "REJECTED"] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-harvest-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "All" : st === "PENDING_REVIEW" ? "Review" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter listings by activity category"
            className="h-9 text-xs font-semibold rounded-xl border border-slate-200 px-3 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-harvest-500"
          >
            {OFFICIAL_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadServices} className="text-xs font-bold border-rose-300 text-rose-900 bg-white">
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 rounded-3xl border-slate-200 bg-white animate-pulse">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="h-28 w-full md:w-48 bg-slate-200 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-3 w-full">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredServices.length === 0 && (
        <Card className="p-12 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-4">
          <div className="h-16 w-16 bg-harvest-50 text-harvest-700 rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="h-8 w-8 text-harvest-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {services.length === 0 ? "No Services Created Yet" : "No Listings Match Filters"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {services.length === 0
                ? "Start publishing your 10 marketplace experiences, tours, and services to reach Karnataka travelers."
                : "Try clearing your search query or selecting a different status/category filter."}
            </p>
          </div>
          {services.length === 0 ? (
            <Link to="/provider/listings/new" className="inline-block pt-2">
              <Button className="bg-harvest-600 hover:bg-harvest-700 text-white font-bold gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Create Your First Service</span>
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setCategoryFilter("all");
                setSearchQuery("");
              }}
              className="font-bold text-xs"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      )}

      {/* Services List */}
      {!isLoading && !error && filteredServices.length > 0 && (
        <div className="space-y-4">
          {filteredServices.map((service) => {
            const isDraft = (service.status || "DRAFT").toUpperCase() === "DRAFT";
            const isPublished = (service.status || "").toUpperCase() === "PUBLISHED" || (service.status || "").toUpperCase() === "APPROVED";

            return (
              <Card key={service.id} className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                  {/* Media Thumbnail */}
                  <div className="md:col-span-3 relative min-h-[140px]">
                    <AppImage
                      src={service.primary_image || (service.images && service.images[0]) || "/images/services/default-experience.jpg"}
                      alt={service.title}
                      aspectRatio="auto"
                      className="h-full w-full object-cover min-h-[140px]"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-white/95 text-slate-800 text-[10px] font-bold shadow-sm backdrop-blur-sm">
                        {service.provider_type || "Partner"}
                      </Badge>
                    </div>
                  </div>

                  {/* Service Metadata & Status */}
                  <div className="md:col-span-9 p-5 sm:p-6 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-harvest-800 uppercase tracking-wider">
                            {service.category}
                          </span>
                          <span>•</span>
                          {getStatusBadge(service.status)}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-slate-900">
                            {formatCurrency(service.price)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium"> / {service.unit}</span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {service.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-harvest-700 shrink-0" />
                        <span>{service.location}</span>
                      </div>

                      {service.status === "REJECTED" && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-start gap-2 mt-2">
                          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>Changes requested by moderation team. Please update listing details and resubmit.</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Bottom Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span>Capacity: <strong>{service.max_capacity ?? 10} guests</strong></span>
                        {service.rating && (
                          <span>• Rating: <strong className="text-amber-600">★ {service.rating.toFixed(1)}</strong></span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Duplicate Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicate(service.id, service.title)}
                          disabled={duplicatingId === service.id}
                          className="gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Copy className={`h-3.5 w-3.5 ${duplicatingId === service.id ? "animate-spin" : ""}`} />
                          <span>Duplicate</span>
                        </Button>

                        {/* Publish Draft Button */}
                        {isDraft && (
                          <Button
                            size="sm"
                            onClick={() => handlePublish(service.id, service.title)}
                            disabled={publishingId === service.id}
                            className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Send className={`h-3.5 w-3.5 ${publishingId === service.id ? "animate-spin" : ""}`} />
                            <span>Publish</span>
                          </Button>
                        )}

                        {/* Edit Listing */}
                        <Link to={`/provider/services/${service.id}`}>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold">
                            <Edit className="h-3.5 w-3.5 text-slate-600" />
                            <span>Edit / Availability</span>
                          </Button>
                        </Link>

                        {/* Public Link */}
                        {isPublished && (
                          <Link to={`/app/services/${service.id}`} target="_blank">
                            <Button size="sm" variant="ghost" className="gap-1 text-xs font-bold text-harvest-700 hover:text-harvest-800">
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Public</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
