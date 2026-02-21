import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiUsers, FiCheck, FiClock, FiX, FiInfo } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { farmAPI } from "@/services/api";

const statusStyle = {
  Confirmed: { class: "bg-green-100 text-green-700", icon: <FiCheck size={11} /> },
  Pending: { class: "bg-amber-100 text-amber-700", icon: <FiClock size={11} /> },
  Cancelled: { class: "bg-red-100 text-red-600", icon: <FiX size={11} /> },
};

function getUser() {
  try { return JSON.parse(localStorage.getItem("ng_user")); } catch { return null; }
}

export default function FarmerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (user?.loginId) {
      farmAPI.getBookings(user.loginId)
        .then(res => {
          setBookings(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch bookings:", err);
          setLoading(false);
        });
    }
  }, [user?.loginId]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await bookingAPI.updateStatus(id, newStatus);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 flex flex-col items-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-4xl">
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
            <h1 className="text-3xl font-black text-slate-900">Farm Bookings</h1>
            <p className="text-slate-500 text-sm mt-1">Manage guest stays and experiences on your farm</p>
          </motion.div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
              <div className="text-5xl mb-4">🌾</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No bookings yet</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Once tourists start booking stays on your farm, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {bookings.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-700 font-bold text-lg">
                      {b.item_emoji || "🏠"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <p className="font-bold text-slate-900 text-sm">{b.tourist_name || "Guest"}</p>
                         <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">#{b.id}</span>
                         <span className="text-xs text-slate-400 font-medium">• {b.item_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-xs mt-1">
                        <span className="flex items-center gap-1"><FiCalendar size={12}/>{new Date(b.check_in).toLocaleDateString()} - {new Date(b.check_out).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><FiUsers size={12}/>{b.guests} guests</span>
                      </div>
                      {b.collab_note && (
                        <div className="flex items-start gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <FiInfo size={11} className="text-slate-400 mt-0.5" />
                          <p className="text-[11px] text-slate-500 italic">"{b.collab_note}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="font-black text-slate-900 text-sm">₹{b.total_price?.toLocaleString() || 0}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight ${statusStyle[b.status]?.class || statusStyle.Pending.class}`}>
                        {statusStyle[b.status]?.icon || statusStyle.Pending.icon}{b.status}
                      </span>
                    </div>
                    
                    {b.status === "Pending" && (
                      <div className="flex items-center gap-2 border-l border-slate-100 pl-6 ml-2">
                        <button 
                          onClick={() => handleStatusUpdate(b.id, "Confirmed")}
                          className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition-colors shadow-sm"
                          title="Confirm Booking"
                        >
                          <FiCheck size={16} />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(b.id, "Cancelled")}
                          className="w-8 h-8 rounded-full bg-white hover:bg-red-50 text-red-500 border border-slate-200 flex items-center justify-center transition-colors shadow-sm"
                          title="Reject Booking"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
