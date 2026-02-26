import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, iconRight, error, ...props }, ref) => {
    const base = cn(
      "flex h-11 w-full rounded-xl border bg-input/40 px-4 py-2.5 text-sm font-medium",
      "text-foreground placeholder:text-muted-foreground/60 placeholder:font-normal",
      "transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary",
      "disabled:cursor-not-allowed disabled:opacity-50",
      error
        ? "border-error focus-visible:border-error focus-visible:ring-error/30"
        : "border-border hover:border-primary/40",
      className,
    );

    if (icon || iconRight) {
      return (
        <div className="relative">
          {icon && (
            <div className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 [&>svg]:size-4">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(base, icon && "pl-10", iconRight && "pr-10")}
            ref={ref}
            {...props}
          />
          {iconRight && (
            <div className="text-muted-foreground pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 [&>svg]:size-4">
              {iconRight}
            </div>
          )}
        </div>
      );
    }

    return <input type={type} className={base} ref={ref} {...props} />;
  },
);
Input.displayName = "Input";

export { Input };
