import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2">
            {icon}
          </div>
          <input
            type={type}
            className={cn(
              'bg-surface-2 flex h-12 w-full rounded-xl border-2 py-3 pr-4 pl-12 text-base transition-colors',
              'placeholder:text-muted-foreground',
              'focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-2 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500/20'
                : 'border-border hover:border-primary/30',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      )
    }

    return (
      <input
        type={type}
        className={cn(
          'bg-surface-2 flex h-12 w-full rounded-xl border-2 px-4 py-3 text-base transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500/20'
            : 'border-border hover:border-primary/30',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
