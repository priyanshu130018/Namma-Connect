import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { 
  FiCompass, FiCreditCard, FiActivity, FiArrowRight, FiCheckCircle
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { bookingAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; } };

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between h-40 group hover:shadow-sm transition-all">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-sm group-hover:scale-110 transition-transform`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-semibold text-foreground leading-none tracking-tight">{value}</p>
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
    <div className="min-h-screen bg-surface font-sans selection:bg-foreground selection:text-primary-foreground">
      <Navbar />

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="space-y-10">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                Welcome back, {user?.name?.split(" ")[0]}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Ready for your next adventure?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
             {/* Hero Banner */}
             <div className="xl:col-span-2 bg-foreground rounded-2xl p-8 md:p-10 text-primary-foreground overflow-hidden relative shadow-md flex flex-col justify-between">
                <div className="relative z-10 space-y-4">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/10 border border-white/20 text-primary-foreground/60 text-[10px] font-semibold uppercase tracking-widest">
                      Dashboard
                   </div>
                   <h2 className="text-3xl md:text-4xl font-semibold leading-tight tracking-tight">Your <br className="hidden xl:block"/> Trips.</h2>
                   <p className="text-muted-foreground font-medium text-sm leading-relaxed max-w-sm">Manage your upcoming farm stays and creative collaborations in one place.</p>
                </div>
                
                <div className="relative z-10 pt-8 mt-auto flex items-center gap-4 hidden md:flex">
                   <div className="flex -space-x-3">
                     {[1,2,3].map(i => (
                       <div key={i} className="w-10 h-10 rounded-full border-2 border-border bg-foreground flex items-center justify-center text-[10px] font-bold">
                          {String.fromCharCode(64+i)}
                       </div>
                     ))}
                   </div>
                   <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest italic">Joined by friends</p>
                </div>

                {/* Decorations */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-card/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-card/5 blur-[80px] translate-y-1/2 -translate-x-1/2" />
             </div>

             {/* Stats */}
             <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Live Trips" value={activeBookings.length} icon={FiCompass} color="bg-primary/10 text-primary" />
                <StatCard label="Total Spent" value={`₹${bookings.reduce((acc, b) => acc + Number(b.total_price || 0), 0).toLocaleString()}`} icon={FiCreditCard} color="bg-primary/10 text-primary" />
                <StatCard label="Exp. Gained" value={completedCount} icon={FiActivity} color="bg-primary/10 text-primary" />
             </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b border-border">
                  <h2 className="font-bold text-foreground">Recent Bookings</h2>
                  <Link to="/tourist/bookings" className="text-primary text-sm font-bold flex items-center gap-1">
                    See All <FiArrowRight size={14} />
                  </Link>
                </div>

                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="p-10 text-center text-muted-foreground">Loading...</div>
                  ) : recentBookings.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">No recent bookings found. Time to explore!</div>
                  ) : (
                    recentBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => navigate(b.booking_type === "farm" ? `/farmercard/${b.farm_id}` : `/creatorcard/${b.creator_id}`)}
                        className="flex items-center justify-between px-8 py-5 hover:bg-surface transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xl shadow-inner border border-border ${
                            b.booking_type === "farm" ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"
                          }`}>
                            {b.item_emoji || (b.booking_type === "farm" ? "🌾" : "🎬")}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{b.item_name}</p>
                            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                              {b.booking_type === "farm" ? "Farm Stay" : "Collab"} · {new Date(b.check_in).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-foreground text-sm">
                            ₹{(b.total_price || 0).toLocaleString()}
                          </p>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-widest ${
                              b.status === "confirmed" ? "text-primary" : "text-primary"
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
              <div className="bg-primary text-primary-foreground rounded-2xl p-8 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2"><FiCompass /> Keep Exploring</h3>
                  <p className="text-primary-foreground/80 text-xs mb-6 leading-relaxed">
                    Discover new farm stays, rich culture, and fresh experiences.
                  </p>
                  <Link
                    to="/home"
                    className="bg-card text-primary font-semibold px-6 py-3 rounded-xl text-xs inline-block hover:shadow-sm hover:-translate-y-0.5 transition-all"
                  >
                    View Listings
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-card/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
