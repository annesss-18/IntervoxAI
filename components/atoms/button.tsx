import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:scale-[1.02] dark:hover:shadow-[0_0_30px_#7c5cfc4d]',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:border-primary/30',
        outline:
          'border-2 border-primary/30 bg-transparent text-primary hover:bg-primary/10 hover:border-primary/50',
        ghost: 'text-muted-foreground hover:text-foreground hover:bg-secondary',
        destructive:
          'bg-gradient-to-r from-error-500 to-error-600 text-white shadow-md hover:from-error-600 hover:to-error-700 hover:shadow-lg hover:scale-[1.02]',
        link: 'text-primary underline-offset-4 hover:underline',
        success:
          'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-md hover:from-success-600 hover:to-success-700 hover:shadow-lg hover:scale-[1.02]',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-9 px-4 py-2 text-xs rounded-lg',
        lg: 'h-14 px-8 py-4 text-base',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, isLoading = false, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
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
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
