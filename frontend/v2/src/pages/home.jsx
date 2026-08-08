import { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiStar, FiSearch, FiX, FiRefreshCw } from "react-icons/fi";
import { Link, useLocation } from "@/lib/router-compat";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SearchBar from "@/components/ui/searchBar";
import ItemCard from "@/components/ui/ListingCard";
import { aiAPI } from "@/services/api";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 4;           // cards shown initially per section
const LOAD_STEP = 4;           // how many more to reveal per click

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalize = (f) => ({ ...f, name: f.farm_name || f.name || "" });

export default function Home() {
  const location = useLocation();

  // ── Permanent data (always visible) ─────────────────────────────────────────
  const [allFarms,    setAllFarms]    = useState([]);
  const [allCreators, setAllCreators] = useState([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError,   setBaseError]   = useState("");

  // ── Visible counts (load more) ───────────────────────────────────────────────
  const [farmVisible,    setFarmVisible]    = useState(PAGE_SIZE);
  const [creatorVisible, setCreatorVisible] = useState(PAGE_SIZE);

  // ── Search state ─────────────────────────────────────────────────────────────
  const [query,     setQuery]     = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  // ── Search results (only visible after search, cleared on location change) ───
  const [searchFarms,    setSearchFarms]    = useState([]);
  const [searchCreators, setSearchCreators] = useState([]);
  const [searchLabel,    setSearchLabel]    = useState("");
  const [searching,      setSearching]      = useState(false);
  const [searchError,    setSearchError]    = useState("");
  const [sfVisible,      setSfVisible]      = useState(PAGE_SIZE);
  const [scVisible,      setScVisible]      = useState(PAGE_SIZE);

  // ── Load base data ────────────────────────────────────────────────────────────
  const loadBaseData = useCallback(async () => {
    setBaseLoading(true);
    setBaseError("");
    // Use the same endpoints that power search (proven to work)
    // Pass userId=0 and empty query → returns all farms/creators
    try {
      const [fRes, cRes] = await Promise.all([
        aiAPI.recommendFarms(0, "", "", "", ""),
        aiAPI.recommendCreators(0, "", "", ""),
      ]);
      setAllFarms((fRes.data || []).map(normalize));
      setAllCreators(cRes.data || []);
    } catch (err) {
      console.error("Home load error:", err);
      // silently keep empty — don't show error banner
    } finally {
      setBaseLoading(false);
    }
  }, []);

  useEffect(() => { loadBaseData(); }, [loadBaseData]);

  // Clear search results on navigation (location key changes on every push)
  useEffect(() => {
    setSearchFarms([]);
    setSearchCreators([]);
    setSearchLabel("");
    setSearchError("");
    setQuery("");
    setStartDate("");
    setEndDate("");
    setSfVisible(PAGE_SIZE);
    setScVisible(PAGE_SIZE);
  }, [location.key]);

  // ── Search / AI recommendation ────────────────────────────────────────────────
  const handleSearch = async () => {
    const q = query.trim();
    if (!q && !startDate && !endDate) return;

    setSearching(true);
    setSearchError("");
    setSfVisible(PAGE_SIZE);
    setScVisible(PAGE_SIZE);

    const user = (() => { try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; } })();
    const userId = user?.userId ?? 0;

    try {
      const [fRes, cRes] = await Promise.all([
        aiAPI.recommendFarms(userId, q, startDate, endDate, ""),
        aiAPI.recommendCreators(userId, q, startDate, endDate),
      ]);
      setSearchFarms((fRes.data || []).map(normalize));
      setSearchCreators(cRes.data || []);
      setSearchLabel(q || "your filters");
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchFarms([]);
    setSearchCreators([]);
    setSearchLabel("");
    setSearchError("");
    setQuery("");
    setStartDate("");
    setEndDate("");
  };

  const hasSearchResults = searchLabel !== "";

  // ── Sorting (by review count then rating) ─────────────────────────────────────
  const byRank = (a, b) => {
    const ra = Number(a.reviews || a.review_count || 0);
    const rb = Number(b.reviews || b.review_count || 0);
    if (rb !== ra) return rb - ra;
    return Number(b.rating || b.avg_rating || 0) - Number(a.rating || a.avg_rating || 0);
  };

  const sortedFarms    = [...allFarms].sort(byRank);
  const sortedCreators = [...allCreators].sort(byRank);

  // ── Section component ─────────────────────────────────────────────────────────
  const CardSection = ({
    title, subtitle, accent = "amber",
    items, type, visibleCount, onLoadMore,
    loading, emptyEmoji, emptyTitle, emptyMsg,
    isSearch = false,
  }) => {
    const shown = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;

    return (
      <section>
        {/* Header */}
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            {isSearch && (
              <span className="mb-1 block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Search results
              </span>
            )}
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {hasMore && (
            <button onClick={onLoadMore} className="btn-outline hidden sm:inline-flex">
              Load more <FiArrowRight size={13} />
            </button>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-14 text-center">
            <div className="mb-3 text-4xl">{emptyEmoji}</div>
            <h3 className="text-base font-semibold text-foreground">{emptyTitle}</h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              {emptyMsg}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((item, i) => (
                <Motion.div
                  key={item.id ?? i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                >
                  <ItemCard item={item} type={type} />
                </Motion.div>
              ))}
            </div>

            {/* Load More button below grid (mobile-friendly) */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button onClick={onLoadMore} className="btn-outline">
                  Show More ({items.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-32 pb-20 sm:px-6 lg:px-8">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="space-y-8 py-6 text-center">
          <Motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
              Explore the <span className="text-primary">unexplored</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Book unique farm stays and collaborate with top creators to tell your story.
            </p>
          </Motion.div>

          <SearchBar
            query={query}
            setQuery={setQuery}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onSearch={handleSearch}
          />

          {/* Search status bar */}
          <AnimatePresence>
            {(hasSearchResults || searching) && (
              <Motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-3 flex-wrap"
              >
                {searching ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
                    <div className="size-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
                    Searching…
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
                      <FiSearch size={13} />
                      Results for: &ldquo;<span className="italic">{searchLabel}</span>&rdquo;
                    </div>
                    <button
                      onClick={clearSearch}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <FiX size={12} /> Clear
                    </button>
                  </>
                )}
              </Motion.div>
            )}
          </AnimatePresence>

          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}
        </section>

        {/* ── Search Result Sections (appear only after search) ────────────── */}
        <AnimatePresence>
          {hasSearchResults && !searching && (
            <Motion.div
              key="search-results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-16"
            >
              {/* Best Farms based on search */}
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
                <CardSection
                  title={`Best Farms for "${searchLabel}"`}
                  subtitle="AI-ranked farm stays matching your search"
                  accent="amber"
                  items={searchFarms}
                  type="farm"
                  visibleCount={sfVisible}
                  onLoadMore={() => setSfVisible(v => Math.min(v + LOAD_STEP, searchFarms.length))}
                  loading={false}
                  emptyEmoji="🔍"
                  emptyTitle="No matching farms"
                  emptyMsg="Try different keywords or remove date filters."
                  isSearch
                />
              </div>

              {/* Best Creators based on search */}
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
                <CardSection
                  title={`Best Creators for "${searchLabel}"`}
                  subtitle="Content creators matched to your search"
                  accent="purple"
                  items={searchCreators}
                  type="creator"
                  visibleCount={scVisible}
                  onLoadMore={() => setScVisible(v => Math.min(v + LOAD_STEP, searchCreators.length))}
                  loading={false}
                  emptyEmoji="🔍"
                  emptyTitle="No matching creators"
                  emptyMsg="Try different keywords or niche terms."
                  isSearch
                />
              </div>

              {/* Separator */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  All listings
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* ── Base error ─────────────────────────────────────────────────────── */}
        {baseError && (
          <div className="flex flex-col items-center gap-3 text-center py-8">
            <p className="text-sm text-destructive">{baseError}</p>
            <button
              onClick={loadBaseData}
              className="flex items-center gap-2 px-5 py-2 bg-foreground text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary transition-all"
            >
              <FiRefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* ── Permanent: New & Top Rated Farms ────────────────────────────── */}
        <CardSection
          title="New & Top Rated Farms"
          subtitle="Discover the newest and highest-rated farm stays across India"
          accent="amber"
          items={sortedFarms}
          type="farm"
          visibleCount={farmVisible}
          onLoadMore={() => setFarmVisible(v => Math.min(v + LOAD_STEP, sortedFarms.length))}
          loading={baseLoading}
          emptyEmoji="🌾"
          emptyTitle="No farms yet"
          emptyMsg="Be the first farmer to list your farm on Namma Connect!"
        />

        {/* ── Permanent: New & Top Creators ───────────────────────────────── */}
        <CardSection
          title="New & Top Creators"
          subtitle="Newest and top-rated agri-content creators"
          accent="purple"
          items={sortedCreators}
          type="creator"
          visibleCount={creatorVisible}
          onLoadMore={() => setCreatorVisible(v => Math.min(v + LOAD_STEP, sortedCreators.length))}
          loading={baseLoading}
          emptyEmoji="🎬"
          emptyTitle="No creators yet"
          emptyMsg="Creators will appear here once they join Namma Connect."
        />

      </div>

      <Footer />
    </div>
  );
}
