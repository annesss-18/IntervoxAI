'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
    }

    return (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn('bg-surface-2 relative h-2 w-full overflow-hidden rounded-full', className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full w-full flex-1 transition-all duration-500 ease-out',
            variants[variant]
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    )
  }
)
Progress.displayName = ProgressPrimitive.Root.displayName

// Score ring for feedback display
function ScoreRing({
  score,
  size = 80,
  className,
}: {
  score: number
  size?: number
  className?: string
}) {
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score / 100) * circumference

  const getColor = (score: number) => {
    if (score >= 80) return 'stroke-success'
    if (score >= 60) return 'stroke-warning'
    return 'stroke-error'
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={36}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={36}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-700 ease-out', getColor(score))}
        />
      </svg>
      <span className="text-foreground absolute text-xl font-bold">{score}</span>
    </div>
  )
}

export { Progress, ScoreRing }
