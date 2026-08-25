import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
        secondary: "border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        destructive: "border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
        warning: "border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
        purple: "border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
        outline: "border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "default" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "destructive" && "bg-rose-500",
            variant === "purple" && "bg-purple-500",
            (!variant || variant === "secondary" || variant === "outline") &&
              "bg-slate-400"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
