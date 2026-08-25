import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  side = "right",
  className,
}: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClasses = {
    right: "right-0 top-0 h-full w-full max-w-md border-l",
    left: "left-0 top-0 h-full w-full max-w-md border-r",
    bottom: "bottom-0 inset-x-0 h-auto max-h-[85vh] rounded-t-3xl border-t",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100",
          sideClasses[side],
          className
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>}
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-4">{children}</div>
      </div>
    </div>
  );
}
