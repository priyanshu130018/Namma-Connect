import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Sparkles,
  Wheat,
  Compass,
  Car,
  Home,
  Utensils,
  CalendarDays,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { ServiceCardSkeleton } from "@/components/cards/ServiceCardSkeleton";
import { getMarketplaceServices, getSearchSuggestions } from "@/services/marketplaceService";
import { MarketplaceService, SearchSuggestion } from "@/types";
import { EXPLORE_CATEGORIES } from "@/features/customer/data/customerData";

export function CustomerHomePage() {
  const navigate = useNavigate();
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("all");
  const [isSearching, setIsSearching] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Recommended services state
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categoryIcons: Record<string, React.ElementType> = {
    Wheat: Wheat,
    Compass: Compass,
    Car: Car,
    Home: Home,
    Utensils: Utensils,
    CalendarDays: CalendarDays,
  };

  // Debounced search suggestions
  useEffect(() => {
    if (!place || place.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await getSearchSuggestions(place);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [place]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRecommendedServices = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getMarketplaceServices({ limit: 6, sort_by: "rating" });
      setServices(data.services);
    } catch (err: any) {
      setLoadError("Unable to load recommended services at this moment.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendedServices();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    const params = new URLSearchParams();
    if (place.trim()) params.append("place", place.trim());
    if (date) params.append("date", date);
    if (category !== "all") params.append("category", category);
    navigate(`/app/explore?${params.toString()}`);
  };

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    setPlace(item.title);
    setShowSuggestions(false);
    navigate(`/app/explore?q=${encodeURIComponent(item.title)}`);
  };

  return (
    <div className="space-y-10 pb-12">
      {/* ── 1. Header Greeting ── */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-harvest-200 bg-harvest-50 px-3 py-1 text-xs font-bold text-harvest-800 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-harvest-700 dark:text-harvest-400" />
          <span>Agricultural Tourism Marketplace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Welcome to <span className="text-harvest-700 dark:text-harvest-400">NammaConnect</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Discover verified farm stays, guided botanical trails, harvest workshops, and regional creators across India.
        </p>
      </div>

      {/* ── 2. Advanced Search Bar (Main Content Area) ── */}
      <div ref={searchContainerRef} className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 px-1">
          What are you looking for?
        </p>
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Place Field with Auto-Suggest */}
          <div className="sm:col-span-4 relative flex items-center">
            <MapPin className="absolute left-3.5 h-4 w-4 text-harvest-700 dark:text-harvest-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Place (e.g. Coorg, Wayanad)"
              value={place}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setPlace(e.target.value);
                setShowSuggestions(true);
              }}
              className="h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 pl-10 pr-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-harvest-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-14 z-50 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                  Suggested Services & Locations
                </p>
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-harvest-50 dark:hover:bg-slate-800 hover:text-harvest-900 dark:hover:text-harvest-300 transition-colors"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mr-2">{item.title}</div>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.location.split(",")[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Field */}
          <div className="sm:col-span-3 relative flex items-center">
            <CalendarIcon className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 pl-10 pr-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-harvest-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3 relative flex items-center">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-3.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-harvest-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
            >
              <option value="all">All Categories</option>
              <option value="experiences">Experiences</option>
              <option value="guides-tours">Guides & Tours</option>
              <option value="travel-services">Travel Services</option>
              <option value="stay">Stay</option>
              <option value="food">Food & Dining</option>
              <option value="events">Events</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="sm:col-span-2">
            <Button
              type="submit"
              size="lg"
              isLoading={isSearching}
              className="h-12 w-full font-bold gap-2 rounded-2xl shadow-md bg-harvest-600 hover:bg-harvest-700 text-white"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </div>
        </form>
      </div>

      {/* ── 3. Explore Category Grid ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Explore Categories</h2>
            <p className="text-xs text-slate-500 mt-0.5">Browse curated agricultural offerings</p>
          </div>
          <Link
            to="/app/explore"
            className="inline-flex items-center gap-1 text-xs font-bold text-harvest-700 hover:text-harvest-800 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {EXPLORE_CATEGORIES.map((cat) => {
            const Icon = categoryIcons[cat.iconName] || Wheat;
            return (
              <Link key={cat.id} to={`/app/explore?category=${cat.slug}`}>
                <Card hover className="p-4 text-center group h-full flex flex-col items-center justify-center">
                  <div className="h-11 w-11 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-harvest-700 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {cat.count} listings
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 4. Recommended for You ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recommended for You</h2>
            <p className="text-xs text-slate-500 mt-0.5">Verified stays and top-rated agro-experiences</p>
          </div>
          <Link
            to="/app/explore"
            className="inline-flex items-center gap-1 text-xs font-bold text-harvest-700 hover:text-harvest-800 hover:underline"
          >
            <span>See more</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && loadError && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
            <AlertCircle className="h-6 w-6 text-rose-600 mx-auto" />
            <p className="text-xs text-rose-800 font-semibold">{loadError}</p>
            <Button size="sm" variant="outline" onClick={loadRecommendedServices} className="gap-1.5 font-bold">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {/* Real Services Grid */}
        {!isLoading && !loadError && services.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
