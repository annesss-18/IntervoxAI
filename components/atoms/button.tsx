import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_12px_-2px_color-mix(in_srgb,var(--primary)_60%,transparent)] hover:shadow-[0_4px_20px_-2px_color-mix(in_srgb,var(--primary)_70%,transparent)] hover:brightness-105",
        gradient:
          "bg-brand-gradient text-white shadow-[0_4px_18px_-4px_color-mix(in_srgb,var(--primary)_55%,transparent)] hover:shadow-[0_6px_24px_-4px_color-mix(in_srgb,var(--primary)_65%,transparent)] hover:brightness-110 active:brightness-95",
        secondary:
          "bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/22 hover:border-secondary/50 shadow-sm",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-surface-2 hover:border-primary/40 shadow-sm",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-2",
        destructive:
          "bg-error text-error-foreground shadow-sm hover:bg-error/90 hover:shadow-[0_4px_16px_-4px_color-mix(in_srgb,var(--error)_60%,transparent)]",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto rounded-none active:scale-100",
      },
      size: {
        sm: "h-8 px-3.5 text-xs",
        default: "h-10 px-5",
        lg: "h-11 px-7",
        xl: "h-12 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
