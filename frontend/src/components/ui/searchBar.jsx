import { motion } from "framer-motion";
import { FiMapPin, FiArrowRight } from "react-icons/fi";

export default function SearchBar({ 
  query, setQuery, 
  startDate, setStartDate, 
  endDate, setEndDate, 
  onSearch,
  placeholder = "Where to? (e.g. Coorg, Tea, Kerala)"
}) {
  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <motion.div 
      variants={fadeUp} 
      initial="initial" 
      animate="animate" 
      className="bg-white p-2 rounded-[32px] shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto w-full"
    >
      <div className="flex-1 flex items-center gap-3 px-5 py-3 border-b md:border-b-0 md:border-r border-slate-100 w-full group">
        <FiMapPin className="text-amber-500 group-hover:scale-110 transition-transform" />
        <input 
          type="text" 
          placeholder={placeholder} 
          className="w-full bg-transparent outline-none text-slate-700 text-sm font-bold placeholder:text-slate-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      
      <div className="flex items-center gap-2 px-5 py-3 w-full md:w-auto">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start</span>
          <input 
            type="date" 
            className="bg-transparent outline-none text-slate-700 text-xs font-black cursor-pointer" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div className="h-8 w-[1px] bg-slate-100 mx-2" />
        
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End</span>
          <input 
            type="date" 
            className="bg-transparent outline-none text-slate-700 text-xs font-black cursor-pointer" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        
        <button 
          onClick={onSearch}
          className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 ml-2"
        >
          <FiArrowRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}
