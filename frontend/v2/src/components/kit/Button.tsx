import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-outline",
  outline: "btn-outline",
  ghost: "btn-ghost",
  dark: "btn-amber",
  danger:
    "btn-base bg-destructive text-destructive-foreground hover:opacity-90",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "",
  lg: "px-6 py-3 text-base rounded-lg",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", fullWidth, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          VARIANTS[variant],
          SIZES[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      />
    );
  },
);

export default Button;
