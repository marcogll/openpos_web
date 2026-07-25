import React from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "success";
type ButtonSize = "default" | "sm" | "icon" | "touch";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClass: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow-card hover:bg-primary/90",
  secondary: "border border-border/70 bg-muted text-foreground hover:bg-accent",
  outline: "border border-border bg-card text-foreground hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  success: "bg-green text-bg shadow-card hover:bg-green-bright",
};

const sizeClass: Record<ButtonSize, string> = {
  default: "min-h-11 px-4 py-2 text-sm",
  sm: "min-h-10 px-3 py-2 text-xs",
  icon: "h-11 w-11 p-0",
  touch: "min-h-12 px-4 py-2 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 cursor-pointer",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
