// ─────────────────────────────────────────────
// Creator Bookings Page (Fixed & Synced)
// Toast inlined — no external toast import
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiUsers,
  FiInbox,
  FiMap,
  FiInfo
} from "react-icons/fi";

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { creatorAPI, bookingAPI } from "@/services/api";
import { BookingCard as SharedBookingCard, BookingDetailModal } from "@/components/ui/booking";

// ── Inline Toast ──────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (!onClose) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const icon =
    type === "error" ? (
      <FiAlertTriangle size={16} className="flex-shrink-0" />
    ) : (
      <FiCheckCircle size={16} className="text-primary flex-shrink-0" />
    );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-md text-primary-foreground text-sm font-bold max-w-sm ${
          type === "error" ? "bg-destructive" : "bg-foreground"
        }`}
      >
        {icon}
        <span className="flex-1">{message}</span>
        {onClose && (
          <button onClick={onClose} className="text-primary-foreground/60 hover:text-primary-foreground ml-1">
            <FiX size={14} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Status Styling ────────────────────────────────────────────────────────────
const statusStyle = {
  confirmed: { class: "bg-primary/10 text-primary",  icon: <FiCheck size={11} /> },
  pending:   { class: "bg-primary/10 text-primary",  icon: <FiClock size={11} /> },
  cancelled: { class: "bg-primary/10 text-destructive",      icon: <FiAlertCircle size={11} /> },
  completed: { class: "bg-primary/10 text-primary",    icon: <FiCheck size={11} /> },
};

function getUser() {
  try { return JSON.parse(localStorage.getItem("nc_user") || "null"); }
  catch { return null; }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CreatorBookings() {
  const [receivedBookings, setReceivedBookings] = useState([]);
  const [madeBookings,     setMadeBookings]     = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [toast,            setToast]            = useState(null);
  
  const [receivedLimit,    setReceivedLimit]    = useState(4);
  const [madeLimit,        setMadeLimit]        = useState(4);
  const [selectedBooking,  setSelectedBooking]  = useState(null);
  
  const user = getUser();

  const showToast = (message, type = "success") => setToast({ message, type });

  useEffect(() => {
    if (!user?.userId) { setLoading(false); return; }
    creatorAPI.getBookings(user.userId)
      .then(res => {
        setReceivedBookings(res.data?.received || []);
        setMadeBookings(res.data?.made || []);
      })
      .catch(err => console.error("Failed to fetch bookings:", err))
      .finally(() => setLoading(false));
  }, [user?.userId]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await bookingAPI.updateCreatorStatus(id, user.userId, { status: newStatus });
      setReceivedBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      showToast(`Collaboration ${newStatus} successfully!`, "success");
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast("Failed to update status. Please try again.", "error");
    }
  };

  const BookingCard = ({ b, isReceived, i }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      onClick={() => setSelectedBooking(b)}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group"
    >
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary flex items-center justify-center text-2xl shadow-inner border border-primary/30">
          {b.item_emoji || (isReceived ? "🎬" : "🌿")}
        </div>

        <div>
          <p className="font-semibold text-foreground text-lg">
            {isReceived ? (b.tourist_name || "Guest") : b.item_name}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs mt-2 font-medium">
            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
              <FiCalendar size={13} className="text-muted-foreground" />
              {new Date(b.check_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} —{" "}
              {new Date(b.check_out).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              <FiUsers size={13} />
              {b.adults || 1} { (b.adults || 1) > 1 ? 'Adults' : 'Adult' }
              {b.children > 0 && `, ${b.children} ${b.children > 1 ? 'Children' : 'Child'}`}
            </span>
            {b.region && (
              <span className="text-muted-foreground">• {b.region}</span>
            )}
          </div>
          {b.collab_note && (
            <div className="flex items-start gap-1.5 mt-2 bg-surface p-2 rounded-lg border border-border max-w-sm">
              <FiInfo size={11} className="text-muted-foreground mt-0.5" />
              <p className="text-[11px] text-muted-foreground italic">"{b.collab_note}"</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-border">
        <div className="text-right">
          <p className="font-semibold text-foreground text-xl tracking-tight">
            ₹{Number(b.total_price || 0).toLocaleString()}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-xl uppercase tracking-wider ${
              statusStyle[b.status]?.class || statusStyle.pending.class
            }`}>
              {statusStyle[b.status]?.icon || statusStyle.pending.icon}
              {b.status}
            </span>
          </div>
        </div>

        {isReceived && b.status === "pending" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusUpdate(b.id, "confirmed")}
              className="w-10 h-10 rounded-2xl bg-foreground text-primary-foreground flex items-center justify-center hover:bg-primary transition-all shadow-sm"
              title="Accept"
            >
              <FiCheck size={18} />
            </button>
            <button
              onClick={() => handleStatusUpdate(b.id, "cancelled")}
              className="w-10 h-10 rounded-2xl bg-card text-muted-foreground border border-border flex items-center justify-center hover:text-destructive hover:border-destructive/30 transition-all"
              title="Reject"
            >
              <FiX size={18} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar minimal />

      <div className="pt-24 pb-20 px-6 flex flex-col items-center">
        <div className="w-full max-w-5xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-semibold text-foreground tracking-tight">Creator Dashboard</h1>
            <p className="text-muted-foreground font-medium mt-2">Manage your collaborations and personal bookings</p>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Syncing Collaborations...</p>
            </div>
          ) : (
            <div className="space-y-16">
              {/* Section: Received */}
              <section>
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm ">
                      <FiInbox size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Collaborations Received</h2>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Work requests from tourists</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
                    {receivedBookings.length} TOTAL
                  </span>
                </div>

                {receivedBookings.length === 0 ? (
                  <div className="bg-card rounded-2xl p-12 border-2 border-dashed border-border text-center opacity-70">
                    <p className="text-muted-foreground font-bold">No collaborations yet. They'll appear here once tourists reach out!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {receivedBookings.slice(0, receivedLimit).map((b, i) => (
                      <BookingCard key={b.id} b={b} isReceived={true} i={i} />
                    ))}
                    {receivedBookings.length > receivedLimit && (
                      <button 
                        onClick={() => setReceivedLimit(prev => prev + 4)}
                        className="mt-4 w-full py-4 rounded-2xl border-2 border-border text-muted-foreground font-semibold text-sm hover:bg-card hover:border-border transition-all uppercase tracking-widest"
                      >
                        Load More Collaborations
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Section: Made */}
              <section>
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm ">
                      <FiMap size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">My Farm stays</h2>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Bookings you've made as a guest</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
                    {madeBookings.length} TOTAL
                  </span>
                </div>

                {madeBookings.length === 0 ? (
                  <div className="bg-card rounded-2xl p-12 border-2 border-dashed border-border text-center opacity-70">
                    <p className="text-muted-foreground font-bold">You haven't made any farm bookings yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {madeBookings.slice(0, madeLimit).map((b, i) => (
                      <BookingCard key={b.id} b={b} isReceived={false} i={i} />
                    ))}
                    {madeBookings.length > madeLimit && (
                      <button 
                        onClick={() => setMadeLimit(prev => prev + 4)}
                        className="mt-4 w-full py-4 rounded-2xl border-2 border-border text-muted-foreground font-semibold text-sm hover:bg-card hover:border-border transition-all uppercase tracking-widest"
                      >
                        Load More Travels
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailModal 
            booking={selectedBooking} 
            onClose={() => setSelectedBooking(null)} 
          />
        )}
      </AnimatePresence>

      {/* Inline Toast — no external import needed */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}