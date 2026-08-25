import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/image";
import { formatCurrency } from "@/lib/utils";
import { getPartnerServices } from "@/services/partnerService";
import { MarketplaceService } from "@/types";

export function PartnerServicesPage() {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PUBLISHED":
        return <Badge variant="default" dot className="bg-emerald-50 text-emerald-800 border-emerald-200">Published</Badge>;
      case "APPROVED":
        return <Badge variant="default" dot className="bg-teal-50 text-teal-800 border-teal-200">Approved</Badge>;
      case "UNDER REVIEW":
      case "PENDING_REVIEW":
        return <Badge variant="warning" dot className="bg-amber-50 text-amber-800 border-amber-200">Under Review</Badge>;
      case "REJECTED":
      case "CHANGES REQUIRED":
        return <Badge variant="destructive" dot className="bg-rose-50 text-rose-800 border-rose-200">Changes Required</Badge>;
      case "DRAFT":
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Services Catalog"
        subtitle="Manage your agricultural stays, agro-trails, and workshops published on NammaConnect."
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
            <Link to="/partner/services/new">
              <Button size="sm" className="gap-2 font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm">
                <PlusCircle className="h-4 w-4" />
                <span>+ Add Service</span>
              </Button>
            </Link>
          </div>
        }
      />

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
          {[1, 2].map((i) => (
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
      {!isLoading && !error && services.length === 0 && (
        <Card className="p-12 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-4">
          <div className="h-16 w-16 bg-harvest-50 text-harvest-700 rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="h-8 w-8 text-harvest-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Services Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start publishing your rural experiences, plantation stays, or guided agro-trails to reach travelers.
            </p>
          </div>
          <Link to="/partner/services/new" className="inline-block pt-2">
            <Button className="bg-harvest-600 hover:bg-harvest-700 text-white font-bold gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Create Your First Service</span>
            </Button>
          </Link>
        </Card>
      )}

      {/* Services List */}
      {!isLoading && !error && services.length > 0 && (
        <div className="space-y-4">
          {services.map((service) => (
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
                    <span className="text-xs text-slate-500 font-medium">
                      Capacity: <strong>{service.max_capacity ?? 10} guests</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <Link to={`/partner/services/${service.id}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold">
                          <Edit className="h-3.5 w-3.5 text-slate-600" />
                          <span>Edit Listing</span>
                        </Button>
                      </Link>
                      {service.status === "PUBLISHED" && (
                        <Link to={`/app/services/${service.id}`} target="_blank">
                          <Button size="sm" variant="ghost" className="gap-1 text-xs font-bold text-harvest-700 hover:text-harvest-800">
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Public Page</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
