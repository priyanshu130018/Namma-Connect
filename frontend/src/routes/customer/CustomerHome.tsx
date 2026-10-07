import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { ServiceCardSkeleton } from "@/components/cards/ServiceCardSkeleton";
import {
  getMarketplaceServices,
  getHomeRecommendations,
} from "@/services/marketplaceService";
import { MarketplaceService } from "@/types";
import { SearchFilterBar } from "@/components/marketplace";

export function CustomerHomePage() {
  const navigate = useNavigate();

  // Unified Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");

  // 5 Database-backed Discovery Sections
  const [nearbyServices, setNearbyServices] = useState<MarketplaceService[]>([]);
  const [topRatedServices, setTopRatedServices] = useState<MarketplaceService[]>([]);
  const [mostVisitedServices, setMostVisitedServices] = useState<MarketplaceService[]>([]);
  const [thingsToVisitServices, setThingsToVisitServices] = useState<MarketplaceService[]>([]);
  const [thingsToDoServices, setThingsToDoServices] = useState<MarketplaceService[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHomeServices = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const recData = await getHomeRecommendations();
      if (
        recData &&
        (recData.nearby?.length ||
          recData.top_rated?.length ||
          recData.most_visited?.length ||
          recData.things_to_visit?.length ||
          recData.things_to_do?.length)
      ) {
        setNearbyServices(recData.nearby || recData.near_you || []);
        setTopRatedServices(recData.top_rated || []);
        setMostVisitedServices(recData.most_visited || []);
        setThingsToVisitServices(recData.things_to_visit || []);
        setThingsToDoServices(recData.things_to_do || []);
      } else {
        // Fallback to real DB queries with distinct params
        const [nearRes, topRes, mostRes, visitRes, doRes] = await Promise.all([
          getMarketplaceServices({ limit: 4, sort_by: "rating" }),
          getMarketplaceServices({ limit: 4, sort_by: "rating" }),
          getMarketplaceServices({ limit: 4, sort_by: "newest" }),
          getMarketplaceServices({ limit: 4, category: "experiences" }),
          getMarketplaceServices({ limit: 4, category: "activities" }),
        ]);
        setNearbyServices(nearRes.services || []);
        setTopRatedServices(topRes.services || []);
        setMostVisitedServices(mostRes.services || []);
        setThingsToVisitServices(visitRes.services || []);
        setThingsToDoServices(doRes.services || []);
      }
    } catch {
      try {
        const [nearRes, topRes, mostRes] = await Promise.all([
          getMarketplaceServices({ limit: 4, sort_by: "rating" }),
          getMarketplaceServices({ limit: 4, sort_by: "rating" }),
          getMarketplaceServices({ limit: 4, sort_by: "newest" }),
        ]);
        setNearbyServices(nearRes.services || []);
        setTopRatedServices(topRes.services || []);
        setMostVisitedServices(mostRes.services || []);
        setThingsToVisitServices([]);
        setThingsToDoServices([]);
      } catch {
        setLoadError("Unable to load discovery sections at this moment.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHomeServices();
  }, []);

  return (
    <div className="space-y-10 pb-12 max-w-7xl mx-auto">
      {/* ── 1. Search & Filter Header ── */}
      <div className="space-y-4 pt-2">
        {/* Unified Search & Filter Bar */}
        <div className="max-w-4xl mx-auto">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedLocation={selectedLocation}
            selectedCategory={selectedCategory}
            sortBy={sortBy}
            onApply={(filters: any) => {
              const qp = new URLSearchParams();
              if (searchQuery.trim()) qp.set("q", searchQuery.trim());
              if (filters.location) qp.set("location", filters.location);
              if (filters.category && filters.category !== "all") qp.set("category", filters.category);
              if (filters.sortBy && filters.sortBy !== "recommended") qp.set("sort_by", filters.sortBy);
              if (filters.maxPrice && filters.maxPrice < 5000) qp.set("max_price", String(filters.maxPrice));
              navigate(`/explore${qp.toString() ? `?${qp.toString()}` : ""}`);
            }}
            onReset={() => {
              setSearchQuery("");
              setSelectedLocation("");
              setSelectedCategory("all");
              setSortBy("recommended");
            }}
            onSubmit={() => {
              const qp = new URLSearchParams();
              if (searchQuery.trim()) qp.set("q", searchQuery.trim());
              if (selectedLocation) qp.set("location", selectedLocation);
              if (selectedCategory && selectedCategory !== "all") qp.set("category", selectedCategory);
              if (sortBy && sortBy !== "recommended") qp.set("sort_by", sortBy);
              navigate(`/explore${qp.toString() ? `?${qp.toString()}` : ""}`);
            }}
            onSelectSuggestion={(sugg: any) => {
              const text = sugg.text || sugg.title || "";
              setSearchQuery(text);
              const qp = new URLSearchParams();
              qp.set("q", text);
              if (sugg.category) qp.set("category", sugg.category);
              navigate(`/explore?${qp.toString()}`);
            }}
          />
        </div>
      </div>

      {/* Error State */}
      {!isLoading && loadError && (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-6 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400 mx-auto" />
          <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold">{loadError}</p>
          <Button size="sm" variant="outline" onClick={loadHomeServices} className="gap-1.5 font-bold">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Loading</span>
          </Button>
        </div>
      )}

      {/* ── SECTION 1: NEARBY ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Nearby</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Authentic rural experiences near your location</p>
          </div>
          <Link
            to="/app/explore?section=nearby"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <span>More</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : nearbyServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {nearbyServices.slice(0, 4).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No nearby services available currently.
          </div>
        )}
      </div>

      {/* ── SECTION 2: TOP RATED ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Top Rated</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Highest rated by travelers and community guests</p>
          </div>
          <Link
            to="/app/explore?section=top_rated"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <span>More</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : topRatedServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {topRatedServices.slice(0, 4).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No top rated services available currently.
          </div>
        )}
      </div>

      {/* ── SECTION 3: MOST VISITED ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Most Visited</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Popular destinations and trending experiences</p>
          </div>
          <Link
            to="/app/explore?section=most_visited"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <span>More</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : mostVisitedServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mostVisitedServices.slice(0, 4).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No trending services found currently.
          </div>
        )}
      </div>

      {/* ── SECTION 4: THINGS TO VISIT ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Things to Visit</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Historical estates, plantations & scenic attractions</p>
          </div>
          <Link
            to="/app/explore?section=things_to_visit"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <span>More</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : thingsToVisitServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {thingsToVisitServices.slice(0, 4).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No attractions found currently.
          </div>
        )}
      </div>

      {/* ── SECTION 5: THINGS TO DO ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Things to Do</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hands-on harvest classes, workshops & activities</p>
          </div>
          <Link
            to="/app/explore?section=things_to_do"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <span>More</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : thingsToDoServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {thingsToDoServices.slice(0, 4).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No activities found currently.
          </div>
        )}
      </div>
    </div>
  );
}

