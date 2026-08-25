import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, description, error, required, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
          >
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:opacity-60",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {description && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-rose-600">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
