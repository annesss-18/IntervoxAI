import { cn } from '@/lib/utils'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function Container({ className, size = 'lg', children, ...props }: ContainerProps) {
  const sizes = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1400px]',
    full: 'max-w-full',
  }

  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizes[size], className)} {...props}>
      {children}
    </div>
  )
}

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: 'sm' | 'md' | 'lg'
}

export function Section({ className, spacing = 'lg', children, ...props }: SectionProps) {
  const spacings = {
    sm: 'py-8 md:py-12',
    md: 'py-12 md:py-16',
    lg: 'py-16 md:py-20 lg:py-24',
  }

  return (
    <section className={cn(spacings[spacing], className)} {...props}>
      {children}
    </section>
  )
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-8 md:mb-12', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
          {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  )
}
