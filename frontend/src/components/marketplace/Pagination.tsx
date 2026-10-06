import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  isLoading?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 16,
  isLoading = false,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : currentPage * itemsPerPage;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 ${className}`}
    >
      {totalItems !== undefined && (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems === 0 ? 0 : startItem}</span> to{" "}
          <span className="font-bold text-slate-900 dark:text-slate-100">{endItem}</span> of{" "}
          <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems}</span> listings
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="rounded-xl gap-1 text-xs font-bold"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center gap-1 px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <span>Page {currentPage} of {totalPages || 1}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="rounded-xl gap-1 text-xs font-bold"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
