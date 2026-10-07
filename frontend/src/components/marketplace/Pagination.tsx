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

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    pages.push(1);
    if (currentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push("...");
    }
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 ${className}`}
    >
      <div className="flex items-center gap-2">
        {totalItems !== undefined && (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems === 0 ? 0 : startItem}</span> to{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">{endItem}</span> of{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems}</span> listings
          </p>
        )}
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="rounded-xl gap-1 text-xs font-bold h-8 px-2.5"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span key={`ell-${idx}`} className="px-1.5 text-xs text-slate-400 select-none">
                ...
              </span>
            ) : (
              <Button
                key={`page-${p}`}
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p as number)}
                disabled={isLoading}
                className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-bold transition-all ${
                  p === currentPage
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                aria-label={`Go to page ${p}`}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="rounded-xl gap-1 text-xs font-bold h-8 px-2.5"
          aria-label="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
