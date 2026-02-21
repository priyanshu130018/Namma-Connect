import { motion } from "framer-motion";
import { FiCalendar, FiMapPin, FiUsers, FiTrash2, FiInbox, FiRefreshCw } from "react-icons/fi";
import { Link } from "react-router-dom";

/**
 * BookingList — generic booking list UI
 *
 * Props:
 *  bookings    array           List of booking objects from API
 *  loading     bool            Show loading skeleton
 *  error       string          Error message (empty = no error)
 *  onRetry     fn()            Retry fetching
 *  onCancel    fn(bookingId)   Cancel a booking
 *  cancelling  number|null     ID of booking currently being cancelled
 *  isLoggedIn  bool            If false, show "please log in" state
 */

const STATUS_COLORS = {
  Confirmed: "bg-green-100 text-green-700",
  Pending:   "bg-amber-100 text-amber-700",
  Cancelled: "bg-red-100 text-red-600",
};

const fmt = (s) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function BookingList({
  bookings = [],
  loading = false,
  error = "",
  onRetry,
  onCancel,
  cancelling = null,
  isLoggedIn = true,
}) {
  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">My Bookings</h1>
        {onRetry && (
          <button onClick={onRetry} disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 font-medium transition-colors disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-sm flex items-center gap-3">
          <span>{error}</span>
          {onRetry && <button onClick={onRetry} className="ml-auto font-semibold underline">Retry</button>}
        </div>
      )}

      {/* Not logged in */}
      {!loading && !isLoggedIn && (
        <div className="text-center py-16">
          <FiInbox size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 mb-3">Please log in to view your bookings.</p>
          <Link to="/login" className="bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-green-500 transition-all">
            Log In
          </Link>
        </div>
      )}

      {/* Empty */}
      {!loading && isLoggedIn && !error && bookings.length === 0 && (
        <div className="text-center py-16">
          <FiInbox size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 mb-1 font-semibold">No bookings yet</p>
          <p className="text-slate-400 text-sm mb-5">Browse farms and creators to make your first booking.</p>
          <Link to="/home" className="bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-green-500 transition-all">
            Explore Farms
          </Link>
        </div>
      )}

      {/* Cards */}
      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((b, i) => (
            <motion.div key={b.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex gap-4 items-start"
            >
              {/* Emoji icon */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
                b.booking_type === "farm" ? "bg-green-50" : "bg-purple-50"
              }`}>
                {b.item_emoji || (b.booking_type === "farm" ? "🌾" : "🎬")}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-black text-slate-900">{b.item_name}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {b.status}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    b.booking_type === "farm" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {b.booking_type === "farm" ? "Farm Booking" : "Creator Collab"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
                  {b.region && <span className="flex items-center gap-1"><FiMapPin size={10} />{b.region}</span>}
                  <span className="flex items-center gap-1">
                    <FiCalendar size={10} />{fmt(b.check_in)} → {fmt(b.check_out)}
                  </span>
                  {b.booking_type === "farm" && (
                    <span className="flex items-center gap-1"><FiUsers size={10} />{b.guests} guest{b.guests > 1 ? "s" : ""}</span>
                  )}
                </div>

                {b.collab_note && (
                  <p className="text-xs text-slate-400 mt-2 italic">Note: "{b.collab_note}"</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  {b.total_price > 0
                    ? <span className="text-sm font-black text-slate-900">₹{b.total_price.toLocaleString()}</span>
                    : <span className="text-xs text-slate-400">Free collab</span>
                  }
                  {b.status !== "Cancelled" && onCancel && (
                    <button onClick={() => onCancel(b.id)} disabled={cancelling === b.id}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors disabled:opacity-50"
                    >
                      {cancelling === b.id
                        ? <span className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                        : <FiTrash2 size={12} />
                      }
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
