import { ArrowUpDown } from "lucide-react";

export interface SortOption {
  value: string;
  label: string;
}

export interface SortControlProps {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
  className?: string;
}

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
];

export function SortControl({
  value,
  onChange,
  options = DEFAULT_SORT_OPTIONS,
  className = "",
}: SortControlProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-harvest-500/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
