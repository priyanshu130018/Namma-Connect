import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiMap,
  FiEye,
  FiHeart,
  FiArrowRight,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
} from "react-icons/fi";
import Footer from "@/components/layout/footer";
import { farmAPI, creatorAPI, searchAPI, aiAPI } from "@/services/api";
import Navbar from "@/components/layout/navbar";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("ng_user") || "null");
  } catch {
    return null;
  }
};

export default function CreatorHome() {
  const navigate = useNavigate();
  const user = getUser();
  const [collaborations, setCollaborations] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(Boolean(user?.userId));
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    if (!user?.userId) return;
    Promise.all([
      creatorAPI.getBookings(user.userId),
      farmAPI.listFarms(),
    ])
      .then(([collabRes, farmRes]) => {
        const collabData = collabRes.data || {};
        setCollaborations(collabData.received || []);
        setFarms((farmRes.data || []).slice(0, 4));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Creator dashboard error:", err);
        setLoading(false);
      });
  }, [user?.userId]);

  const stats = [
    {
      label: "Total Earnings",
      value: `₹${collaborations
        .filter((c) => c.status?.toLowerCase() === "confirmed" || c.status?.toLowerCase() === "completed")
        .reduce((acc, c) => acc + (c.total_price || 0), 0)
        .toLocaleString()}`,
      icon: <FiTrendingUp />,
      color: "bg-green-50 text-green-600 border-green-200",
    },
    {
      label: "Pending Collabs",
      value: collaborations.filter((c) => c.status?.toLowerCase() === "pending").length.toString(),
      icon: <FiClock className="animate-pulse" />,
      color: "bg-amber-50 text-amber-600 border-amber-200",
    },
    {
      label: "Confirmed Projects",
      value: collaborations.filter((c) => c.status?.toLowerCase() === "confirmed").length.toString(),
      icon: <FiCheckCircle />,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      label: "Completed",
      value: collaborations.filter((c) => c.status?.toLowerCase() === "completed").length.toString(),
      icon: <FiHeart />,
      color: "bg-rose-50 text-rose-600 border-rose-200",
    },
  ];

  const pendingCollabs = collaborations.filter(c => c.status?.toLowerCase() === "pending");
  const confirmedCollabs = collaborations.filter(c => c.status?.toLowerCase() === "confirmed");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="pt-24">
        <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto space-y-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Welcome back, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">Your creative journey starts here</p>
            </div>

            {/* AI Planner and other actions can go here */}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
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

              {/* Pending Collaborations Section */}
              {pendingCollabs.length > 0 && (
                <div className="bg-amber-50 rounded-[32px] border border-amber-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-8 py-6 border-b border-amber-100">
                    <h2 className="font-bold text-amber-900 flex items-center gap-2">
                      <FiClock className="animate-pulse" /> New Collaboration Requests
                    </h2>
                    <button 
                      onClick={() => setShowAllPending(!showAllPending)} 
                      className="text-amber-700 text-sm font-bold hover:underline"
                    >
                      {showAllPending ? "Show Less" : "View All"}
                    </button>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {pendingCollabs.slice(0, showAllPending ? undefined : 3).map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-8 py-5 hover:bg-amber-100/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-700 font-black text-xs shadow-sm">
                            {c.tourist_name?.[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{c.tourist_name}</p>
                            <p className="text-amber-700/60 text-[11px] font-medium uppercase tracking-wider">
                              {c.item_name} · {new Date(c.check_in).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate("/creator/bookings")}
                          className="px-4 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-bold shadow-sm"
                        >
                          Respond
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900">Recent Collaborations</h2>
                    <button 
                      onClick={() => setShowAllTransactions(!showAllTransactions)} 
                      className="text-purple-600 text-sm font-bold flex items-center gap-1 hover:underline"
                    >
                      {showAllTransactions ? "Show Less" : <>See All <FiArrowRight size={14} /></>}
                    </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading...</div>
                  ) : collaborations.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No collaborations found</div>
                  ) : (
                    collaborations.slice(0, showAllTransactions ? undefined : 3).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${
                            c.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {c.tourist_name?.[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{c.tourist_name}</p>
                            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                              {c.item_name} · {new Date(c.check_in).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm">
                            ₹{(c.total_price || 0).toLocaleString()}
                          </p>
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              c.status === "confirmed" ? "text-emerald-500" : "text-amber-500"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-indigo-600 text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-xl font-black mb-2">Best Places to Shoot 📸</h3>
                  <p className="text-indigo-200 text-xs mb-6">
                    Discover farms with breathtaking landscapes and unique authentic vibes.
                  </p>
                  <Link
                    to="/home"
                    className="bg-white text-indigo-600 font-black px-6 py-3 rounded-xl text-xs inline-block hover:bg-indigo-50 transition-all"
                  >
                    Explore Locations
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-black text-slate-900">Top Locations for you</h3>
                  <Link to="/home" className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">View All</Link>
                </div>
                <div className="space-y-4">
                  {farms.slice(0, 3).map((farm) => (
                    <div
                      key={farm.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 hover:border-indigo-300 transition-all cursor-pointer"
                      onClick={() => navigate(`/farmercard/${farm.id}`)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl shadow-sm shrink-0">
                        {farm.emoji || "🌾"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-xs truncate">{farm.name}</p>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest truncate">
                          {farm.crop_types || "Agritourism"}
                        </p>
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
      <Footer />
    </div>
  );
}
