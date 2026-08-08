import { motion } from "framer-motion";
import { FiMapPin, FiSearch } from "react-icons/fi";

export default function SearchBar({
  query,
  setQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSearch,
  placeholder = "Farm name, crop or city — e.g. Coorg, coffee, Kerala",
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto grid w-full max-w-3xl gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center"
    >
      <div className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5">
        <FiMapPin className="shrink-0 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <label className="flex flex-col gap-0.5 rounded-xl border border-border px-3 py-1.5 md:border-0 md:border-l md:border-border md:pl-4">
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Check-in
        </span>
        <input
          type="date"
          className="w-full cursor-pointer bg-transparent text-sm text-foreground outline-none"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-0.5 rounded-xl border border-border px-3 py-1.5 md:border-0 md:border-l md:border-border md:pl-4">
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Check-out
        </span>
        <input
          type="date"
          className="w-full cursor-pointer bg-transparent text-sm text-foreground outline-none"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </label>

      <button onClick={onSearch} className="btn-primary h-11 justify-center">
        <FiSearch size={16} />
        <span className="text-sm">Search</span>
      </button>
    </motion.div>
  );
}
