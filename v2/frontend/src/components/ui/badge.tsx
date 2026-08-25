import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border border-emerald-200 bg-emerald-50 text-emerald-700",
        secondary: "border border-slate-200 bg-slate-100 text-slate-700",
        destructive: "border border-rose-200 bg-rose-50 text-rose-700",
        warning: "border border-amber-200 bg-amber-50 text-amber-800",
        purple: "border border-purple-200 bg-purple-50 text-purple-700",
        outline: "border border-slate-200 text-slate-800",
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
