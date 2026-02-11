import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        primary: "bg-primary/15 text-primary",
        secondary: "bg-secondary/15 text-secondary",
        outline: "border border-border text-foreground",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning-foreground",
        error: "bg-error/15 text-error",
        info: "bg-info/15 text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
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
