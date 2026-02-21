import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome, FiCalendar, FiMap, FiSettings, FiHelpCircle,
  FiUser, FiEye, FiHeart, FiArrowRight, FiPlus, FiMapPin, FiMenu, FiX, FiCamera
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { creatorAPI, bookingAPI, farmAPI } from "@/services/api";
import ItemCard from "@/components/ui/card";

const navItems = [
  { icon: <FiHome size={18} />, label: "Dashboard", path: "/creator/home" },
  { icon: <FiUser size={18} />, label: "Profile", path: "/creator/profile" },
  { icon: <FiMap size={18} />, label: "My Trips", path: "/creator/trips" },
  { icon: <FiCalendar size={18} />, label: "Bookings", path: "/creator/bookings" },
  { icon: <FiSettings size={18} />, label: "Settings", path: "/creator/settings" },
  { icon: <FiHelpCircle size={18} />, label: "Help", path: "/contact" },
];

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

export default function CreatorHome() {
  const navigate = useNavigate();
  const user = getUser();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collaborations, setCollaborations] = useState([]); // Bookings on this creator
  const [myTrips, setMyTrips] = useState([]); // Bookings by this creator
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.loginId) {
      setLoading(true);
      Promise.all([
        creatorAPI.getBookings(user.loginId),
        bookingAPI.getBookings(user.loginId),
        farmAPI.listFarms()
      ]).then(([collabRes, tripRes, farmRes]) => {
        setCollaborations(collabRes.data);
        setMyTrips(tripRes.data);
        setFarms(farmRes.data.slice(0, 4)); // Get top 4 farms
        setLoading(false);
      }).catch(err => {
        console.error("Creator dashboard error:", err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user?.loginId]);

  const stats = [
    { label: "Collaborations", value: collaborations.length.toString(), icon: <FiCalendar />, color: "bg-purple-50 text-purple-600 border-purple-200" },
    { label: "Total Trips", value: myTrips.length.toString(), icon: <FiMap />, color: "bg-green-50 text-green-600 border-green-200" },
    { label: "Confirmed", value: collaborations.filter(c => c.status === "Confirmed").length.toString(), icon: <FiEye />, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    { label: "Saved", value: "0", icon: <FiHeart />, color: "bg-rose-50 text-rose-600 border-rose-200" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar ... */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm">NG</span>
            </div>
            <span className="font-black text-lg text-slate-900">Namma<span className="text-purple-600">Gig</span></span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
            <FiX size={18} />
          </button>
        </div>
        <div className="px-6 py-4">
          <span className="text-[10px] bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Creator Portal</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === item.path
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={location.pathname === item.path ? "text-purple-600" : "text-slate-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0]}</div>
            <div>
              <p className="font-semibold text-slate-900 text-xs truncate max-w-[120px]">{user?.name}</p>
              <p className="text-slate-400 text-[10px]">Creator</p>
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
                <h1 className="text-3xl font-black text-slate-900">Creator Studio 🎬</h1>
                <p className="text-slate-500 text-sm mt-1">Capture moments, tell stories.</p>
              </div>
            </div>
            <Link to="/ai-planner" className="bg-purple-600 hover:bg-purple-500 text-white font-black px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm">
               AI Trip Planner <FiArrowRight size={16} />
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((s) => (
                  <div key={s.label} className={`bg-white rounded-2xl p-5 border ${s.color} shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 font-medium">{s.label}</span>
                      <span className="text-lg">{s.icon}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Trips */}
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Your Journey</h2>
                  <Link to="/creator/trips" className="text-purple-600 text-sm font-bold flex items-center gap-1">
                    See All <FiArrowRight size={14} />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                   {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading...</div>
                  ) : myTrips.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No trips recorded yet</div>
                  ) : myTrips.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{t.item_emoji || "🎬"}</span>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{t.item_name}</p>
                          <p className="text-slate-400 text-[11px] font-medium">{new Date(t.check_in).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${t.status === "Confirmed" ? "text-emerald-500" : "text-purple-500"}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Promotion / Farm recommendations */}
              <div className="bg-indigo-600 text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
                 <div className="relative z-10">
                   <h3 className="text-xl font-black mb-2">Best Places to Shoot 📸</h3>
                   <p className="text-indigo-200 text-xs mb-6">Discover farms with breathtaking landscapes and unique authentic vibes.</p>
                   <Link to="/home" className="bg-white text-indigo-600 font-black px-6 py-3 rounded-xl text-xs inline-block hover:bg-indigo-50 transition-all">
                     Explore Locations
                   </Link>
                 </div>
                 <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </div>

              {/* Farms list */}
              <div>
                <h3 className="font-black text-slate-900 mb-4 px-2">Top Locations for you</h3>
                <div className="space-y-4">
                  {farms.map(farm => (
                    <div key={farm.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 hover:border-indigo-300 transition-all cursor-pointer" onClick={() => navigate(`/farmercard/${farm.id}`)}>
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl shadow-sm shrink-0">
                        {farm.emoji || "🌾"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-xs truncate">{farm.name}</p>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest truncate">{farm.crop_types || "Agritourism"}</p>
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
