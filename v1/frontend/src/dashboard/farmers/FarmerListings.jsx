import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus, FiInbox, FiEdit3, FiTrash2, FiMapPin,
  FiPhone, FiList, FiDollarSign, FiHome, FiTruck, FiCheckCircle, FiMoreVertical
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { farmAPI } from "@/services/api";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; }
};

function ListingCard({ item, onEdit, onDelete, deleting }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-[32px] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all group overflow-hidden flex flex-col h-full"
    >
      <div className="h-48 bg-slate-100 relative overflow-hidden shrink-0">
        {item.farm_photo ? (
          <img src={item.farm_photo} alt={item.farm_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 opacity-40 text-6xl">🚜</div>
        )}
        
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${item.is_active ? "bg-emerald-500 text-white border-emerald-400" : "bg-slate-500 text-white border-slate-400"}`}>
            {item.is_active ? "Live" : "Draft"}
          </span>
        </div>

        <div className="absolute top-4 right-4 flex gap-2">
           <button onClick={onEdit} className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur border border-white text-slate-700 flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-sm">
             <FiEdit3 size={15} />
           </button>
           <button onClick={onDelete} disabled={deleting} className="w-9 h-9 rounded-xl bg-red-500/90 backdrop-blur border border-red-400 text-white flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all shadow-sm">
             {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiTrash2 size={15} />}
           </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur border border-white/20 p-3 rounded-2xl flex items-center justify-between shadow-lg translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Active Experience</span>
           </div>
           <p className="text-xs font-black text-slate-900 leading-none">₹{Number(item.price_per_night || 0).toLocaleString()}<span className="text-slate-400 font-bold ml-1 text-[9px]">/NIGHT</span></p>
        </div>
      </div>

      <div className="p-7 flex flex-col flex-1">
        <h3 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-amber-500 transition-colors">{item.farm_name || "Untitled Listing"}</h3>
        
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-4">
           <FiMapPin className="text-amber-500" size={13} />
           <span className="truncate">{[item.city, item.state].filter(Boolean).join(", ") || "Location Not Set"}</span>
        </div>

        <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-6 leading-relaxed italic">{item.description || "Start adding details to showcase your farm stay..."}</p>

        <div className="mt-auto flex flex-wrap gap-2 pt-5 border-t border-slate-50">
           {item.stay_available && <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100"><FiHome size={11} /> Stay</span>}
           {item.transport_available && <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100"><FiTruck size={11} /> Pickup</span>}
           {item.crop_types && <span className="flex items-center gap-1.5 bg-slate-50 text-slate-500 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-100"><FiList size={11} /> {item.crop_types}</span>}
        </div>
      </div>
    </motion.div>
  );
}

export default function FarmerListings() {
  const navigate = useNavigate();
  const userId = getUser()?.userId;

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    farmAPI.getListings(userId)
      .then(res => setListings(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDelete = async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      setDeletingId(listingId);
      await farmAPI.deleteListing(listingId, userId);
      setListings(prev => prev.filter(x => x.id !== listingId));
    } catch { alert("Failed to delete listing."); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Header */}
          <div className="relative bg-slate-900 rounded-[40px] p-10 md:p-16 overflow-hidden mb-12 shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                    Manage Property
                 </div>
                 <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">Your Farm <br/> Listings</h1>
                 <p className="text-slate-400 font-medium text-lg max-w-md">Highlight your unique experiences and connect with travelers looking for sustainable stays.</p>
              </div>
              <Link to="/farmer/listing/new" className="bg-amber-500 hover:bg-white text-slate-900 font-black px-8 py-5 rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3 text-lg group active:scale-95">
                 <FiPlus size={22} className="group-hover:rotate-90 transition-transform" /> Add New Experience
              </Link>
            </div>
            
            {/* Background Decorations */}
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-amber-500/20 blur-[100px] -translate-y-1/2 -translate-x-1/2 rounded-full" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full" />
          </div>

          {/* Stats Bar */}
          {!loading && listings.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
               {[
                 { label: "Active Listings", val: listings.filter(l=>l.is_active).length, icon: FiCheckCircle, color: "text-emerald-500" },
                 { label: "Total Bookings", val: "12", icon: FiInbox, color: "text-blue-500" },
                 { label: "Average Rating", val: "4.8", icon: FiPlus, color: "text-amber-500" }, // reuse FiPlus for simplicity or add FiStar
                 { label: "Revenue Est.", val: "₹45k", icon: FiDollarSign, color: "text-slate-900" }
               ].map((stat, i) => (
                 <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                       <p className="text-2xl font-black text-slate-900">{stat.val}</p>
                    </div>
                    <stat.icon size={20} className={stat.color} />
                 </div>
               ))}
            </div>
          )}

          {/* Listings Grid */}
          {loading ? (
            <div className="py-32 flex flex-col items-center gap-6">
               <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing your property data...</p>
            </div>
          ) : listings.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center px-10">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-5xl">🌾</div>
               <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">No listings found</h2>
               <p className="text-slate-500 font-medium text-lg max-w-sm mb-10 leading-relaxed italic">You haven't added any farm stays or agritourism experiences yet. Let's get started!</p>
               <Link to="/farmer/listing/new" className="btn-primary px-12 py-5 shadow-2xl shadow-amber-500/20">Create First Listing</Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <AnimatePresence mode="popLayout">
                 {listings.map((item) => (
                   <ListingCard
                     key={item.id}
                     item={item}
                     onEdit={() => navigate(`/farmer/listing/${item.id}`)}
                     onDelete={() => handleDelete(item.id)}
                     deleting={deletingId === item.id}
                   />
                 ))}
               </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
