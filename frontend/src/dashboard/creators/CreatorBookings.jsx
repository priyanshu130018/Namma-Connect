import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiMapPin, FiCheck, FiClock, FiAlertCircle, FiX } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { creatorAPI } from "@/services/api";

const statusStyle = {
  Confirmed: { class: "bg-green-100 text-green-700", icon: <FiCheck size={11} /> },
  Pending: { class: "bg-amber-100 text-amber-700", icon: <FiClock size={11} /> },
  Cancelled: { class: "bg-red-100 text-red-600", icon: <FiAlertCircle size={11} /> },
};

function getUser() {
  try { return JSON.parse(localStorage.getItem("ng_user")); } catch { return null; }
}

export default function CreatorBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (user?.loginId) {
      creatorAPI.getBookings(user.loginId)
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
      alert("Status update failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 flex flex-col items-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-3xl">
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
            <h1 className="text-3xl font-black text-slate-900">Collaboration Requests</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your upcoming farm collaborations</p>
          </motion.div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Loading your collaborations...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No collaborations yet</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Requests from farmers for content creation will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-3xl">
                      {b.item_emoji || "🎬"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm">{b.tourist_name || "Farmer"}</h3>
                      <p className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">{b.item_name}</p>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-1"><FiCalendar size={9} />{new Date(b.check_in).toLocaleDateString()} - {new Date(b.check_out).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="font-semibold text-slate-900 text-xs">Free (Collab)</span>
                      <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusStyle[b.status]?.class || statusStyle.Pending.class}`}>
                        {statusStyle[b.status]?.icon || statusStyle.Pending.icon}{b.status}
                      </span>
                    </div>

                    {b.status === "Pending" && (
                      <div className="flex items-center gap-2 border-l border-slate-100 pl-5 ml-2">
                         <button onClick={() => handleStatusUpdate(b.id, "Confirmed")} className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 transition-colors shadow-sm">
                           <FiCheck size={14} />
                         </button>
                         <button onClick={() => handleStatusUpdate(b.id, "Cancelled")} className="w-7 h-7 rounded-lg bg-white text-red-500 border border-slate-200 flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm">
                           <FiX size={14} />
                         </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8 p-5 bg-purple-50 border border-purple-200 rounded-2xl max-w-3xl w-full">
            <p className="text-purple-800 text-sm font-semibold mb-1">🎬 Creator Benefit</p>
            <p className="text-purple-700 text-xs leading-relaxed">
              Verified creators get subsidised or free farm stays when partnering with NammaGig farms for content creation.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
