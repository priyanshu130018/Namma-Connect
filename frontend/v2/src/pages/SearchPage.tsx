/**
 * Global search results — farms, experiences and activities in one grid.
 * Reads the query from the URL (?q=…) so results are shareable, with
 * location / category / price filters and loading + empty states.
 * Data: mock GET /search (mockApi.search).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "@/lib/router-compat";
import Navbar from "@/components/layout/navbar";
import { FiArrowRight, FiMapPin, FiSearch, FiStar } from "react-icons/fi";
import { Card } from "@/components/kit/Card";
import { Field, Select } from "@/components/kit/Field";
import { Badge, EmptyState, SkeletonGrid, type Tone } from "@/components/kit/UI";
import { Button } from "@/components/kit/Button";
import { mockApi, type SearchResultItem } from "@/services/mockApi";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const KIND_META: Record<SearchResultItem["kind"], { label: string; tone: Tone }> = {
  farm: { label: "Farm stay", tone: "role" },
  experience: { label: "Experience", tone: "info" },
  activity: { label: "Activity", tone: "warning" },
};

const PRICE_RANGES = [
  { value: "any", label: "Any price", min: undefined as number | undefined, max: undefined as number | undefined },
  { value: "lt1000", label: "Under ₹1,000", min: undefined, max: 1000 },
  { value: "1000-2500", label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { value: "2500-5000", label: "₹2,500 – ₹5,000", min: 2500, max: 5000 },
  { value: "gt5000", label: "Above ₹5,000", min: 5000, max: undefined },
];

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlQuery = String((location.search as Record<string, unknown>)?.["q"] ?? "");

  const [query, setQuery] = useState(urlQuery);
  const [locationFilter, setLocationFilter] = useState("");
  const [category, setCategory] = useState("");
  const [priceRange, setPriceRange] = useState("any");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [facets, setFacets] = useState<{ locations: string[]; categories: string[] }>({
    locations: [],
    categories: [],
  });
  const debounceRef = useRef<number | undefined>(undefined);

  // Keep the input in sync when the URL query changes (navbar searches).
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  const range = useMemo(
    () => PRICE_RANGES.find((r) => r.value === priceRange) ?? PRICE_RANGES[0]!,
    [priceRange],
  );

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = window.setTimeout(() => {
      const params: Parameters<typeof mockApi.search>[0] = { q: query };
      if (locationFilter) params.location = locationFilter;
      if (category) params.category = category;
      if (range.min != null) params.minPrice = range.min;
      if (range.max != null) params.maxPrice = range.max;
      mockApi.search(params).then((res) => {
          setResults(res.items);
          setFacets({ locations: res.locations, categories: res.categories });
          setLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, locationFilter, category, range]);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`, { replace: true });
  };

  const clearFilters = () => {
    setLocationFilter("");
    setCategory("");
    setPriceRange("any");
  };
  const filtersActive = !!(locationFilter || category || priceRange !== "any");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Search Namma Connect
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find farm stays, experiences and activities across Karnataka, Kerala and beyond.
        </p>
      </div>

      {/* Search + filters */}
      <Card className="mb-6 space-y-4">
        <form onSubmit={submit} className="relative" role="search">
          <FiSearch
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search farms, experiences, activities, places…"
            aria-label="Search farms, experiences and activities"
            className="input-field w-full py-3 pl-11 pr-4 text-sm"
          />
        </form>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Location">
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              aria-label="Filter by location"
            >
              <option value="">All locations</option>
              {facets.locations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {facets.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Price range">
            <Select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              aria-label="Filter by price range"
            >
              {PRICE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <p className="text-muted-foreground">
            {loading ? (
              "Searching…"
            ) : (
              <>
                <span className="font-semibold text-foreground">{results.length}</span>{" "}
                result{results.length === 1 ? "" : "s"}
                {query.trim() ? (
                  <>
                    {" "}for “<span className="font-medium text-foreground">{query.trim()}</span>”
                  </>
                ) : null}
              </>
            )}
          </p>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-role hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<FiSearch />}
          title="No results found"
          description="Try a different keyword, widen the price range, or clear the filters."
          action={
            filtersActive ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => {
            const kind = KIND_META[r.kind] ?? KIND_META.farm;
            return (
              <Card key={`${r.kind}-${r.id}`} padded={false} hover className="flex flex-col overflow-hidden">
                <div className="relative">
                  <img src={r.image} alt={r.title} loading="lazy" className="h-44 w-full object-cover" />
                  <span className="absolute left-3 top-3">
                    <Badge tone={kind.tone} className="shadow-sm">{kind.label}</Badge>
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug text-foreground">{r.title}</h2>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">
                      <FiStar size={13} className="fill-warning text-warning" /> {r.rating}
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FiMapPin size={13} /> {r.location}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.meta}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">{inr(r.price)}</span>{" "}
                      <span className="text-muted-foreground">{r.kind === "farm" ? "/ night" : "/ person"}</span>
                    </p>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-role hover:underline"
                    >
                      View <FiArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </main>
    </div>
  );
}
