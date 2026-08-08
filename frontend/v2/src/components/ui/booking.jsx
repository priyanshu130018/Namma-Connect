import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCalendar, FiUsers, FiTrash2, FiInbox,
  FiRefreshCw, FiArrowRight, FiCheckCircle,
  FiClock, FiXCircle, FiMapPin
} from "react-icons/fi";
import { Link, useNavigate } from "@/lib/router-compat";
import { slugify } from "@/components/ui/ListingCard";

/**
 * BookingCard — universal booking card for tourists, farmers & creators.
 * Used as a shared component across MyBookings, FarmerBookings & CreatorBookings.
 */

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary border-primary/30", icon: <FiCheckCircle size={10} /> },
  accepted:  { label: "Confirmed", color: "bg-primary/10 text-primary border-primary/30", icon: <FiCheckCircle size={10} /> },
  pending:   { label: "Pending",   color: "bg-primary/10 text-primary border-primary/30",    icon: <FiClock size={10} /> },
  cancelled: { label: "Cancelled", color: "bg-primary/10 text-destructive border-destructive/30",          icon: <FiXCircle size={10} /> },
  completed: { label: "Completed", color: "bg-primary/10 text-primary border-primary/30",        icon: <FiCheckCircle size={10} /> },
};

const fmt = (s) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function BookingCard({ booking: b, index = 0, onCancel, cancelling = null, onOpenDetail }) {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[b.status?.toLowerCase()] || STATUS_CONFIG.pending;
  const isFarm = b.booking_type === "farm";

  const handleClick = (e) => {
    if (onOpenDetail) {
      onOpenDetail(b);
    } else {
      const name = b.item_name || "listing";
      if (isFarm && b.farm_id) {
        navigate(`/farmercard/${slugify(name, b.farm_id)}`);
      } else if (!isFarm && b.creator_id) {
        navigate(`/creatorcard/${slugify(name, b.creator_id)}`);
      }
    }
  };

  return (
    <motion.div
      key={b.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className="bg-card border border-border rounded-[28px] p-5 shadow-sm hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer group"
    >
      {/* Left — icon + info */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-inner border ${
          isFarm ? "bg-primary/10 border-primary/30" : "bg-primary/10 border-primary/30"
        }`}>
          {b.item_emoji || (isFarm ? "🌾" : "🎬")}
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {b.item_name || "Booking"}
          </h3>
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${isFarm ? "text-primary" : "text-primary"}`}>
            {isFarm ? "Farm Stay" : "Creator Collab"}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1 bg-surface border border-border px-2.5 py-1 rounded-full text-[10px]">
              <FiCalendar size={10} className="text-muted-foreground" />
              {fmt(b.check_in)} — {fmt(b.check_out)}
            </span>
            {(b.adults || b.guests) > 0 && (
              <span className="flex items-center gap-1 bg-surface border border-border px-2.5 py-1 rounded-full text-[10px]">
                <FiUsers size={10} className="text-muted-foreground" />
                {b.adults || b.guests || 1} Adults
                {b.children > 0 && ` · ${b.children} Children`}
              </span>
            )}
            {b.tourist_name && (
              <span className="flex items-center gap-1 bg-surface border border-border px-2.5 py-1 rounded-full text-[10px]">
                <FiMapPin size={10} className="text-muted-foreground" />
                {b.tourist_name}
              </span>
            )}
          </div>

          {b.collab_note && (
            <p className="text-[10px] text-muted-foreground mt-2 italic bg-surface px-2 py-1 rounded-lg border border-border inline-block max-w-xs truncate">
 "{b.collab_note}"
            </p>
          )}
        </div>
      </div>

      {/* Right — price + status + actions */}
      <div className="flex items-center justify-between md:justify-end gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-border">
        <div className="text-right">
          <p className="text-xl font-semibold text-foreground tracking-tight">
            ₹{Number(b.total_price || 0).toLocaleString()}
          </p>
          <span className={`inline-flex items-center gap-1.5 text-[9px] font-semibold px-2.5 py-1.5 rounded-xl uppercase tracking-wider mt-1.5 border ${status.color}`}>
            {status.icon} {status.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center group-hover:bg-foreground group-hover:text-primary-foreground transition-all">
            <FiArrowRight size={15} />
          </div>
          {b.status?.toLowerCase() === "pending" && onCancel && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(b.id); }}
              disabled={cancelling === b.id}
              className="w-9 h-9 rounded-full bg-card text-muted-foreground border border-border flex items-center justify-center hover:text-destructive hover:border-destructive/30 transition-all"
            >
              {cancelling === b.id
                ? <FiRefreshCw className="animate-spin" size={14} />
                : <FiTrash2 size={14} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export const BookingDetailModal = ({ booking, onClose }) => {
  if (!booking) return null;
  const isFarm = booking.booking_type === "farm";
  const st = STATUS_CONFIG[booking.status?.toLowerCase()] || STATUS_CONFIG.pending;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-card w-full max-w-sm rounded-2xl shadow-md overflow-hidden p-8"
        >
          <div className="flex justify-between items-start mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner border ${
              isFarm ? "bg-primary/10 border-primary/30" : "bg-primary/10 border-primary/30"
            }`}>
              {booking.item_emoji || (isFarm ? "🌾" : "🎬")}
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted hover:bg-muted flex items-center justify-center text-muted-foreground transition-all">
               <FiRefreshCw className="rotate-45" size={20} />
            </button>
          </div>

          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isFarm ? "text-primary" : "text-primary"}`}>
            {isFarm ? "Farm Experience" : "Creator Collaboration"}
          </p>
          <h2 className="text-2xl font-semibold text-foreground mb-6 leading-tight">
            {booking.item_name}
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-muted-foreground shrink-0"><FiMapPin size={16}/></div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Address / Location</p>
                <p className="text-sm font-bold text-foreground">{booking.region || "Verified Location"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-muted-foreground shrink-0"><FiCalendar size={16}/></div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Check-in / Out</p>
                <p className="text-sm font-bold text-foreground">{fmt(booking.check_in)} — {fmt(booking.check_out)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-muted-foreground shrink-0"><FiUsers size={16}/></div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Guests</p>
                <p className="text-sm font-bold text-foreground">
                  {booking.adults || (booking.guests || 1)} Adults
                  {booking.children > 0 && `, ${booking.children} Children`}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total Value</p>
                <p className="text-3xl font-semibold text-foreground tracking-tight">₹{Number(booking.total_price || 0).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-xl uppercase tracking-wider border ${st.color}`}>
                  {st.icon} {st.label}
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-10 bg-foreground text-primary-foreground font-semibold py-4 rounded-2xl hover:bg-foreground transition-all shadow-sm"
          >
            Close Detail
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/**
 * BookingList — wraps BookingCard items with loading/empty states.
 * title and emptyLabel are customisable for different dashboard contexts.
 */
export default function BookingList({
  bookings = [],
  loading = false,
  error = "",
  onRetry,
  onCancel,
  cancelling = null,
  isLoggedIn = true,
  title = "Booking History",
  subtitle = "Manage your travels and collaborations",
  emptyLabel = "No bookings yet",
  emptyDesc = "Browse farms and creators to start your journey.",
}) {
  const [limit, setLimit] = useState(6);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Use framer-motion AnimatePresence for the modal
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailModal 
            booking={selectedBooking} 
            onClose={() => setSelectedBooking(null)} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary font-semibold transition-all disabled:opacity-50 bg-card border border-border px-4 py-2 rounded-2xl shadow-sm hover:shadow"
          >
            <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-[28px] p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-muted rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded-full w-1/3" />
                  <div className="h-3 bg-surface rounded-full w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-6 text-sm flex items-center justify-between">
          <span className="font-bold">{error}</span>
          {onRetry && <button onClick={onRetry} className="bg-primary/10 px-4 py-2 rounded-xl font-semibold hover:bg-primary transition-colors text-xs">Retry</button>}
        </div>
      )}

      {/* Not Logged In */}
      {!loading && !isLoggedIn && (
        <div className="text-center py-16 bg-card rounded-2xl border-2 border-dashed border-border">
          <FiInbox size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-semibold mb-6">Please log in to view your bookings.</p>
          <Link to="/login" className="bg-foreground text-primary-foreground font-semibold px-8 py-3 rounded-2xl text-sm hover:bg-primary transition-all">Log In</Link>
        </div>
      )}

      {/* Empty */}
      {!loading && isLoggedIn && !error && bookings.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border-2 border-dashed border-border">
          <FiInbox size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-semibold text-lg">{emptyLabel}</p>
          <p className="text-muted-foreground text-sm mt-1 mb-6">{emptyDesc}</p>
          <Link to="/home" className="bg-foreground text-primary-foreground font-semibold px-8 py-3 rounded-2xl text-sm hover:bg-primary transition-all">Explore Now</Link>
        </div>
      )}

      {/* Booking Cards */}
      {!loading && !error && isLoggedIn && bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.slice(0, limit).map((b, i) => (
            <BookingCard
              key={b.id}
              booking={b}
              index={i}
              onCancel={onCancel}
              cancelling={cancelling}
              onOpenDetail={(book) => setSelectedBooking(book)}
            />
          ))}
          {bookings.length > limit && (
            <button
              onClick={() => setLimit(l => l + 6)}
              className="w-full py-4 rounded-2xl border-2 border-border text-muted-foreground font-semibold text-sm hover:bg-card hover:border-border transition-all"
            >
              Load More ({bookings.length - limit} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
