import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    const baseStyles = cn(
      "flex h-11 w-full rounded-xl border-2 bg-surface-2 px-4 py-2 text-sm transition-all duration-200",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
      "disabled:cursor-not-allowed disabled:opacity-50",
      error
        ? "border-error focus-visible:border-error focus-visible:ring-error/20"
        : "border-border hover:border-primary/30",
      className,
    );

    if (icon) {
      return (
        <div className="relative">
          <div className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
          <input
            type={type}
            className={cn(baseStyles, "pl-10")}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    return <input type={type} className={baseStyles} ref={ref} {...props} />;
  },
);
Input.displayName = "Input";

export { Input };
