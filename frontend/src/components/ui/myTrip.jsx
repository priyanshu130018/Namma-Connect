import { motion } from "framer-motion";
import { FiMapPin, FiCalendar, FiClock, FiEye, FiInbox } from "react-icons/fi";

/**
 * TripList — generic trip/portfolio list UI
 *
 * Props:
 *  title       string    Page heading
 *  subtitle    string    Subheading
 *  trips       array     [{ farm, state, date, duration?, views?, status, emoji }]
 *  accentCard  string    Tailwind bg + border classes for the emoji card ("bg-green-50 border-green-200" etc.)
 *  statusColors object   { [statusLabel]: "tailwind badge classes" }
 *  showViews   bool      Show the views count column (default: false)
 *  action      ReactNode Optional CTA element (e.g. a <Link> button) shown in the header
 *  emptyText   string    Shown when trips array is empty
 */
export default function TripList({
  title = "My Trips",
  subtitle = "All your farm experience journeys",
  trips = [],
  accentCard = "bg-green-50 border-green-200",
  statusColors = {
    Completed: "bg-green-100 text-green-700",
    Upcoming:  "bg-blue-100 text-blue-700",
    Published: "bg-green-100 text-green-700",
  },
  showViews = false,
  action = null,
  emptyText = "No trips yet. Start exploring farms!",
}) {
  return (
    <div className="p-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>
        {action}
      </motion.div>

      {trips.length === 0 ? (
        <div className="text-center py-16">
          <FiInbox size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((t, i) => (
            <motion.div
              key={t.farm + i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ x: 4 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5"
            >
              <div className={`w-16 h-16 flex-shrink-0 rounded-2xl border flex items-center justify-center text-4xl ${accentCard}`}>
                {t.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900">{t.farm}</h3>
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <FiMapPin size={10} />{t.state}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1"><FiCalendar size={9} />{t.date}</span>
                  {t.duration && (
                    <span className="flex items-center gap-1"><FiClock size={9} />{t.duration}</span>
                  )}
                  {showViews && t.views && t.views !== "—" && (
                    <span className="flex items-center gap-1 text-green-600 font-semibold">
                      <FiEye size={9} />{t.views} views
                    </span>
                  )}
                </div>
              </div>
              <span className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${statusColors[t.status] ?? "bg-slate-100 text-slate-500"}`}>
                {t.status}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
