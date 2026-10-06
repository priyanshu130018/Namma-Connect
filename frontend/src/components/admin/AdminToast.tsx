import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type?: "success" | "error";
}

export function AdminToast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold ${
          toast.type === "error"
            ? "bg-rose-950 text-rose-100 border-rose-800"
            : "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-800 dark:border-slate-200"
        }`}
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>{toast.message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
