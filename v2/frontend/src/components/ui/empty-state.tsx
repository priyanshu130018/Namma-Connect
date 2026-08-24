import { LucideIcon, Compass } from "lucide-react";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Compass,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center ${
        className || ""
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 shadow-sm">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default" size="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
