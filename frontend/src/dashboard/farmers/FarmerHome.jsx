import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiGrid,
  FiTrendingUp,
  FiStar,
  FiArrowRight,
  FiPlus,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import Footer from "@/components/layout/footer";
import { farmAPI, creatorAPI, searchAPI, aiAPI } from "@/services/api";
import CreatorCard from "../creators/CreatorCard";
import Navbar from "@/components/layout/navbar";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("ng_user") || "null");
  } catch {
    return null;
  }
};

export default function FarmerHome() {
  const navigate = useNavigate();
  const user = getUser();

  const [bookings, setBookings] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([farmAPI.getBookings(user.userId), creatorAPI.listCreators()])
      .then(([bookingRes, creatorRes]) => {
        // API now returns { received, made }
        const received = bookingRes.data?.received || (Array.isArray(bookingRes.data) ? bookingRes.data : []);
        setBookings(received);
        setCreators((creatorRes.data || []).slice(0, 4));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        setLoading(false);
      });
  }, [user?.userId]);

  const stats = [
    {
      label: "Total Revenue",
      value: `₹${bookings
        .filter((b) => b.status?.toLowerCase() === "confirmed" || b.status?.toLowerCase() === "completed")
        .reduce((acc, b) => acc + (b.total_price || 0), 0)
        .toLocaleString()}`,
      icon: <FiTrendingUp />,
      color: "bg-green-50 text-green-600 border-green-200",
    },
    {
      label: "Pending Requests",
      value: bookings.filter((b) => b.status?.toLowerCase() === "pending").length.toString(),
      icon: <FiClock className="animate-pulse" />,
      color: "bg-amber-50 text-amber-600 border-amber-200",
    },
    {
      label: "Confirmed Stays",
      value: bookings.filter((b) => b.status?.toLowerCase() === "confirmed").length.toString(),
      icon: <FiCheckCircle />,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      label: "Average Rating",
      value: "4.8",
      icon: <FiStar />,
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
  ];

  const pendingBookings = bookings.filter(b => b.status?.toLowerCase() === "pending");
  const confirmedBookings = bookings.filter(b => b.status?.toLowerCase() === "confirmed");

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
              <p className="text-slate-500 text-sm mt-1">Grow your farm business today</p>
            </div>

            <Link
              to="/farmer/listings"
              className="bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <FiPlus size={16} /> New Listing
            </Link>
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

              {/* Pending Bookings Section */}
              {pendingBookings.length > 0 && (
                <div className="bg-amber-50 rounded-[32px] border border-amber-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-8 py-6 border-b border-amber-100">
                    <h2 className="font-bold text-amber-900 flex items-center gap-2">
                      <FiClock className="animate-pulse" /> New Requests
                    </h2>
                    <button 
                      onClick={() => setShowAllPending(!showAllPending)} 
                      className="text-amber-700 text-sm font-bold hover:underline"
                    >
                      {showAllPending ? "Show Less" : "Review All"}
                    </button>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {pendingBookings.slice(0, showAllPending ? undefined : 3).map((b) => (
                      <div key={b.id} className="flex items-center justify-between px-8 py-5 hover:bg-amber-100/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-700 font-black text-xs shadow-sm">
                            {b.tourist_name?.[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{b.tourist_name}</p>
                            <p className="text-amber-700/60 text-[11px] font-medium uppercase tracking-wider">
                              {b.item_name} · {new Date(b.check_in).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate("/farmer/bookings")}
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
                  <h2 className="font-bold text-slate-900">Recent Transactions</h2>
                  <button 
                    onClick={() => setShowAllTransactions(!showAllTransactions)} 
                    className="text-amber-600 text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    {showAllTransactions ? "Show Less" : <>See All <FiArrowRight size={14} /></>}
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading...</div>
                  ) : bookings.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No active bookings</div>
                  ) : (
                    bookings.slice(0, showAllTransactions ? undefined : 3).map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${
                            b.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {b.tourist_name?.[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{b.tourist_name}</p>
                            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                              {b.item_name} · {new Date(b.check_in).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm">
                            ₹{(b.total_price || 0).toLocaleString()}
                          </p>
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              b.status === "confirmed" ? "text-emerald-500" : "text-amber-500"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-900 text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-xl font-black mb-2">Hire Top Creators 🎬</h3>
                  <p className="text-slate-400 text-xs mb-6">
                    Boost your farm's visibility with professional cinematic storytelling.
                  </p>
                  <Link
                    to="/home"
                    className="bg-amber-500 text-white font-black px-6 py-3 rounded-xl text-xs inline-block hover:bg-amber-400 transition-all"
                  >
                    Explore Talent
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-black text-slate-900">Recommended for you</h3>
                  <Link to="/services" className="text-amber-600 text-[10px] font-black uppercase tracking-widest hover:underline">View All</Link>
                </div>
                <div className="space-y-4">
                  {creators.slice(0, 3).map((creator) => (
                    <div
                      key={creator.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 hover:border-amber-300 transition-all cursor-pointer"
                      onClick={() => navigate(`/creatorcard/${creator.id}`)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-black shadow-sm shrink-0">
                        {creator.name?.[0] || "C"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-xs truncate">{creator.name}</p>
                        <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest truncate">
                          {creator.niche || "Content Creator"}
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
