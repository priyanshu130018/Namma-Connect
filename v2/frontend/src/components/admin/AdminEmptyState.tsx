import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminEmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  onClearFilters?: () => void;
  actionLabel?: string;
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  onClearFilters,
  actionLabel = "Clear Filters",
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl my-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
        <Icon className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {onClearFilters && (
        <Button
          size="sm"
          variant="outline"
          onClick={onClearFilters}
          className="rounded-xl font-bold text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
