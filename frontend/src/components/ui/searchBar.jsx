import { motion } from "framer-motion";
import { FiMapPin, FiSearch, FiCalendar } from "react-icons/fi";

export default function SearchBar({ 
  query, setQuery, 
  startDate, setStartDate, 
  endDate, setEndDate,
  onSearch,
  placeholder = "Farm name, crop, city… (e.g. Coorg, Coffee, Kerala)"
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col md:flex-row items-stretch gap-0 max-w-3xl mx-auto w-full overflow-hidden"
    >
      {/* Search input */}
      <div className="flex-1 flex items-center gap-3 px-5 py-4 border-b md:border-b-0 md:border-r border-slate-100 group">
        <FiMapPin className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform" size={18} />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-slate-800 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Date range */}
      <div className="flex items-center gap-0 border-b md:border-b-0 md:border-r border-slate-100">
        <div className="flex flex-col px-5 py-3 border-r border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
            <FiCalendar size={9} /> Check-in
          </span>
          <input
            type="date"
            className="bg-transparent outline-none text-slate-700 text-xs font-bold cursor-pointer"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col px-5 py-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
            <FiCalendar size={9} /> Check-out
          </span>
          <input
            type="date"
            className="bg-transparent outline-none text-slate-700 text-xs font-bold cursor-pointer"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Search button */}
      <button
        onClick={onSearch}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-bold px-7 py-4 transition-all"
      >
        <FiSearch size={18} />
        <span className="text-sm hidden md:block">Search</span>
      </button>
    </motion.div>
  );
}
