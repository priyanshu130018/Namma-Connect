import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMapPin, FiPhone, FiMail, FiCalendar, FiArrowLeft, FiCheckCircle, FiHome, FiTruck, FiList, FiTrendingUp } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { farmAPI } from "@/services/api";

export default function FarmerCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      farmAPI.getListing(id)
        .then(res => {
          setFarm(res.data);
          setLoading(false);
        })
        .catch(err => {
          setError("Farm not found or failed to load data.");
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !farm) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <Navbar minimal />
      <div className="text-6xl mb-4">🚜</div>
      <h2 className="text-2xl font-black text-slate-900 mb-2">Oops! Farm not found</h2>
      <p className="text-slate-500 mb-6 max-w-xs">{error || "The farm you're looking for doesn't exist or was removed."}</p>
      <button onClick={() => navigate("/home")} className="btn-primary px-8">Back to Home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {/* Hero / Header Section */}
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm mb-6 transition-colors">
            <FiArrowLeft size={16} /> Back to Search
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-5xl">{farm.emoji || "🌾"}</div>
                  <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">Verified Farm Stay</div>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">{farm.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <FiMapPin className="text-amber-500" /> {farm.area}, {farm.state}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <FiTrendingUp className="text-emerald-500" /> {farm.crop_types || "Agritourism"}
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-500">
                    ★ 4.8 (120 reviews)
                  </div>
                </div>
              </motion.div>

              {/* Photo Gallery Placeholder */}
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="aspect-video bg-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-white"
              >
                {farm.farm_photo ? (
                  <img src={farm.farm_photo} alt={farm.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                    <FiHome size={64} className="mb-4 opacity-20" />
                    <p className="font-bold text-sm">Farm Gallery</p>
                  </div>
                )}
              </motion.div>

              {/* Description */}
              <div className="bg-white rounded-[32px] p-8 md:p-10 border border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900 mb-4">About the Experience</h2>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{farm.description || farm.farm_description}</p>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h3 className="font-black text-slate-900 mb-4">Farm Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {(farm.activities || "").split(",").map((act, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold border border-slate-200">
                        {act.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-6 rounded-[24px] border transition-all ${farm.stay_available ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${farm.stay_available ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}>
                      <FiHome size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900">Accommodation</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{farm.stay_available || "Stay not available at this farm."}</p>
                  {farm.stay_available && <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><FiCheckCircle /> Available for booking</span>}
                </div>

                <div className={`p-6 rounded-[24px] border transition-all ${farm.transport_available ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${farm.transport_available ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                      <FiTruck size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900">Transport Support</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{farm.transport_available || "No transport assistance offered."}</p>
                  {farm.transport_available && <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><FiCheckCircle /> Pickup available</span>}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Booking Widget */}
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-28">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-3xl font-black text-slate-900">₹800</span>
                    <span className="text-slate-400 font-bold ml-1">/ day</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Per Person</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Check In</span>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <FiCalendar size={14} className="text-amber-500" /> Select Date
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Guests</span>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 text-slate-900">
                        1 Adult
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 mb-4">
                  Request to Book
                </button>
                <button className="w-full border-2 border-slate-100 text-slate-600 font-bold py-3 rounded-2xl hover:bg-slate-50 transition-all text-sm">
                  Save to Wishlist
                </button>
                
                <p className="text-center text-slate-400 text-[11px] font-medium mt-4">No charges until booking confirmation</p>
              </div>

              {/* Host Contact (Shortened) */}
              <div className="bg-slate-900 text-white rounded-[32px] p-8 overflow-hidden relative group">
                <div className="relative z-10">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><FiUser className="text-amber-400" /> Managed by Host</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-lg">H</div>
                    <div>
                      <p className="font-bold">{farm.owner?.name || "Local Farmer"}</p>
                      <p className="text-xs text-slate-400">Response time: 1 hour</p>
                    </div>
                  </div>
                </div>
                <div className="orb w-32 h-32 bg-amber-500/20 -bottom-10 -right-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
