"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {
  variant?: "default" | "gradient" | "success" | "warning" | "error";
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = "default", ...props }, ref) => {
  const indicatorClass = {
    default: "bg-primary",
    gradient: "bg-brand-gradient",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
  }[variant];

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "bg-surface-3 relative h-1.5 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-700 ease-out rounded-full",
          indicatorClass,
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

function ScoreRing({
  score,
  size = 88,
  strokeWidth = 6,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const gradientId = React.useId();

  const getRingColor = (s: number) => {
    if (s >= 80) return "url(#" + gradientId + "-success)";
    if (s >= 60) return "url(#" + gradientId + "-warning)";
    return "url(#" + gradientId + "-error)";
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient
            id={`${gradientId}-success`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#22c487" />
            <stop offset="100%" stopColor="#48a8b8" />
          </linearGradient>
          <linearGradient
            id={`${gradientId}-warning`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#e8a838" />
            <stop offset="100%" stopColor="#c0607a" />
          </linearGradient>
          <linearGradient
            id={`${gradientId}-error`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#e86070" />
            <stop offset="100%" stopColor="#7050b0" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-3"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={getRingColor(score)}
          className="animate-score-ring"
          style={
            {
              "--ring-circumference": circumference,
              "--ring-offset": offset,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-mono font-bold text-foreground tabular-nums leading-none"
          style={{ fontSize: `${Math.max(14, Math.round(size * 0.2))}px` }}
        >
          {score}
        </span>
        <span
          className="text-muted-foreground font-medium mt-0.5"
          style={{ fontSize: `${Math.max(9, Math.round(size * 0.08))}px` }}
        >
          /100
        </span>
      </div>
    </div>
  );
}

export { Progress, ScoreRing };
