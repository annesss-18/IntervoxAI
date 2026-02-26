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
  spacing?: "sm" | "md" | "lg" | "xl";
}

export function Section({
  className,
  spacing = "lg",
  children,
  ...props
}: SectionProps) {
  const spacings = {
    sm: "py-10 md:py-14",
    md: "py-14 md:py-20",
    lg: "py-20 md:py-28 lg:py-32",
    xl: "py-28 md:py-36 lg:py-44",
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
    <div className={cn("page-banner texture-noise mb-10", className)}>
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          {badge && <span className="label-caps">{badge}</span>}
          <h1 className="font-serif italic font-normal text-3xl text-foreground md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-xl text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-3">{children}</div>
        )}
      </div>
    </div>
  );
}

export function SectionHeader({
  badge,
  title,
  titleAccent,
  description,
  centered = true,
  className,
}: {
  badge?: string;
  title: string;
  titleAccent?: string;
  description?: string;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("mb-16 space-y-4", centered && "text-center", className)}
    >
      {badge && (
        <div className={cn("flex", centered && "justify-center")}>
          <span className="label-caps">{badge}</span>
        </div>
      )}
      <h2 className="font-serif italic font-normal text-3xl text-foreground md:text-4xl lg:text-5xl">
        {title}
        {titleAccent && (
          <>
            {" "}
            <span className="text-gradient-brand">{titleAccent}</span>
          </>
        )}
      </h2>
      {description && (
        <p
          className={cn(
            "text-muted-foreground leading-relaxed text-lg",
            centered && "mx-auto max-w-2xl",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
