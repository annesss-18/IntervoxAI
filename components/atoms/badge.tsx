import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        primary: "bg-primary/12 text-primary ring-1 ring-primary/20",
        secondary: "bg-secondary/12 text-secondary ring-1 ring-secondary/20",
        accent: "bg-accent/12 text-accent ring-1 ring-accent/20",
        outline: "border border-border text-foreground bg-transparent",
        success: "bg-success/12 text-success ring-1 ring-success/20",
        warning: "bg-warning/12 text-warning ring-1 ring-warning/20",
        error: "bg-error/12 text-error ring-1 ring-error/20",
        info: "bg-info/12 text-info ring-1 ring-info/20",
        gradient: "text-white shadow-sm",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({
  className,
  variant,
  dot,
  children,
  style,
  ...props
}: BadgeProps) {
  const isGradient = variant === "gradient";

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={
        isGradient ? { background: "var(--gradient-brand)", ...style } : style
      }
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning",
            variant === "error" && "bg-error",
            variant === "info" && "bg-info",
            variant === "primary" && "bg-primary",
            variant === "secondary" && "bg-secondary",
            variant === "accent" && "bg-accent",
            (!variant || variant === "default" || variant === "outline") &&
              "bg-muted-foreground",
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
