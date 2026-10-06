import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Camera,
  Video,
  Film,
  Sparkles,
  RefreshCw,
  Search,
  Star,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ServiceGrid } from "@/components/marketplace";
import { getMarketplaceServices } from "@/services/marketplaceService";
import { MarketplaceService } from "@/types";

export interface CreatorCategoryCard {
  id: string;
  name: string;
  emoji: string;
  icon: any;
  description: string;
}

// EXACT 4 Required Creator Categories
export const DEFAULT_CREATOR_CATEGORIES: CreatorCategoryCard[] = [
  {
    id: "photography",
    name: "Photography",
    emoji: "📷",
    icon: Camera,
    description: "High-res estate, resort & farm photo shoots",
  },
  {
    id: "videography",
    name: "Videography",
    emoji: "🎥",
    icon: Video,
    description: "Cinematic promotional films & brand documentaries",
  },
  {
    id: "drone-aerial",
    name: "Drone & Aerial",
    emoji: "🚁",
    icon: Film,
    description: "4K aerial estate mapping & land elevation footage",
  },
  {
    id: "travel-reels",
    name: "Travel Reels",
    emoji: "🎬",
    icon: Sparkles,
    description: "Short-form social media video packages & trends",
  },
];

export function CustomerCreatorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL parameters
  const categoryParam = searchParams.get("category") || "";
  const providerIdParam = searchParams.get("providerId") || searchParams.get("provider_id");
  const searchQuery = searchParams.get("q") || "";
  const sortBy = searchParams.get("sort_by") || "rating";
  const currentPage = Number(searchParams.get("page") || "1");

  const selectedCategorySlugs = categoryParam
    ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const [queryInput, setQueryInput] = useState(searchQuery);
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedCreator, setSelectedCreator] = useState<MarketplaceService | null>(null);

  const limit = 16;

  const fetchCreatorServices = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMarketplaceServices({
        category: categoryParam || "content-creator",
        q: searchQuery || undefined,
        sort_by: sortBy,
        page: currentPage,
        limit,
      });

      setServices(data.services || []);

      // If providerIdParam present in URL, select matching creator for detail view
      if (providerIdParam && data.services) {
        const found = data.services.find((s) => s.id === providerIdParam || s.provider_id === providerIdParam);
        if (found) setSelectedCreator(found);
      }
    } catch {
      setErrorMessage("Unable to load creator services.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryParam, searchQuery, sortBy, currentPage, providerIdParam]);

  useEffect(() => {
    fetchCreatorServices();
  }, [fetchCreatorServices]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    if (!newParams.page) next.set("page", "1");
    setSearchParams(next);
  };

  const handleCategoryToggle = (slug: string) => {
    let nextSlugs: string[];
    if (selectedCategorySlugs.includes(slug)) {
      nextSlugs = selectedCategorySlugs.filter((s) => s !== slug);
    } else {
      nextSlugs = [...selectedCategorySlugs, slug];
    }
    updateFilters({ category: nextSlugs.length > 0 ? nextSlugs.join(",") : null });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: queryInput.trim() || null });
  };

  const handleCloseDrawer = () => {
    setSelectedCreator(null);
    const next = new URLSearchParams(searchParams);
    next.delete("providerId");
    next.delete("provider_id");
    setSearchParams(next);
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Content Creator Marketplace"
        subtitle="Discover verified agri-tourism videographers, drone cinematographers, and travel storytellers."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCreatorServices}
            disabled={isLoading}
            className="gap-1.5 rounded-xl font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* ── 1. Default Predefined Creator Category Cards (CRITICAL REQUIREMENT) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Creator Categories</h3>
          {selectedCategorySlugs.length > 0 && (
            <button
              onClick={() => updateFilters({ category: null })}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Clear category filters ({selectedCategorySlugs.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEFAULT_CREATOR_CATEGORIES.map((cat) => {
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
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{cat.name}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{cat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Search Bar ── */}
      <Card className="p-4 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search videographers, drone packages, reels..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button type="submit" size="sm" className="h-10 rounded-xl font-bold bg-harvest-600 hover:bg-harvest-700 text-white">
            Search
          </Button>
        </form>
      </Card>

      {/* ── 3. Creator Service Grid ── */}
      <ServiceGrid
        services={services}
        isLoading={isLoading}
        error={errorMessage}
        onRetry={fetchCreatorServices}
        columns={4}
        skeletonCount={8}
        emptyTitle="No creator services found"
        emptyDescription="We couldn't find any creator services matching your selected filters."
        emptyActionLabel={selectedCategorySlugs.length > 0 || searchQuery ? "Clear Filters" : undefined}
        onEmptyAction={() => {
          setQueryInput("");
          setSearchParams(new URLSearchParams());
        }}
      />

      {/* ── 4. Creator Detail View Modal / Drawer ── */}
      <Dialog
        isOpen={Boolean(selectedCreator)}
        onClose={handleCloseDrawer}
        title={selectedCreator?.title || "Creator Package Details"}
        className="max-w-xl"
      >
        {selectedCreator && (
          <div className="space-y-4 py-2">
            {selectedCreator.primary_image && (
              <img
                src={selectedCreator.primary_image}
                alt={selectedCreator.title}
                className="w-full h-48 rounded-2xl object-cover"
              />
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                  Verified Creator
                </Badge>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  ₹{selectedCreator.price} <span className="text-xs font-normal text-slate-500">/ package</span>
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedCreator.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedCreator.description}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Creator Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCreator.provider_name || "Verified Creator"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Base Location</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{selectedCreator.location || "Bengaluru / Karnataka"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Rating</span>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{selectedCreator.rating != null ? Number(selectedCreator.rating).toFixed(1) : "0.0"} ({selectedCreator.reviews_count || 0} reviews)</span>
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
                  navigate(`/messages?provider_id=${selectedCreator.provider_id || selectedCreator.id}&subject=${encodeURIComponent(selectedCreator.title)}`);
                }}
                className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl"
              >
                Collaborate & Message
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export function CustomerCreatorDetailPage() {
  return <CustomerCreatorsPage />;
}
