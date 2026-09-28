import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Calendar as CalendarIcon,
  Clock,
  Compass,
  Video,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Navigation,
  History,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { ServiceCardSkeleton } from "@/components/cards/ServiceCardSkeleton";
import {
  getMarketplaceServices,
  getHomeRecommendations,
  getRecentSearches,
  recordUserInteraction,
} from "@/services/marketplaceService";
import { reverseGeocodeLocation } from "@/services/locationService";
import { MarketplaceService } from "@/types";

export function CustomerHomePage() {
  const navigate = useNavigate();

  // Search, Date, Time state
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  // Popover state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 5 Database-backed Discovery Sections
  const [nearbyServices, setNearbyServices] = useState<MarketplaceService[]>([]);
  const [topRatedServices, setTopRatedServices] = useState<MarketplaceService[]>([]);
  const [mostVisitedServices, setMostVisitedServices] = useState<MarketplaceService[]>([]);
  const [thingsToVisitServices, setThingsToVisitServices] = useState<MarketplaceService[]>([]);
  const [thingsToDoServices, setThingsToDoServices] = useState<MarketplaceService[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Click outside listener for search dropdown popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch recent searches on focus
  const handleSearchFocus = async () => {
    setIsSearchFocused(true);
    setIsLoadingRecent(true);
    try {
      const searches = await getRecentSearches();
      setRecentSearches(searches || []);
    } catch {
      setRecentSearches([]);
    } finally {
      setIsLoadingRecent(false);
    }
  };

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
      } catch (err: any) {
        setLoadError("Unable to load discovery sections at this moment.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHomeServices();
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() && !date && !time) return;

    // Track search interaction
    if (searchQuery.trim()) {
      recordUserInteraction("search", undefined, { query: searchQuery.trim(), date, time });
    }

    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("q", searchQuery.trim());
    if (date) params.append("date", date);
    if (time) params.append("time", time);

    setIsSearchFocused(false);
    navigate(`/app/explore?${params.toString()}`);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geo = await reverseGeocodeLocation(latitude, longitude);
          const locationName =
            geo?.locality || geo?.district || geo?.display_name || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          setSearchQuery(locationName);
          setIsSearchFocused(false);
          recordUserInteraction("search", undefined, { location: locationName, lat: latitude, lon: longitude });
          navigate(`/app/explore?q=${encodeURIComponent(locationName)}`);
        } catch {
          const coordStr = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
          setSearchQuery(coordStr);
          setIsSearchFocused(false);
          navigate(`/app/explore?q=${encodeURIComponent(coordStr)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert("Unable to retrieve your location. Please check browser permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    setIsSearchFocused(false);
    recordUserInteraction("search", undefined, { query: term });
    navigate(`/app/explore?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="space-y-10 pb-12 max-w-7xl mx-auto">
      {/* ── 1. Search & Filter Header ── */}
      <div className="space-y-4 pt-2">
        {/* Simple Single-Line Search Bar */}
        <div ref={searchContainerRef} className="relative max-w-3xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="flex items-center w-full h-14 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-emerald-500 transition-all px-4 gap-3">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search activities, places, experiences..."
                value={searchQuery}
                onFocus={handleSearchFocus}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                className="rounded-xl px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Search Dropdown / Popover */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-in fade-in duration-150 p-2 space-y-2">
              {/* GPS / Use Current Location */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
              >
                <Navigation className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`} />
                <span>{isLocating ? "Detecting current location..." : "Use current location / GPS"}</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              {/* Quick Category Shortcuts */}
              <div className="grid grid-cols-2 gap-1.5 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    navigate("/app/activities");
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <Compass className="h-4 w-4 text-emerald-600" />
                  <span>Activities</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    navigate("/app/creators");
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <Video className="h-4 w-4 text-purple-600" />
                  <span>Content Creator</span>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              {/* Recent Search Locations */}
              <div className="px-1 py-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <History className="h-3 w-3" />
                  <span>Recent Searches</span>
                </div>

                {isLoadingRecent ? (
                  <div className="px-3 py-2 text-xs text-slate-400">Loading history...</div>
                ) : recentSearches.length > 0 ? (
                  <div className="space-y-0.5 mt-1">
                    {recentSearches.slice(0, 5).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectRecentSearch(item)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                      >
                        <span className="truncate font-medium">{item}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">No recent searches</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date and Time Selectors */}
        <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
          {/* Date Selector */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs shadow-xs">
            <CalendarIcon className="h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
            <span className="font-semibold text-slate-500 dark:text-slate-400">Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
          </div>

          {/* Time Selector */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs shadow-xs">
            <Clock className="h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
            <span className="font-semibold text-slate-500 dark:text-slate-400">Time:</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
          </div>

          {(date || time) && (
            <button
              type="button"
              onClick={() => {
                setDate("");
                setTime("");
              }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
            >
              Reset
            </button>
          )}
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

