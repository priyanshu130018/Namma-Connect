import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, Gem, Map, ArrowRight, LucideIcon, Sparkles } from "lucide-react";
import { SearchBar, ServiceGrid } from "@/components/marketplace";
import { getMarketplaceServices } from "@/services/marketplaceService";
import { MarketplaceService, ServiceFilterParams } from "@/types";

interface DiscoverSectionConfig {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  params: ServiceFilterParams;
  viewAllHref: string;
}

const SECTION_LIMIT = 8;

/** Reusable Discover row: fetches a small set and renders it in the shared grid. */
function DiscoverSection({ config }: { config: DiscoverSectionConfig }) {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const Icon = config.icon;

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMarketplaceServices({ ...config.params, limit: SECTION_LIMIT });
      setServices(result.services || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load this section.");
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${config.accent}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {config.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{config.description}</p>
          </div>
        </div>
        <Link
          to={config.viewAllHref}
          aria-label={`View all in ${config.title}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <span>View all</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <ServiceGrid
        services={services}
        isLoading={isLoading}
        error={error}
        onRetry={load}
        columns={4}
        skeletonCount={SECTION_LIMIT}
        emptyTitle="Nothing here yet"
        emptyDescription="New picks are added regularly — check back soon or explore the full marketplace."
      />
    </section>
  );
}

export function CustomerDiscoverPage() {
  const navigate = useNavigate();
  const [heroQuery, setHeroQuery] = useState("");

  const sections: DiscoverSectionConfig[] = [
    {
      key: "trending",
      title: "Trending Now",
      description: "The experiences travellers are booking most this season.",
      icon: TrendingUp,
      accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      params: { sort_by: "popular" },
      viewAllHref: "/explore?sort_by=popular",
    },
    {
      key: "hidden-gems",
      title: "Hidden Gems",
      description: "Highly-rated, lesser-known spots worth the detour.",
      icon: Gem,
      accent: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
      params: { min_rating: 4.5, sort_by: "rating" },
      viewAllHref: "/explore?min_rating=4.5&sort_by=rating",
    },
    {
      key: "travel-guides",
      title: "Travel Guides",
      description: "Guided tours, heritage trails and curated itineraries.",
      icon: Map,
      accent: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      params: { category: "cultural-historical,adventure", sort_by: "rating" },
      viewAllHref: "/explore?category=destinations&sort_by=rating",
    },
  ];

  const runHeroSearch = () => {
    const q = heroQuery.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/60 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 px-6 py-10 sm:px-10 sm:py-14 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Discover
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
            Find your next Karnataka story
          </h1>
          <p className="text-sm sm:text-base text-emerald-50/90">
            Get inspired by what's trending, uncover hidden gems, and follow curated travel guides across the state.
          </p>
          <div className="max-w-lg pt-1">
            <SearchBar
              value={heroQuery}
              onChange={setHeroQuery}
              onSubmit={runHeroSearch}
              onClear={() => setHeroQuery("")}
              placeholder="Search destinations, stays, experiences..."
            />
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {sections.map((s) => (
          <DiscoverSection key={s.key} config={s} />
        ))}
      </div>
    </div>
  );
}
