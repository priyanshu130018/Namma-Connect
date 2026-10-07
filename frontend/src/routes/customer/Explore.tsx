import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  RefreshCw,
  MapPin,
  MapPinOff,
  Compass,
  Sparkles,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { ServiceCardSkeleton } from "@/components/cards/ServiceCardSkeleton";
import { Button } from "@/components/ui/button";
import { SearchFilterBar, Pagination } from "@/components/marketplace";
import {
  getMarketplaceServices,
  getExploreFeed,
  recordUserInteraction,
  ExploreFeedData,
  ExploreCategory,
} from "@/services/marketplaceService";
import { SearchResultData, SearchSuggestion } from "@/types";

// Default fallback 10 official categories if feed is loading
const DEFAULT_10_CATEGORIES: ExploreCategory[] = [
  { id: "c1", slug: "farm", name: "Farm Tours & Experiences" },
  { id: "c2", slug: "adventure", name: "Adventure & Trekking" },
  { id: "c3", slug: "water-sports", name: "Water Sports & Activities" },
  { id: "c4", slug: "wildlife", name: "Wildlife Tours" },
  { id: "c5", slug: "food", name: "Food Tours & Cooking" },
  { id: "c6", slug: "cultural-historical", name: "Cultural & Historical Tours" },
  { id: "c7", slug: "photography", name: "Photography" },
  { id: "c8", slug: "videography", name: "Videography" },
  { id: "c9", slug: "drone-aerial", name: "Drone & Aerial" },
  { id: "c10", slug: "travel-reels", name: "Travel Reels" },
];

export function CustomerExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read URL query parameters
  const activeCategory = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("q") || searchParams.get("place") || "";
  const locationParam = searchParams.get("location") || "";
  const maxPriceParam = searchParams.get("max_price") ? Number(searchParams.get("max_price")) : 5000;
  const sortByParam = searchParams.get("sort_by") || "rating";
  const currentPage = searchParams.get("page") ? Number(searchParams.get("page")) : 1;

  // Local state
  const [queryInput, setQueryInput] = useState(searchQuery);

  // Progressive Personalization Explore Feed State
  const [exploreFeed, setExploreFeed] = useState<ExploreFeedData | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Stable Session Randomization Seed
  const sessionSeed = useRef<number>(Math.floor(Math.random() * 10000000)).current;

  // Filtered/Catalog Search Data
  const PAGE_LIMIT = 16;
  const [searchData, setSearchData] = useState<SearchResultData>({
    query: searchQuery,
    results: [],
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
  });
  const [isLoadingSearch, setIsLoadingSearch] = useState<boolean>(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);

  // Is user in Discovery Mode (Home explore view) vs Search/Filter Mode
  const isDiscoveryMode =
    activeCategory === "all" &&
    !searchQuery &&
    !locationParam &&
    maxPriceParam === 5000 &&
    (sortByParam === "rating" || sortByParam === "recommended") &&
    currentPage === 1;

  // ── Fetch Progressive Explore Feed ──
  const fetchExploreFeed = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedError(null);
    try {
      const feed = await getExploreFeed(locationParam || undefined, sessionSeed);
      setExploreFeed(feed);
    } catch {
      setFeedError("Unable to load explore recommendations.");
    } finally {
      setIsLoadingFeed(false);
    }
  }, [locationParam, sessionSeed]);

  // ── Fetch Filtered Search Results ──
  const fetchSearchResults = useCallback(async () => {
    if (isDiscoveryMode) return;
    setIsLoadingSearch(true);
    setSearchErrorMessage(null);
    try {
      const data = await getMarketplaceServices({
        category: activeCategory !== "all" ? activeCategory : undefined,
        location: locationParam || undefined,
        q: searchQuery || undefined,
        max_price: maxPriceParam < 5000 ? maxPriceParam : undefined,
        sort_by: sortByParam,
        page: currentPage,
        limit: PAGE_LIMIT,
      });
      setSearchData({
        query: searchQuery,
        results: data.services || [],
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || PAGE_LIMIT,
      });
    } catch {
      setSearchErrorMessage("Unable to connect to marketplace service.");
    } finally {
      setIsLoadingSearch(false);
    }
  }, [isDiscoveryMode, activeCategory, locationParam, searchQuery, maxPriceParam, sortByParam, currentPage]);

  useEffect(() => {
    fetchExploreFeed();
  }, [fetchExploreFeed]);

  useEffect(() => {
    if (!isDiscoveryMode) {
      fetchSearchResults();
    }
  }, [fetchSearchResults, isDiscoveryMode]);

  useEffect(() => {
    setQueryInput(searchQuery);
  }, [searchQuery]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      return next;
    });
  };

  const handleApplyFilters = (filters: {
    category: string;
    location: string;
    sortBy: string;
    maxPrice?: number;
  }) => {
    if (filters.category && filters.category !== "all") {
      recordUserInteraction("category_click", undefined, { category_slug: filters.category });
    }
    updateFilters({
      category: filters.category !== "all" ? filters.category : null,
      location: filters.location || null,
      sort_by: filters.sortBy && filters.sortBy !== "rating" && filters.sortBy !== "recommended" ? filters.sortBy : null,
      max_price: filters.maxPrice && filters.maxPrice < 5000 ? String(filters.maxPrice) : null,
      page: "1",
    });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = queryInput.trim();
    if (trimmed) {
      // Collect behavioral interaction signal: search
      recordUserInteraction("search", undefined, { query: trimmed, location: locationParam });
    }
    updateFilters({ q: trimmed || null, page: "1" });
  };

  const handleCategoryClick = (categorySlug: string) => {
    // Collect behavioral interaction signal: category click
    recordUserInteraction("category_click", undefined, { category_slug: categorySlug });
    updateFilters({ category: categorySlug !== "all" ? categorySlug : null, page: "1" });
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    const selectedText = suggestion.text || suggestion.title;
    setQueryInput(selectedText);

    if (suggestion.type === "category" && suggestion.category) {
      handleCategoryClick(suggestion.category);
    } else if (suggestion.slug || suggestion.id) {
      recordUserInteraction("click_result", suggestion.id, { text: selectedText });
      navigate(`/services/${suggestion.slug || suggestion.id}`);
    } else {
      recordUserInteraction("search", undefined, { query: selectedText });
      updateFilters({ q: selectedText, page: "1" });
    }
  };

  const handleResetFilters = () => {
    setQueryInput("");
    setSearchParams(new URLSearchParams());
  };

  // Randomized categories list from feed or fallback
  const displayedCategories: ExploreCategory[] =
    exploreFeed?.categories && exploreFeed.categories.length === 10
      ? exploreFeed.categories
      : DEFAULT_10_CATEGORIES;

  const filteredSearchResults = searchData.results;

  const totalPages = Math.ceil(searchData.total / PAGE_LIMIT) || 1;

  return (
    <div className="space-y-8 pb-16">
      {/* ── Page Header ── */}
      <PageHeader
        title="Explore Karnataka"
        subtitle="Discover verified farm tours, trekking, water sports, culinary experiences, and creator packages across Karnataka."
      />

      {/* ── Unified Search & Filter Controls Bar ── */}
      <SearchFilterBar
        searchQuery={queryInput}
        onSearchChange={(val: string) => {
          setQueryInput(val);
        }}
        selectedLocation={locationParam}
        selectedCategory={activeCategory}
        sortBy={sortByParam}
        maxPrice={maxPriceParam}
        placeholder="Search farm stays, trekking, activities, food..."
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onSubmit={() => handleSearchSubmit()}
        onSelectSuggestion={(sugg: any) => handleSelectSuggestion(sugg)}
      />

      {/* ─────────────────────────────────────────────────────────────
          MODE A: PROGRESSIVE PERSONALIZATION DISCOVERY FEED
          Rendered when user is in general discovery mode without active query
      ───────────────────────────────────────────────────────────── */}
      {isDiscoveryMode && (
        <div className="space-y-12">
          {/* Feed Loading Skeletons */}
          {isLoadingFeed && (
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <ServiceCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feed Error Fallback */}
          {!isLoadingFeed && feedError && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-6 text-center space-y-2">
              <AlertCircle className="h-6 w-6 text-rose-600 mx-auto" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold">{feedError}</p>
              <Button size="sm" onClick={fetchExploreFeed} className="gap-1 font-bold">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          )}

          {!isLoadingFeed && exploreFeed && (
            <>
              {/* ── SECTION: NEARBY PLACES (Only when valid location exists) ── */}
              {exploreFeed.nearby_places && exploreFeed.nearby_places.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          Nearby Places
                        </h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {exploreFeed.user_signals.location || locationParam}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Top-rated experiences verified closest to your location.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {exploreFeed.nearby_places.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── SECTION: BECAUSE YOU VISITED (Only with real interaction history) ── */}
              {exploreFeed.because_you_visited && exploreFeed.because_you_visited.items?.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Compass className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          Because You Visited
                        </h2>
                      </div>
                      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
                        {exploreFeed.because_you_visited.context}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {exploreFeed.because_you_visited.items.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── SECTION: PERSONALIZED FOR YOU (Only with sufficient preferences or history) ── */}
              {exploreFeed.personalized_for_you && exploreFeed.personalized_for_you.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          Personalized For You
                        </h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          AI Matched
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Ranked using your travel preferences, interests, and behavioral signals.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {exploreFeed.personalized_for_you.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── SECTION: TOP & MOST VISITED (Authoritative composite marketplace metrics) ── */}
              {exploreFeed.top_and_most_visited && exploreFeed.top_and_most_visited.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Top & Most Visited
                      </h2>
                      <p className="text-xs text-slate-500">
                        Verified Karnataka experiences with the highest traveler ratings and bookings.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {exploreFeed.top_and_most_visited.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Cold Start / Location Nudge ── */}
              {!exploreFeed.user_signals.has_location && (
                <div className="rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MapPinOff className="h-6 w-6 text-emerald-600 shrink-0" />
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Want to see experiences near you?
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Enable location or pick a district to unlock localized recommendations.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="shrink-0 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    Select Location
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE B: FILTERED / SEARCH CATALOG GRID
          Rendered when user picks a specific category, enters search query, or alters filters
      ───────────────────────────────────────────────────────────── */}
      {!isDiscoveryMode && (
        <div className="space-y-6">
          {/* Results Info Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {searchQuery
                ? `Showing ${filteredSearchResults.length} results for "${searchQuery}"`
                : activeCategory !== "all"
                ? `Showing ${filteredSearchResults.length} in ${
                    displayedCategories.find((c) => c.slug === activeCategory)?.name || activeCategory
                  }`
                : `Showing ${filteredSearchResults.length} of ${searchData.total} items`}
            </span>
            <button
              onClick={handleResetFilters}
              className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
            >
              Clear filters & back to Explore
            </button>
          </div>

          {/* Search Loading Grid */}
          {isLoadingSearch && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Search Error State */}
          {!isLoadingSearch && searchErrorMessage && (
            <div className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-8 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Unable to load offerings</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{searchErrorMessage}</p>
              <Button size="sm" onClick={fetchSearchResults} className="gap-1.5 font-bold">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </Button>
            </div>
          )}

          {/* Service Results Grid */}
          {!isLoadingSearch && !searchErrorMessage && filteredSearchResults.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredSearchResults.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>

              {/* Pagination */}
              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={searchData.total}
                  itemsPerPage={PAGE_LIMIT}
                  isLoading={isLoadingSearch}
                  onPageChange={(page) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("page", String(page));
                    setSearchParams(next);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}
            </>
          )}

          {/* No Results State */}
          {!isLoadingSearch && !searchErrorMessage && filteredSearchResults.length === 0 && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
              <Search className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No offerings found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search keywords, price filter, or choose a different category.
              </p>
              <Button size="sm" onClick={handleResetFilters} className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl">
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
