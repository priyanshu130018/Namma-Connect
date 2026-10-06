import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import {
  SearchBar,
  CategoryFilter,
  SortControl,
  ServiceGrid,
  Pagination,
  CategoryItem,
} from "@/components/marketplace";
import { getMarketplaceServices } from "@/services/marketplaceService";
import { MarketplaceService } from "@/types";
import { ListingPageConfig, resolveCategory } from "@/config/listingConfig";

const PAGE_LIMIT = 16;

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "1000", label: "Under ₹1,000" },
  { value: "2500", label: "Under ₹2,500" },
  { value: "5000", label: "Under ₹5,000" },
  { value: "10000", label: "Under ₹10,000" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "3", label: "3.0+ stars" },
  { value: "4", label: "4.0+ stars" },
  { value: "4.5", label: "4.5+ stars" },
];

export interface ListingPageProps {
  config: ListingPageConfig;
}

/**
 * Generic, URL-state-driven listing page:
 *   Category tabs → Search → Filters → Sort → Card grid → Pagination
 * Powers both Explore and Experience from a single implementation.
 */
export function ListingPage({ config }: ListingPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryId = searchParams.get("category") || config.defaultCategory;
  const q = searchParams.get("q") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const minRating = searchParams.get("min_rating") || "";
  const sortBy = searchParams.get("sort_by") || "rating";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [searchInput, setSearchInput] = useState(q);
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  // Bumped by "Try again" to force a refetch even when params are unchanged.
  const [reloadKey, setReloadKey] = useState(0);

  const activeCategory = useMemo(
    () => resolveCategory(config, categoryId),
    [config, categoryId]
  );

  // Keep the search box in sync with the URL (back/forward navigation).
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      });
      if (resetPage) next.delete("page");
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getMarketplaceServices({
          category: activeCategory.apiCategory,
          q: q || undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          min_rating: minRating ? Number(minRating) : undefined,
          sort_by: sortBy,
          page,
          limit: PAGE_LIMIT,
        });
        if (cancelled) return;
        setServices(result.services || []);
        setTotal(result.total || 0);
        setTotalPages(result.total_pages || 1);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.detail || err?.message || "Failed to load listings."
        );
        setServices([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory.apiCategory, activeCategory.id, q, maxPrice, minRating, sortBy, page, reloadKey]);

  const categoryItems: CategoryItem[] = config.categories.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
  }));

  const hasActiveFilters = Boolean(q || maxPrice || minRating);

  const clearAll = () => {
    setSearchInput("");
    updateParams({ q: undefined, max_price: undefined, min_rating: undefined });
  };

  // Re-run the current query (used by the grid's error "Try again").
  const handleRetry = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {config.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          {activeCategory.description || config.subtitle}
        </p>
      </div>

      {/* Category tabs */}
      <CategoryFilter
        categories={categoryItems}
        selectedCategory={activeCategory.id}
        onSelectCategory={(id) => updateParams({ category: id })}
      />

      {/* Search + filter toggle + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => updateParams({ q: searchInput.trim() || undefined })}
          onClear={() => {
            setSearchInput("");
            updateParams({ q: undefined });
          }}
          placeholder={config.searchPlaceholder}
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            aria-label="Toggle filters"
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              showFilters || hasActiveFilters
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] text-white">
                {[q, maxPrice, minRating].filter(Boolean).length}
              </span>
            )}
          </button>
          <SortControl value={sortBy} onChange={(v) => updateParams({ sort_by: v })} />
        </div>
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-max-price"
              className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Max price
            </label>
            <select
              id="filter-max-price"
              value={maxPrice}
              onChange={(e) => updateParams({ max_price: e.target.value || undefined })}
              className="h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {PRICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-min-rating"
              className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Rating
            </label>
            <select
              id="filter-min-rating"
              value={minRating}
              onChange={(e) => updateParams({ min_rating: e.target.value || undefined })}
              className="h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {RATING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl px-3 text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Result count */}
      {!isLoading && !error && (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {total > 0 ? (
            <>
              <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span>{" "}
              {total === 1 ? "listing" : "listings"} in{" "}
              <span className="font-semibold">{activeCategory.label}</span>
            </>
          ) : (
            <>No listings in {activeCategory.label}</>
          )}
        </p>
      )}

      {/* Grid */}
      <ServiceGrid
        services={services}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        columns={config.columns || 4}
        skeletonCount={PAGE_LIMIT}
        emptyTitle={config.emptyTitle}
        emptyDescription={config.emptyDescription}
        emptyActionLabel={hasActiveFilters ? "Clear filters" : undefined}
        onEmptyAction={hasActiveFilters ? clearAll : undefined}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={PAGE_LIMIT}
        isLoading={isLoading}
        onPageChange={(p) => updateParams({ page: String(p) }, false)}
      />
    </div>
  );
}
