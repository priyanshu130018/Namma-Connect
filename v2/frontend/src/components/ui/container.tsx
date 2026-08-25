import * as React from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg" | "full";
}

const sizeClasses = {
  sm: "max-w-4xl",
  default: "max-w-7xl",
  lg: "max-w-[1400px]",
  full: "max-w-full",
};

export function Container({
  size = "default",
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizeClasses[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Section({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-12 sm:py-16 lg:py-20", className)} {...props}>
      {children}
    </section>
  );
}

export function Divider({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  if (text) {
    return (
      <div className={cn("relative my-6 flex items-center justify-center", className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {text}
        </span>
      </div>
    );
  }
  return <hr className={cn("my-6 border-t border-slate-200", className)} />;
}
