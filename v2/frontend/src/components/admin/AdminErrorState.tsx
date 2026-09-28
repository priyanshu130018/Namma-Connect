import { AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface AdminErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function AdminErrorState({
  title,
  message,
  onRetry,
  isRetrying = false,
  className = "",
}: AdminErrorStateProps) {
  return (
    <Card
      className={`p-6 rounded-3xl border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 dark:border-rose-900/60 shadow-sm space-y-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          {title && <h4 className="font-extrabold text-sm text-rose-900 dark:text-rose-200">{title}</h4>}
          <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      {onRetry && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="rounded-xl border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 bg-white dark:bg-rose-900/60 hover:bg-rose-100 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Retrying..." : "Retry"}</span>
          </Button>
        </div>
      )}
    </Card>
  );
}
