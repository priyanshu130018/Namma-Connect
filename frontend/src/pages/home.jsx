import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiChevronDown, FiTrendingUp, FiMapPin } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SearchBar from "@/components/ui/searchBar";
import ItemCard from "@/components/ui/card";
import { farmAPI, creatorAPI, aiAPI } from "@/services/api";
import { useAuth } from "@/context/AuthContext"; // or get from storage directly if Context not available

const VISIBLE_FARMS = 6;
const VISIBLE_CREATORS = 4;

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [farms, setFarms] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  const [visibleFarms, setVisibleFarms] = useState(VISIBLE_FARMS);
  const [visibleCreators, setVisibleCreators] = useState(VISIBLE_CREATORS);

  const [search, setSearch] = useState(""); 

  useEffect(() => {
    Promise.all([
      farmAPI.listFarms(),
      creatorAPI.listCreators()
    ]).then(([fRes, cRes]) => {
      setFarms(fRes.data);
      setCreators(cRes.data);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch home data:", err);
      setLoading(false);
    });
  }, []);

  const filteredFarms = farms.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.area && f.area.toLowerCase().includes(search.toLowerCase())) ||
    (f.state && f.state.toLowerCase().includes(search.toLowerCase())) ||
    (f.crop_types && f.crop_types.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSearch = async () => {
    setLoading(true);
    setSearch(query);
    
    // Get loginId from storage if available, fallback to 0
    const user = JSON.parse(localStorage.getItem("ng_user") || "{}");
    const loginId = user.id || 0;

    try {
      if (query.trim()) {
        const [farmRes, creatorRes] = await Promise.all([
          aiAPI.recommendFarms(loginId, query),
          aiAPI.recommendCreators(loginId, query)
        ]);
        setFarms(farmRes.data || []);
        setCreators(creatorRes.data || []);
      } else {
        // Default fetch if no query
        const [farmRes, creatorRes] = await Promise.all([
          farmAPI.listFarms(),
          creatorAPI.listCreators()
        ]);
        setFarms(farmRes.data || []);
        setCreators(creatorRes.data || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
      setVisibleFarms(VISIBLE_FARMS);
    }
  };

  const shownFarms = filteredFarms.slice(0, visibleFarms);
  const shownCreators = creators.slice(0, visibleCreators);
  const hasMoreFarms = visibleFarms < filteredFarms.length;
  const hasMoreCreators = visibleCreators < creators.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto space-y-16">

        {/* ── Headline & Search ── */}
        <section className="text-center space-y-8 py-10">
          <motion.div initial={{ opacity:0, y: 20 }} animate={{ opacity:1, y: 0 }}>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4">
              Explore the <span className="text-amber-500">Unexplored</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-xl mx-auto text-lg">
              Book unique farm stays and collaborate with top creators to tell your story.
            </p>
          </motion.div>

          <SearchBar 
            query={query} setQuery={setQuery}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            onSearch={handleSearch}
          />
        </section>

        {/* ── Best Places to Visit (Farms) ── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Best Places to Visit</h2>
              <p className="text-slate-500 text-sm font-medium">Handpicked farm stays for your next adventure</p>
            </div>
            <Link to="/services" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              View All
            </Link>
          </div>
          
          {loading ? (
            <div className="py-20 text-center text-slate-400">Finding best farms for you...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {shownFarms.map((farm) => (
                <ItemCard key={farm.id} item={farm} type="farm" />
              ))}
            </div>
          )}

          {hasMoreFarms && (
            <div className="flex justify-center mt-10">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setVisibleFarms(v => v + 6)}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-600 font-black px-8 py-3 rounded-2xl shadow-sm transition-all text-sm uppercase tracking-widest"
              >
                <FiChevronDown size={16} /> Load More Destiantions
              </motion.button>
            </div>
          )}
        </section>

        {/* ── Top Creators ── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Top Creators</h2>
              <p className="text-slate-500 text-sm font-medium">Collaborate with the best visual storytellers</p>
            </div>
            <Link to="/services" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Explore All
            </Link>
          </div>
          
          {loading ? (
             <div className="py-20 text-center text-slate-400">Loading creators...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {shownCreators.map((creator) => (
                <ItemCard key={creator.id} item={creator} type="creator" />
              ))}
            </div>
          )}

          {hasMoreCreators && (
            <div className="flex justify-center mt-10">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setVisibleCreators(v => v + 4)}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-purple-400 text-slate-700 hover:text-purple-600 font-black px-8 py-3 rounded-2xl shadow-sm transition-all text-sm uppercase tracking-widest"
              >
                <FiChevronDown size={16} /> View More Creators
              </motion.button>
            </div>
          )}
        </section>

        {/* ── CTA Banner ── */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="bg-slate-900 rounded-[48px] p-12 py-16 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Start your journey today</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
              Whether you're a farmer looking for guests or a creator looking for stories, NammaGig is your gateway.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/ai-planner" className="bg-amber-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all text-sm uppercase tracking-widest flex items-center gap-2">
                Plan with AI <FiArrowRight size={16} />
              </Link>
              <Link to="/about" className="bg-white/10 backdrop-blur-md text-white border border-white/20 font-black px-8 py-4 rounded-2xl hover:bg-white/20 transition-all text-sm uppercase tracking-widest">
                Learn More
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] -ml-32 -mb-32" />
        </motion.section>

      </div>
      <Footer />
    </div>
  );
}
