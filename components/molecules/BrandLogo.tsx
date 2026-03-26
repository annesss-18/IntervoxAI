import Image from "next/image";
import { cn } from "@/lib/utils";

// Keep brand assets at native aspect ratios to avoid visual distortion.
const WORDMARK_RATIO = 3687 / 561;

const scale = {
  xs: { icon: 20, wordmarkH: 16, gap: "gap-1.5" },
  sm: { icon: 26, wordmarkH: 20, gap: "gap-2" },
  md: { icon: 32, wordmarkH: 24, gap: "gap-2.5" },
  lg: { icon: 40, wordmarkH: 28, gap: "gap-3" },
} as const;

type Size = keyof typeof scale;

export function BrandIcon({
  size = 28,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/icon.svg"
      alt="IntervoxAI icon"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority={priority}
      unoptimized
    />
  );
}

export function BrandWordmark({
  height = 20,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const width = Math.round(height * WORDMARK_RATIO);

  return (
    <Image
      src="/wordmark.svg"
      alt="IntervoxAI"
      width={width}
      height={height}
      className={cn("shrink-0", "dark:brightness-0 dark:invert", className)}
      unoptimized
    />
  );
}

export function BrandLogo({
  size = "sm",
  className,
  priority,
}: {
  size?: Size;
  className?: string;
  priority?: boolean;
}) {
  const s = scale[size];

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <BrandIcon size={s.icon} priority={priority} />
      <BrandWordmark height={s.wordmarkH} />
    </span>
  );
}
