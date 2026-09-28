import { LucideIcon } from "lucide-react";

export interface CategoryItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export interface CategoryFilterProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  className = "",
}: CategoryFilterProps) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none ${className}`}>
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 select-none ${
              isActive
                ? "bg-harvest-600 dark:bg-harvest-500 text-white shadow-md shadow-harvest-600/20 ring-2 ring-harvest-600/20"
                : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {Icon && <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-harvest-600 dark:text-harvest-400"}`} />}
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
