import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-3 after:absolute after:inset-0 after:animate-shimmer after:content-['']",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
