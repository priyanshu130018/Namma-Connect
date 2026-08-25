import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      description,
      error,
      required,
      id,
      options,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
          >
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            disabled={disabled}
            className={cn(
              "flex h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 pr-10 text-sm text-slate-900 dark:text-slate-100 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:opacity-60",
              error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
              className
            )}
            ref={ref}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        {description && !error && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
