import { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiStar, FiSearch, FiX, FiRefreshCw } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SearchBar from "@/components/ui/searchBar";
import ItemCard from "@/components/ui/card";
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

    const user = (() => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } })();
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
        <div className="flex items-end justify-between mb-6">
          <div>
            {isSearch && (
              <span className={`text-xs font-black uppercase tracking-widest text-${accent}-500 mb-1 block`}>
                Search Results
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
            <p className="text-slate-500 text-sm font-medium mt-0.5">{subtitle}</p>
          </div>
          {hasMore && (
            <button
              onClick={onLoadMore}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white hover:bg-${accent}-50 hover:border-${accent}-300 hover:text-${accent}-700 text-slate-600 transition-all shadow-sm`}
            >
              Load More <FiArrowRight size={13} />
            </button>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <div className={`w-10 h-10 border-4 border-${accent}-200 border-t-${accent}-500 rounded-full animate-spin mb-4`} />
            <p className="text-sm font-medium text-slate-400">Loading…</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-5xl mb-3">{emptyEmoji}</div>
            <h3 className="font-black text-slate-600 text-lg mb-1">{emptyTitle}</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">{emptyMsg}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                <button
                  onClick={onLoadMore}
                  className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold bg-${accent}-500 text-white hover:bg-${accent}-400 transition-all shadow-lg shadow-${accent}-200`}
                >
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pt-24 pb-20 px-5 max-w-7xl mx-auto space-y-16">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="text-center space-y-8 py-8">
          <Motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4 leading-none">
              Explore the <span className="text-amber-500">Unexplored</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-xl mx-auto text-lg">
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
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-bold">
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Searching…
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-bold">
                      <FiSearch size={13} />
                      Results for: &ldquo;<span className="italic">{searchLabel}</span>&rdquo;
                    </div>
                    <button
                      onClick={clearSearch}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-full text-sm font-bold transition-all"
                    >
                      <FiX size={12} /> Clear
                    </button>
                  </>
                )}
              </Motion.div>
            )}
          </AnimatePresence>

          {searchError && (
            <p className="text-red-500 text-sm font-medium">{searchError}</p>
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
              <div className="bg-amber-50/60 border border-amber-100 rounded-3xl p-8">
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
              <div className="bg-purple-50/60 border border-purple-100 rounded-3xl p-8">
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
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">All Listings Below</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* ── Base error ─────────────────────────────────────────────────────── */}
        {baseError && (
          <div className="flex flex-col items-center gap-3 text-center py-8">
            <p className="text-red-500 font-bold">{baseError}</p>
            <button
              onClick={loadBaseData}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
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
          emptyMsg="Be the first farmer to list your farm on NammaGig!"
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
          emptyMsg="Creators will appear here once they join NammaGig."
        />

      </div>

      <Footer />
    </div>
  );
}
