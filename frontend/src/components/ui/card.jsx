import { motion } from "framer-motion";
import { FiMapPin, FiStar, FiArrowRight, FiTrendingUp, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function ItemCard({ item, type = "farm" }) {
  const navigate = useNavigate();
  const isFarm = type === "farm";

  const handleClick = () => {
    navigate(`/${isFarm ? "farmercard" : "creatorcard"}/${item.id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      className="bg-white rounded-[32px] border border-slate-200 p-6 cursor-pointer transition-all duration-300 group flex flex-col h-full"
      onClick={handleClick}
    >
      {/* ── Header: Name & Type ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-slate-900 text-lg leading-tight truncate group-hover:text-amber-500 transition-colors">
            {item.name}
          </h3>
          {item.is_verified && <FiCheckCircle className="text-blue-500 shrink-0" size={16} />}
        </div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${isFarm ? "text-amber-500" : "text-purple-500"}`}>
          {isFarm ? "Farm Experience" : (item.niche || "Top Creator")}
        </p>
      </div>

      {/* ── Body: Photo ── */}
      <div className="relative aspect-[4/3] rounded-24 overflow-hidden mb-5 bg-slate-100 border border-slate-100">
        {isFarm ? (
          item.farm_photo ? (
            <img src={item.farm_photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🌾</div>
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-5xl font-black">
            {item.name[0]}
          </div>
        )}
        
        {/* Match Score Badge */}
        {item.matchScore > 0 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 border border-white">
            <span className="text-[10px] font-black text-slate-900 tracking-tight">
              Match: <span className="text-emerald-500">{item.matchScore}%</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Footer: Details & Metrics ── */}
      <div className="mt-auto space-y-3">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
          <FiMapPin size={12} className={isFarm ? "text-amber-500" : "text-purple-500"} />
          <span className="truncate">{item.area ? `${item.area}, ` : ""}{item.state || "India"}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              {isFarm ? "Rate per day" : "Experiences"}
            </span>
            <span className="font-black text-slate-900">
              {isFarm ? `₹${item.price || 800}` : (item.experience || "24+ Trips")}
            </span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-400 transition-all">
            <FiArrowRight size={18} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
