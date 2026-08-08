import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
};

export function Field({
  label,
  hint,
  error,
  className,
  children,
  htmlFor,
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn("input-field", className)} {...props} />;
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn("input-field min-h-28 resize-y", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn("input-field cursor-pointer pr-8", className)}
      {...props}
    />
  );
});
