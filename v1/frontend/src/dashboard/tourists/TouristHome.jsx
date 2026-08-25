import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FiCompass, FiCreditCard, FiActivity, FiArrowRight, FiCheckCircle
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { bookingAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-40 group hover:shadow-xl hover:shadow-slate-200 transition-all">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-sm group-hover:scale-110 transition-transform`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 leading-none tracking-tight">{value}</p>
    </div>
  </div>
);

export default function TouristHome() {
  const user = getUser();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.userId || user?.id;
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    bookingAPI.getUserBookings(uid)
      .then(res => setBookings(res.data || []))
      .catch(err => console.error("Could not load bookings", err))
      .finally(() => setLoading(false));
  }, [user?.userId, user?.id]);

  const activeBookings = bookings.filter(b => b.status === "pending" || b.status === "confirmed" || b.status === "accepted");
  const completedCount = bookings.filter(b => b.status === "completed").length;
  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-slate-900 selection:text-white">
      <Navbar />

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="space-y-10">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Welcome back, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">Ready for your next adventure?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
             {/* Hero Banner */}
             <div className="xl:col-span-2 bg-slate-900 rounded-[40px] p-8 md:p-10 text-white overflow-hidden relative shadow-2xl flex flex-col justify-between">
                <div className="relative z-10 space-y-4">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/60 text-[10px] font-black uppercase tracking-widest">
                      Dashboard
                   </div>
                   <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">Your <br className="hidden xl:block"/> Trips.</h2>
                   <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-sm">Manage your upcoming farm stays and creative collaborations in one place.</p>
                </div>
                
                <div className="relative z-10 pt-8 mt-auto flex items-center gap-4 hidden md:flex">
                   <div className="flex -space-x-3">
                     {[1,2,3].map(i => (
                       <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                          {String.fromCharCode(64+i)}
                       </div>
                     ))}
                   </div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Joined by friends</p>
                </div>

                {/* Decorations */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 blur-[80px] translate-y-1/2 -translate-x-1/2" />
             </div>

             {/* Stats */}
             <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Live Trips" value={activeBookings.length} icon={FiCompass} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Total Spent" value={`₹${bookings.reduce((acc, b) => acc + Number(b.total_price || 0), 0).toLocaleString()}`} icon={FiCreditCard} color="bg-blue-50 text-blue-600" />
                <StatCard label="Exp. Gained" value={completedCount} icon={FiActivity} color="bg-purple-50 text-purple-600" />
             </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Recent Bookings</h2>
                  <Link to="/tourist/bookings" className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                    See All <FiArrowRight size={14} />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading...</div>
                  ) : recentBookings.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No recent bookings found. Time to explore!</div>
                  ) : (
                    recentBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => navigate(b.booking_type === "farm" ? `/farmercard/${b.farm_id}` : `/creatorcard/${b.creator_id}`)}
                        className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-inner border border-slate-100 ${
                            b.booking_type === "farm" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                          }`}>
                            {b.item_emoji || (b.booking_type === "farm" ? "🌾" : "🎬")}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{b.item_name}</p>
                            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                              {b.booking_type === "farm" ? "Farm Stay" : "Collab"} · {new Date(b.check_in).toLocaleDateString()}
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
              <div className="bg-emerald-600 text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-xl font-black mb-2 flex items-center gap-2"><FiCompass /> Keep Exploring</h3>
                  <p className="text-emerald-100 text-xs mb-6 leading-relaxed">
                    Discover new farm stays, rich culture, and fresh experiences.
                  </p>
                  <Link
                    to="/home"
                    className="bg-white text-emerald-700 font-black px-6 py-3 rounded-xl text-xs inline-block hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    View Listings
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
