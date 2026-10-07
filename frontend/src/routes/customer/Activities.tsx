import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Wheat,
  Compass,
  ChefHat,
  Landmark,
  Star,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ServiceGrid, SearchFilterBar } from "@/components/marketplace";
import { getMarketplaceServices } from "@/services/marketplaceService";
import { MarketplaceService } from "@/types";

export interface ActivityCategoryCard {
  id: string;
  name: string;
  emoji: string;
  icon: any;
  description: string;
}

// EXACT 6 Required Activity Categories
export const DEFAULT_ACTIVITY_CATEGORIES: ActivityCategoryCard[] = [
  {
    id: "farm",
    name: "Farm Tours & Experiences",
    emoji: "🌾",
    icon: Wheat,
    description: "Harvesting, plantation walks, and organic farm tours",
  },
  {
    id: "adventure",
    name: "Adventure & Trekking",
    emoji: "🥾",
    icon: Compass,
    description: "Western Ghats trails, night treks, and camping",
  },
  {
    id: "water-sports",
    name: "Water Sports & Activities",
    emoji: "🌊",
    icon: Compass,
    description: "Kayaking, river rafting, and waterfall rappelling",
  },
  {
    id: "wildlife",
    name: "Wildlife Tours",
    emoji: "🐘",
    icon: Compass,
    description: "Nagarhole & Kabini safaris and bird watching",
  },
  {
    id: "food",
    name: "Food Tours & Cooking",
    emoji: "🍳",
    icon: ChefHat,
    description: "Traditional Malnad & Karavali culinary classes",
  },
  {
    id: "cultural-historical",
    name: "Cultural & Historical Tours",
    emoji: "🏛️",
    icon: Landmark,
    description: "Hampi heritage walks, temple architecture & craft",
  },
];

export function CustomerActivitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL parameters
  const categoryParam = searchParams.get("category") || "";
  const providerIdParam = searchParams.get("providerId") || searchParams.get("provider_id");
  const searchQuery = searchParams.get("q") || "";
  const locationQuery = searchParams.get("location") || "";
  const sortBy = searchParams.get("sort_by") || "rating";
  const currentPage = Number(searchParams.get("page") || "1");

  // Selected categories set (multi-category support: ?category=adventure,wildlife)
  const selectedCategorySlugs = categoryParam
    ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Local Form Inputs
  const [activityInput, setActivityInput] = useState(searchQuery);

  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Provider Detail Drawer state
  const [selectedProvider, setSelectedProvider] = useState<MarketplaceService | null>(null);

  const limit = 16;

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMarketplaceServices({
        category: categoryParam || undefined,
        location: locationQuery || undefined,
        q: searchQuery || undefined,
        sort_by: sortBy,
        page: currentPage,
        limit,
      });

      setServices(data.services || []);

      // If providerIdParam present in URL, select matching service for detail view drawer
      if (providerIdParam && data.services) {
        const found = data.services.find((s) => s.id === providerIdParam || s.provider_id === providerIdParam);
        if (found) setSelectedProvider(found);
      }
    } catch {
      setErrorMessage("Unable to load activity listings.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryParam, locationQuery, searchQuery, sortBy, currentPage, providerIdParam]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      if (!newParams.page && !next.get("page")) next.set("page", "1");
      return next;
    });
  };

  // Toggle multi-category selection
  const handleCategoryToggle = (slug: string) => {
    let nextSlugs: string[];
    if (selectedCategorySlugs.includes(slug)) {
      nextSlugs = selectedCategorySlugs.filter((s) => s !== slug);
    } else {
      nextSlugs = [...selectedCategorySlugs, slug];
    }
    updateFilters({ category: nextSlugs.length > 0 ? nextSlugs.join(",") : null, page: "1" });
  };

  const handleCloseDrawer = () => {
    setSelectedProvider(null);
    const next = new URLSearchParams(searchParams);
    next.delete("providerId");
    next.delete("provider_id");
    setSearchParams(next);
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Explore Activities & Experiences"
        subtitle="Discover authentic rural activities, cultural workshops, farm visits, and culinary classes."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActivities}
            disabled={isLoading}
            className="gap-1.5 rounded-xl font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* ── 1. Default Predefined Category Cards (CRITICAL REQUIREMENT) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Activity Categories</h3>
          {selectedCategorySlugs.length > 0 && (
            <button
              onClick={() => updateFilters({ category: null, page: "1" })}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Clear selected categories ({selectedCategorySlugs.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DEFAULT_ACTIVITY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategorySlugs.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
                className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between space-y-2 select-none ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 shadow-sm ring-2 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{cat.emoji}</span>
                  {isSelected && (
                    <Badge variant="default" className="text-[9px] bg-emerald-600 px-1.5 py-0">
                      Selected
                    </Badge>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{cat.name}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{cat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Unified Search & Filter Bar ── */}
      <SearchFilterBar
        searchQuery={activityInput}
        onSearchChange={(val: string) => {
          setActivityInput(val);
        }}
        selectedLocation={locationQuery}
        selectedCategory={selectedCategorySlugs[0] || "all"}
        sortBy={sortBy}
        placeholder="Search activities, experiences, farm tours, trails..."
        onApply={(filters: any) => {
          updateFilters({
            category: filters.category && filters.category !== "all" ? filters.category : null,
            location: filters.location || null,
            sort_by: filters.sortBy && filters.sortBy !== "rating" ? filters.sortBy : null,
            page: "1",
          });
        }}
        onReset={() => {
          setActivityInput("");
          setSearchParams(new URLSearchParams());
        }}
        onSubmit={() => {
          updateFilters({
            q: activityInput.trim() || null,
            page: "1",
          });
        }}
      />

      {/* ── 3. Results Grid ── */}
      <ServiceGrid
        services={services}
        isLoading={isLoading}
        error={errorMessage}
        onRetry={fetchActivities}
        columns={4}
        skeletonCount={8}
        emptyTitle="No activities found"
        emptyDescription="We couldn't find any activities matching your selected filters. Try searching for a different keyword or clearing category filters."
        emptyActionLabel={selectedCategorySlugs.length > 0 || searchQuery ? "Clear All Filters" : undefined}
        onEmptyAction={() => {
          setActivityInput("");
          setSearchParams(new URLSearchParams());
        }}
      />

      {/* ── 4. Provider Detail Drawer / Modal ── */}
      <Dialog
        isOpen={Boolean(selectedProvider)}
        onClose={handleCloseDrawer}
        title={selectedProvider?.title || "Activity & Provider Details"}
        className="max-w-xl"
      >
        {selectedProvider && (
          <div className="space-y-4 py-2">
            {selectedProvider.primary_image && (
              <img
                src={selectedProvider.primary_image}
                alt={selectedProvider.title}
                className="w-full h-48 rounded-2xl object-cover"
              />
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                  {selectedProvider.category || "Activity"}
                </Badge>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  ₹{selectedProvider.price} <span className="text-xs font-normal text-slate-500">/ person</span>
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedProvider.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedProvider.description}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Provider Host</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedProvider.provider_name || "Namma Connect Partner"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Location</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{selectedProvider.location || "Karnataka"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Rating</span>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{selectedProvider.rating != null ? Number(selectedProvider.rating).toFixed(1) : "0.0"} ({selectedProvider.reviews_count || 0} reviews)</span>
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={handleCloseDrawer} className="rounded-xl">
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleCloseDrawer();
                  navigate(`/messages?provider_id=${selectedProvider.provider_id || selectedProvider.id}&subject=${encodeURIComponent(selectedProvider.title)}`);
                }}
                className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl"
              >
                Inquire Host
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
