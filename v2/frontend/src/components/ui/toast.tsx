import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

export type ToastVariant = "default" | "success" | "destructive" | "warning" | "info";

export interface ToastItem {
  id: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  toast: (options: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
  success: (description: string, title?: string) => string;
  error: (description: string, title?: string) => string;
  warning: (description: string, title?: string) => string;
  info: (description: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "default", duration = 5000 }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback((desc: string, title?: string) => toast({ description: desc, title, variant: "success" }), [toast]);
  const error = useCallback((desc: string, title?: string) => toast({ description: desc, title, variant: "destructive" }), [toast]);
  const warning = useCallback((desc: string, title?: string) => toast({ description: desc, title, variant: "warning" }), [toast]);
  const info = useCallback((desc: string, title?: string) => toast({ description: desc, title, variant: "info" }), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, success, error, warning, info }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const ToastViewport: React.FC<{ toasts: ToastItem[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col space-y-2 p-4 pointer-events-none"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ item: ToastItem; onDismiss: () => void }> = ({ item, onDismiss }) => {
  const getIcon = () => {
    switch (item.variant) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "destructive":
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (item.variant) {
      case "success":
        return "border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100";
      case "destructive":
        return "border-red-200 bg-red-50/90 dark:border-red-900/50 dark:bg-red-950/80 text-red-900 dark:text-red-100";
      case "warning":
        return "border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100";
      case "info":
      default:
        return "border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100";
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
        getBorderColor()
      )}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        {item.title && <p className="text-sm font-semibold leading-none mb-1">{item.title}</p>}
        <p className="text-xs leading-relaxed opacity-90">{item.description}</p>
      </div>
      <button
        onClick={onDismiss}
        className="rounded-lg p-1 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-zinc-400"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
