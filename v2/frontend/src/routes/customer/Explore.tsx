import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
  Wheat,
  TreePine,
  Car,
  Home,
  Utensils,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { ServiceCardSkeleton } from "@/components/cards/ServiceCardSkeleton";
import { Button } from "@/components/ui/button";
import { getSearchSuggestions, getMarketplaceServices } from "@/services/marketplaceService";
import { SearchResultData, SearchSuggestion } from "@/types";
import { useTranslation } from "@/i18n";

export function CustomerExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Read URL query parameters
  const activeCategory = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("q") || searchParams.get("place") || "";
  const maxPriceParam = searchParams.get("max_price") ? Number(searchParams.get("max_price")) : 5000;
  const sortByParam = searchParams.get("sort_by") || "rating";
  const currentPage = searchParams.get("page") ? Number(searchParams.get("page")) : 1;

  // Local state
  const [queryInput, setQueryInput] = useState(searchQuery);
  const [maxPrice, setMaxPrice] = useState<number>(maxPriceParam);
  const [sortBy, setSortBy] = useState<string>(sortByParam);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Data fetching state
  const [searchData, setSearchData] = useState<SearchResultData>({
    query: searchQuery,
    results: [],
    total: 0,
    page: 1,
    limit: 12,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories = [
    { label: "All Offerings", slug: "all", icon: Compass },
    { label: t("search.experiences"), slug: "experiences", icon: Wheat },
    { label: t("search.activities"), slug: "activities", icon: TreePine },
    { label: t("search.farms"), slug: "farms", icon: Wheat },
    { label: t("search.stays"), slug: "stay", icon: Home },
    { label: t("search.events"), slug: "events", icon: CalendarDays },
    { label: t("search.food"), slug: "food", icon: Utensils },
    { label: t("search.travelServices"), slug: "travel-services", icon: Car },
    { label: t("search.guidesTours"), slug: "guides-tours", icon: TreePine },
  ];

  // Fetch search results
  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMarketplaceServices({
        category: activeCategory !== "all" ? activeCategory : undefined,
        location: searchQuery || undefined,
        max_price: maxPrice,
        sort_by: sortBy,
        page: currentPage,
        limit: 12,
      });
      setSearchData({
        query: searchQuery,
        results: data.services || [],
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 12,
      });
    } catch {
      setErrorMessage(t("search.searchUnavailable"));
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery, maxPrice, sortBy, currentPage, t]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Sync search input with URL param if changed externally
  useEffect(() => {
    setQueryInput(searchQuery);
  }, [searchQuery]);

  // Handle outside clicks to dismiss suggestions dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced suggestions fetching
  const handleInputChange = (val: string) => {
    setQueryInput(val);
    setActiveSuggestionIdx(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const fetched = await getSearchSuggestions(val.trim());
        setSuggestions(fetched);
        setShowSuggestions(fetched.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 280);
  };

  const updateFilters = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    // Reset page to 1 when changing filters
    if (!newParams.page) {
      next.set("page", "1");
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    updateFilters({ q: queryInput.trim() || null });
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    const selectedText = suggestion.text || suggestion.title;
    setQueryInput(selectedText);
    setShowSuggestions(false);

    if (suggestion.type === "category" && suggestion.category) {
      updateFilters({ category: suggestion.category, q: null });
    } else if (suggestion.slug || suggestion.id) {
      navigate(`/app/services/${suggestion.slug || suggestion.id}`);
    } else {
      updateFilters({ q: selectedText });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearchSubmit();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIdx >= 0 && activeSuggestionIdx < suggestions.length) {
        handleSelectSuggestion(suggestions[activeSuggestionIdx]);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleClearSearch = () => {
    setQueryInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    updateFilters({ q: null });
  };

  const handleResetFilters = () => {
    setQueryInput("");
    setMaxPrice(5000);
    setSortBy("rating");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchParams(new URLSearchParams());
  };

  const filteredServices = searchData.results.filter((service) => {
    if (maxPrice && service.price > maxPrice) return false;
    return true;
  });

  const totalPages = Math.ceil(searchData.total / 12) || 1;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("search.title")}
        subtitle={t("home.heroSubtitle")}
      />

      {/* ── Global Search & Filter Bar ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input with Debounced Autocomplete */}
          <div ref={searchContainerRef} className="sm:col-span-6 relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by estate, crop, or district (e.g. Coorg, Tea, Pepper)..."
                value={queryInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-20 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-harvest-600 dark:focus:border-harvest-500 focus:ring-2 focus:ring-harvest-600/20 shadow-sm transition-colors"
              />
              {queryInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={t("common.clear")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-harvest-600 hover:bg-harvest-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                {t("common.search")}
              </button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-fade-in">
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
                  {t("search.suggestionsHeader")}
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {suggestions.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className={`flex items-center justify-between px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                        activeSuggestionIdx === idx
                          ? "bg-harvest-50 dark:bg-harvest-950/60 text-harvest-900 dark:text-harvest-200 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {item.type === "category" ? (
                          <Compass className="h-3.5 w-3.5 text-harvest-600 shrink-0" />
                        ) : (
                          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{item.text || item.title}</span>
                      </div>
                      {item.location && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                          {item.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Range Filter */}
          <div className="sm:col-span-3 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 shadow-sm">
            <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                Max: ₹{maxPrice}
              </span>
              <input
                type="range"
                min="400"
                max="5000"
                step="200"
                value={maxPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxPrice(val);
                  updateFilters({ max_price: String(val) });
                }}
                className="accent-harvest-600 cursor-pointer h-1.5 w-20 sm:w-28"
              />
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="sm:col-span-3 relative flex items-center">
            <ArrowUpDown className="absolute left-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => {
                const val = e.target.value;
                setSortBy(val);
                updateFilters({ sort_by: val });
              }}
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-harvest-600 shadow-sm"
            >
              <option value="rating">Top Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Listed</option>
            </select>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => updateFilters({ category: cat.slug })}
                className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-harvest-600 text-white shadow-sm"
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <CatIcon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results Info Bar ── */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {searchQuery
            ? t("search.resultsCount", { count: filteredServices.length, query: searchQuery })
            : `Showing ${filteredServices.length} of ${searchData.total} experiences`}
        </span>
        {(activeCategory !== "all" || searchQuery || maxPrice < 5000) && (
          <button
            onClick={handleResetFilters}
            className="text-harvest-700 dark:text-harvest-400 font-bold hover:underline"
          >
            {t("common.clearSearch")}
          </button>
        )}
      </div>

      {/* ── Loading Skeleton Grid ── */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Error State ── */}
      {!isLoading && errorMessage && (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t("search.searchUnavailable")}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{errorMessage}</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button size="sm" onClick={fetchResults} className="gap-1.5 font-bold">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t("search.tryAgain")}</span>
            </Button>
            <Link to="/app">
              <Button variant="outline" size="sm" className="font-bold">
                {t("common.browseHome")}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Service Results Grid ── */}
      {!isLoading && !errorMessage && filteredServices.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", String(currentPage - 1));
                  setSearchParams(next);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="gap-1 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", String(currentPage + 1));
                  setSearchParams(next);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="gap-1 rounded-xl"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Comprehensive No-Results State ── */}
      {!isLoading && !errorMessage && filteredServices.length === 0 && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-5 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto">
            <Search className="h-8 w-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t("search.noResultsTitle")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("search.noResultsDesc", { query: searchQuery || "filters" })}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/app">
              <Button variant="default" size="sm" className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl">
                {t("common.browseHome")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="font-bold rounded-xl border-slate-200 dark:border-slate-700"
            >
              {t("common.clearSearch")}
            </Button>
          </div>

          {/* Alternative Category Suggestions */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-xs font-semibold text-slate-400">
              {t("search.popularSuggestions")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: t("search.experiences"), slug: "experiences" },
                { label: t("search.farms"), slug: "farms" },
                { label: t("search.food"), slug: "food" },
                { label: t("search.events"), slug: "events" },
                { label: t("search.travelServices"), slug: "travel-services" },
              ].map((sug) => (
                <button
                  key={sug.slug}
                  type="button"
                  onClick={() => updateFilters({ category: sug.slug, q: null })}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-harvest-50 dark:hover:bg-harvest-950/60 hover:text-harvest-700 dark:hover:text-harvest-300 transition-colors"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
