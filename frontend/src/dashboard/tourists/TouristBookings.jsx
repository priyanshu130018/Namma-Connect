import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiCheckCircle, FiX, FiAlertTriangle, FiPlus, 
  FiInbox, FiCalendar, FiClock, FiActivity, FiMapPin,
  FiChevronRight, FiCreditCard, FiCompass, FiRefreshCw
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import BookingList from "@/components/ui/booking";
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

export default function TouristBookings() {
  const user = getUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchBookings = async () => {
    const uid = user?.userId || user?.id;
    if (!uid) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const res = await bookingAPI.getUserBookings(uid);
      setBookings(res.data || []);
    } catch {
      setError("Sync failed. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [user?.userId, user?.id]);

  const handleCancel = async (id) => {
    if (!window.confirm("Abandon this booking?")) return;
    setCancelling(id);
    try {
      await bookingAPI.updateStatus(id, { status: "cancelled" });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
      showToast("Booking reference revoked.");
    } catch {
      showToast("Operation failed.", "error");
    } finally {
      setCancelling(null);
    }
  };

  const activeBookings = bookings.filter(b => b.status === "pending" || b.status === "confirmed" || b.status === "accepted");
  const completedCount = bookings.filter(b => b.status === "completed").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-slate-950 selection:text-white">
      <Navbar />

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-10">
          
          {/* Booking Feed */}
          <div className="w-full">
             <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 md:p-12 min-h-[600px] relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-50 pb-8">
                   <div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Booking History</h2>
                      <p className="text-slate-400 text-sm font-medium mt-1">Real-time update on all your past and future registrations.</p>
                   </div>
                   <button 
                     onClick={fetchBookings} 
                     disabled={loading}
                     className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all active:scale-95"
                   >
                     <FiRefreshCw className={loading ? "animate-spin" : ""} /> {loading ? "Syncing..." : "Refresh Feed"}
                   </button>
                </div>

                <div className="relative z-10">
                   <BookingList
                     bookings={bookings}
                     loading={loading}
                     error={error}
                     onRetry={fetchBookings}
                     onCancel={handleCancel}
                     cancelling={cancelling}
                     isLoggedIn={!!user}
                     title=""
                     emptyLabel="Empty Horizons"
                     emptyDesc="Your booking history is clear. Why not start a new adventure?"
                   />
                </div>

                {/* Aesthetic bg text */}
                <div className="absolute -bottom-10 -right-20 pointer-events-none opacity-[0.03] text-[200px] font-black leading-none select-none">
                   NAMMA
                </div>
             </div>
          </div>

        </div>
      </main>

      <Footer />

      {/* Floating Notifications */}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-10 right-10 z-50">
             <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </AnimatePresence>
      <BookingConfirmedPopup bookings={bookings} />
    </div>
  );
}

// Reuse/Refine Toast
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 text-white font-black text-sm ${type === 'error' ? 'bg-red-600 shadow-red-500/20' : 'bg-slate-900 shadow-black/20'}`}
    >
      {type === 'error' ? <FiAlertTriangle /> : <FiCheckCircle className="text-emerald-400" />}
      {message}
    </motion.div>
  );
}

// Original Confirmation Popup logic
function BookingConfirmedPopup({ bookings }) {
  const [popup, setPopup] = useState(null);
  const seenKey = "ng_confirmed_seen";
  useEffect(() => {
    const seen = JSON.parse(sessionStorage.getItem(seenKey) || "[]");
    const fresh = bookings.find(b => (b.status === "confirmed" || b.status === "accepted") && !seen.includes(b.id));
    if (!fresh) return;
    sessionStorage.setItem(seenKey, JSON.stringify([...seen, fresh.id]));
    setPopup({ id: fresh.id, itemName: fresh.item_name || fresh.farm_name || "booking" });
    const t = setTimeout(() => setPopup(null), 3500);
    return () => clearTimeout(t);
  }, [bookings]);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
           initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
           className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 rounded-[30px] shadow-2xl flex items-center gap-5 max-w-sm w-full"
        >
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
              <FiCheckCircle size={24} />
           </div>
           <div>
              <p className="font-black text-xs uppercase tracking-widest opacity-60 mb-0.5">Registration Confirmed</p>
              <p className="font-black text-sm">{popup.itemName} is waiting for you!</p>
           </div>
           <button onClick={() => setPopup(null)} className="ml-auto opacity-40 hover:opacity-100 transition-opacity"><FiX /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


