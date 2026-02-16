import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Container({
  className,
  size = "lg",
  children,
  ...props
}: ContainerProps) {
  const sizes = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-7xl",
    xl: "max-w-[1400px]",
    full: "max-w-full",
  };

  return (
    <div className={cn("container-app", sizes[size], className)} {...props}>
      {children}
    </div>
  );
}

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "sm" | "md" | "lg";
}

export function Section({
  className,
  spacing = "lg",
  children,
  ...props
}: SectionProps) {
  const spacings = {
    sm: "py-8 md:py-12",
    md: "py-12 md:py-16",
    lg: "py-16 md:py-20 lg:py-24",
  };

  return (
    <section
      className={cn("relative", spacings[spacing], className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "texture-noise relative mb-12 overflow-hidden rounded-2xl bg-gradient-to-br from-surface-3 via-surface-2 to-surface-3 px-8 py-14 sm:px-12 sm:py-18",
        className,
      )}
    >
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          {badge && (
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-normal tracking-tight text-foreground md:text-4xl">
            <span className="font-serif italic">{title}</span>
          </h1>
          {description && (
            <p className="max-w-2xl text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>

      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-32 w-32 rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
