import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border bg-input/40 px-4 py-3 text-sm font-medium",
          "text-foreground placeholder:text-muted-foreground/60 placeholder:font-normal",
          "resize-none transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-error focus-visible:border-error focus-visible:ring-error/30"
            : "border-border hover:border-primary/40",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
