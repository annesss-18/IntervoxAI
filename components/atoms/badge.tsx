import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        primary: 'bg-primary/20 text-primary border border-primary/30',
        secondary: 'bg-secondary text-secondary-foreground border border-border',
        success: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400',
        warning: 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400',
        error: 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400',
        info: 'bg-stellar-100 text-stellar-700 dark:bg-stellar-500/20 dark:text-stellar-400',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full',
            variant === 'success' && 'bg-success-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'error' && 'bg-error-500',
            variant === 'info' && 'bg-stellar-500',
            variant === 'primary' && 'bg-primary',
            (!variant ||
              variant === 'default' ||
              variant === 'secondary' ||
              variant === 'outline') &&
              'bg-muted-foreground'
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
