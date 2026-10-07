import React, { useState, useEffect, useRef, useId } from "react";
import {
  Search,
  X,
  Compass,
  ChevronDown,
  Navigation,
  Layers,
  Sprout,
  Mountain,
  Waves,
  PawPrint,
  Utensils,
  Landmark,
  Camera,
  Video,
  Sparkles,
  SlidersHorizontal,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSearchSuggestions } from "@/services/marketplaceService";
import { reverseGeocodeLocation } from "@/services/locationService";
import { SearchSuggestion } from "@/types";

export interface CategoryOption {
  slug: string;
  name: string;
  icon?: React.ElementType;
}

export const MARKETPLACE_CATEGORIES: CategoryOption[] = [
  { slug: "all", name: "All Categories", icon: Layers },
  { slug: "farm", name: "Farm Tours & Experiences", icon: Sprout },
  { slug: "adventure", name: "Adventure & Trekking", icon: Mountain },
  { slug: "water-sports", name: "Water Sports & Activities", icon: Waves },
  { slug: "wildlife", name: "Wildlife Tours", icon: PawPrint },
  { slug: "food", name: "Food Tours & Cooking", icon: Utensils },
  { slug: "cultural-historical", name: "Cultural & Historical Tours", icon: Landmark },
  { slug: "photography", name: "Photography", icon: Camera },
  { slug: "videography", name: "Videography", icon: Video },
  { slug: "drone-aerial", name: "Drone & Aerial", icon: Navigation },
  { slug: "travel-reels", name: "Travel Reels", icon: Sparkles },
];

export const KARNATAKA_DISTRICTS = [
  "Bengaluru Urban",
  "Bengaluru Rural",
  "Kodagu (Coorg)",
  "Chikkamagaluru",
  "Mysuru",
  "Hassan",
  "Udupi",
  "Dakshina Kannada (Mangaluru)",
  "Shivamogga",
  "Uttara Kannada (Karwar)",
  "Ballari (Hampi)",
  "Mandya",
  "Ramanagara",
  "Tumakuru",
  "Belagavi",
  "Dharwad",
];

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Top Rated" },
  { value: "popular", label: "Most Visited" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest Listed" },
];

export interface SearchFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedLocation?: string;
  onLocationChange?: (loc: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (cat: string) => void;
  sortBy?: string;
  onSortByChange?: (sort: string) => void;
  maxPrice?: number;
  onMaxPriceChange?: (price: number) => void;
  onReset?: () => void;
  onApply?: (filters: {
    category: string;
    location: string;
    sortBy: string;
    maxPrice?: number;
  }) => void;
  onSubmit?: () => void;
  onSelectSuggestion?: (item: SearchSuggestion) => void;
  placeholder?: string;
  showCategoryFilter?: boolean;
  showLocationFilter?: boolean;
  showSortFilter?: boolean;
  showPriceFilter?: boolean;
  className?: string;
}

export function SearchFilterBar({
  searchQuery = "",
  onSearchChange,
  selectedLocation = "",
  onLocationChange,
  selectedCategory = "all",
  onCategoryChange,
  sortBy = "recommended",
  onSortByChange,
  maxPrice,
  onMaxPriceChange,
  onReset,
  onApply,
  onSubmit,
  onSelectSuggestion,
  placeholder = "Search activities, places, experiences...",
  showCategoryFilter = true,
  showLocationFilter = true,
  showSortFilter = true,
  showPriceFilter = false,
  className = "",
}: SearchFilterBarProps) {
  const searchInputId = useId();

  // Local input state for smooth typing
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Staged Filter States for Popover (committed on Apply)
  const [stagedCategory, setStagedCategory] = useState(selectedCategory || "all");
  const [stagedLocation, setStagedLocation] = useState(selectedLocation || "");
  const [stagedSortBy, setStagedSortBy] = useState(sortBy || "recommended");
  const [stagedMaxPrice, setStagedMaxPrice] = useState(maxPrice || 5000);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Dropdown refs for click-outside & escape handling
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Sync staged filters when active props change from outside
  useEffect(() => {
    setStagedCategory(selectedCategory || "all");
    setStagedLocation(selectedLocation || "");
    setStagedSortBy(sortBy || "recommended");
    if (maxPrice !== undefined) setStagedMaxPrice(maxPrice);
  }, [selectedCategory, selectedLocation, sortBy, maxPrice]);

  // Handle click outside and Escape key to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(target)
      ) {
        setIsFilterPopoverOpen(false);
        // Reset uncommitted staged state back to committed props
        setStagedCategory(selectedCategory || "all");
        setStagedLocation(selectedLocation || "");
        setStagedSortBy(sortBy || "recommended");
      }
      if (
        searchInputContainerRef.current &&
        !searchInputContainerRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFilterPopoverOpen) {
          setIsFilterPopoverOpen(false);
          setStagedCategory(selectedCategory || "all");
          setStagedLocation(selectedLocation || "");
          setStagedSortBy(sortBy || "recommended");
          filterBtnRef.current?.focus();
        }
        if (showSuggestions) {
          setShowSuggestions(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterPopoverOpen, showSuggestions, selectedCategory, selectedLocation, sortBy]);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
    setActiveSuggestionIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getSearchSuggestions(val.trim());
        setSuggestions(results || []);
        setShowSuggestions((results || []).length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 280);
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    if (onSubmit) {
      onSubmit();
    }
  };

  const handleClearQuery = () => {
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSearchChange) onSearchChange("");
  };

  const handleTogglePopover = () => {
    if (!isFilterPopoverOpen) {
      // Initialize staged state when opening
      setStagedCategory(selectedCategory || "all");
      setStagedLocation(selectedLocation || "");
      setStagedSortBy(sortBy || "recommended");
      if (maxPrice !== undefined) setStagedMaxPrice(maxPrice);
    }
    setIsFilterPopoverOpen((prev) => !prev);
  };

  const handleApplyFilters = () => {
    if (onCategoryChange) onCategoryChange(stagedCategory);
    if (onLocationChange) onLocationChange(stagedLocation);
    if (onSortByChange) onSortByChange(stagedSortBy);
    if (onMaxPriceChange) onMaxPriceChange(stagedMaxPrice);

    if (onApply) {
      onApply({
        category: stagedCategory,
        location: stagedLocation,
        sortBy: stagedSortBy,
        maxPrice: stagedMaxPrice,
      });
    }

    setIsFilterPopoverOpen(false);
  };

  const handleResetFilters = () => {
    setStagedCategory("all");
    setStagedLocation("");
    setStagedSortBy("recommended");
    setStagedMaxPrice(5000);

    if (onReset) onReset();
    if (onCategoryChange) onCategoryChange("all");
    if (onLocationChange) onLocationChange("");
    if (onSortByChange) onSortByChange("recommended");
    if (onMaxPriceChange) onMaxPriceChange(5000);

    if (onApply) {
      onApply({
        category: "all",
        location: "",
        sortBy: "recommended",
        maxPrice: 5000,
      });
    }

    setIsFilterPopoverOpen(false);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await reverseGeocodeLocation(pos.coords.latitude, pos.coords.longitude);
          const districtName = res.district || res.locality || res.display_name?.split(",")[0] || "Karnataka";
          setStagedLocation(districtName);
        } catch {
          alert("Could not detect exact Karnataka district. Please choose manually.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        setIsDetectingLocation(false);
        alert("Location access was denied. Please select a district manually.");
      },
      { timeout: 8000 }
    );
  };

  // Count active filters for badge
  const activeFilterCount = [
    selectedCategory && selectedCategory !== "all",
    Boolean(selectedLocation),
    sortBy && sortBy !== "recommended" && sortBy !== "rating",
    maxPrice !== undefined && maxPrice < 5000,
  ].filter(Boolean).length;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ── Single Clean Horizontal Search & Filter Row ── */}
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        {/* 1. Free-Text Search Input with Autocomplete */}
        <div ref={searchInputContainerRef} className="relative flex-1">
          <form onSubmit={handleFormSubmit} className="relative flex items-center">
            <label htmlFor={searchInputId} className="sr-only">
              Search activities, places, experiences
            </label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id={searchInputId}
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-20 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/20 shadow-xs transition-all"
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClearQuery}
                className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Clear search text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Search
            </button>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              role="listbox"
              aria-label="Search suggestions"
              className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-in fade-in"
            >
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                Suggestions
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {suggestions.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    role="option"
                    aria-selected={activeSuggestionIdx === idx}
                    onClick={() => {
                      const text = item.text || item.title || "";
                      setInputValue(text);
                      setShowSuggestions(false);
                      if (onSelectSuggestion) {
                        onSelectSuggestion(item);
                      } else if (onSearchChange) {
                        onSearchChange(text);
                      }
                      if (onSubmit) onSubmit();
                    }}
                    className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition-colors ${
                      activeSuggestionIdx === idx
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Compass className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{item.text || item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Compact Filter Button on Right */}
        <div className="relative shrink-0">
          <button
            ref={filterBtnRef}
            type="button"
            onClick={handleTogglePopover}
            aria-expanded={isFilterPopoverOpen}
            aria-haspopup="dialog"
            aria-label="Open filter options"
            className={`h-11 px-3.5 sm:px-4 flex items-center gap-2 rounded-2xl border text-xs font-bold shadow-xs transition-all ${
              isFilterPopoverOpen || activeFilterCount > 0
                ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600/20"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">Filter</span>
            {activeFilterCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                isFilterPopoverOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* ── Compact Filter Popover ── */}
          {isFilterPopoverOpen && (
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-label="Filter Options"
              className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Filter className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Filters
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Refine marketplace results
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterPopoverOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close filters popover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Popover Body: Form Controls */}
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {/* 1. Category Selector */}
                {showCategoryFilter && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={stagedCategory}
                        onChange={(e) => setStagedCategory(e.target.value)}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 pr-8 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/20"
                      >
                        {MARKETPLACE_CATEGORIES.map((cat) => (
                          <option key={cat.slug} value={cat.slug} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* 2. Location Selector */}
                {showLocationFilter && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Location
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectGPS}
                        disabled={isDetectingLocation}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <Navigation className={`h-3 w-3 ${isDetectingLocation ? "animate-spin" : ""}`} />
                        <span>{isDetectingLocation ? "Detecting..." : "Use GPS"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        value={stagedLocation}
                        onChange={(e) => setStagedLocation(e.target.value)}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 pr-8 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/20"
                      >
                        <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          All Karnataka
                        </option>
                        {KARNATAKA_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {dist}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* 3. Sort By */}
                {showSortFilter && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Sort By
                    </label>
                    <div className="relative">
                      <select
                        value={stagedSortBy}
                        onChange={(e) => setStagedSortBy(e.target.value)}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 pr-8 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/20"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* 4. Optional Max Price Slider */}
                {showPriceFilter && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700 dark:text-slate-200">
                        Max Price
                      </label>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{stagedMaxPrice.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="15000"
                      step="500"
                      value={stagedMaxPrice}
                      onChange={(e) => setStagedMaxPrice(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Popover Footer: Reset & Apply Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="flex-1 h-9 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyFilters}
                  className="flex-1 h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
