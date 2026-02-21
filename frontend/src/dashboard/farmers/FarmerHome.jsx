import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome, FiCalendar, FiGrid, FiSettings, FiHelpCircle,
  FiUser, FiTrendingUp, FiStar, FiArrowRight, FiPlus, FiMapPin, FiMenu, FiX
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { farmAPI, creatorAPI } from "@/services/api";
import SearchBar from "@/components/ui/searchBar";
import ItemCard from "@/components/ui/card";

const navItems = [
  { icon: <FiHome size={18} />, label: "Dashboard", path: "/farmer/home" },
  { icon: <FiUser size={18} />, label: "Profile", path: "/farmer/profile" },
  { icon: <FiCalendar size={18} />, label: "Bookings", path: "/farmer/bookings" },
  { icon: <FiGrid size={18} />, label: "Listings", path: "/farmer/listings" },
  { icon: <FiSettings size={18} />, label: "Settings", path: "/farmer/settings" },
  { icon: <FiHelpCircle size={18} />, label: "Help", path: "/contact" },
];

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

export default function FarmerHome() {
  const navigate = useNavigate();
  const user = getUser();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  
  const [bookings, setBookings] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.loginId) {
      setLoading(true);
      Promise.all([
        farmAPI.getBookings(user.loginId),
        creatorAPI.listCreators()
      ])
        .then(([bookingRes, creatorRes]) => {
          setBookings(bookingRes.data);
          setCreators(creatorRes.data.slice(0, 4)); // Get top 4 creators
          setLoading(false);
        })
        .catch(err => {
          console.error("Dashboard error:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user?.loginId]);

  const stats = [
    { label: "Total Bookings", value: bookings.length.toString(), icon: <FiCalendar />, color: "bg-amber-50 text-amber-600 border-amber-200" },
    { label: "Revenue (All)", value: `₹${bookings.reduce((acc, b) => acc + (b.total_price || 0), 0).toLocaleString()}`, icon: <FiTrendingUp />, color: "bg-green-50 text-green-600 border-green-200" },
    { label: "Confirmed", value: bookings.filter(b => b.status === "Confirmed").length.toString(), icon: <FiStar />, color: "bg-blue-50 text-blue-600 border-blue-200" },
    { label: "Pending", value: bookings.filter(b => b.status === "Pending").length.toString(), icon: <FiGrid />, color: "bg-purple-50 text-purple-600 border-purple-200" },
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (startDate) params.append("start", startDate);
    if (endDate) params.append("end", endDate);
    if (timeSlot) params.append("slot", timeSlot);
    const qs = params.toString();
    navigate(`/home${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar ... */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm">NG</span>
            </div>
            <span className="font-black text-lg text-slate-900">Namma<span className="text-amber-500">Gig</span></span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
            <FiX size={18} />
          </button>
        </div>
        <div className="px-6 py-4">
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Farmer Portal</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === item.path
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={location.pathname === item.path ? "text-amber-600" : "text-slate-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0]}</div>
            <div>
              <p className="font-semibold text-slate-900 text-xs truncate max-w-[120px]">{user?.name}</p>
              <p className="text-slate-400 text-[10px]">Farmer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-20 lg:pt-0">
        <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto space-y-10">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm"
              >
                <FiMenu size={16} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-slate-900">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
                <p className="text-slate-500 text-sm mt-1">Grow your farm business today</p>
              </div>
            </div>
            <Link to="/farmer/listings" className="bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm">
              <FiPlus size={16} /> New Listing
            </Link>
          </div>

          {/* Search Bar */}
          <section className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-4 px-2 italic text-sm">Need help finding something?</h3>
             <SearchBar 
              query={query} setQuery={setQuery}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              timeSlot={timeSlot} setTimeSlot={setTimeSlot}
              onSearch={handleSearch}
            />
          </section>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((s, i) => (
                  <div key={s.label} className={`bg-white rounded-2xl p-5 border ${s.color} shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 font-medium">{s.label}</span>
                      <span className="text-lg">{s.icon}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Bookings */}
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Recent Transactions</h2>
                  <Link to="/farmer/bookings" className="text-amber-600 text-sm font-bold flex items-center gap-1">
                    See All <FiArrowRight size={14} />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading...</div>
                  ) : bookings.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No active bookings</div>
                  ) : bookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-xs">{b.tourist_name?.[0]}</div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{b.tourist_name}</p>
                          <p className="text-slate-400 text-[11px] font-medium">{b.item_name} · {new Date(b.check_in).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-sm">₹{b.total_price.toLocaleString()}</p>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${b.status === "Confirmed" ? "text-emerald-500" : "text-amber-500"}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Promotion / Creator recommendations */}
              <div className="bg-slate-900 text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
                 <div className="relative z-10">
                   <h3 className="text-xl font-black mb-2">Hire Top Creators 🎬</h3>
                   <p className="text-slate-400 text-xs mb-6">Boost your farm's visibility with professional cinematic storytelling.</p>
                   <Link to="/services" className="bg-amber-500 text-white font-black px-6 py-3 rounded-xl text-xs inline-block hover:bg-amber-400 transition-all">
                     Explore Talent
                   </Link>
                 </div>
                 <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </div>

              {/* Creators list */}
              <div>
                <h3 className="font-black text-slate-900 mb-4 px-2">Recommended for you</h3>
                <div className="space-y-4">
                  {creators.map(creator => (
                    <div key={creator.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 hover:border-amber-300 transition-all cursor-pointer" onClick={() => navigate(`/creatorcard/${creator.id}`)}>
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-black shadow-sm shrink-0">
                        {creator.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-xs truncate">{creator.name}</p>
                        <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest truncate">{creator.niche || "Content Creator"}</p>
                      </div>
                      <FiArrowRight size={14} className="ml-auto text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
