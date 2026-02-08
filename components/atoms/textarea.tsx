import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'bg-surface-2 flex min-h-[120px] w-full rounded-xl border-2 px-4 py-3 text-base transition-colors',
          'placeholder:text-muted-foreground resize-none',
          'focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
            : 'border-border hover:border-primary/30',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
