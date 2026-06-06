import Image from "next/image";
import { cn } from "@/lib/utils";

const scale = {
  xs: { icon: 20, wordmarkH: 14, gap: "gap-1.5" },
  sm: { icon: 26, wordmarkH: 18, gap: "gap-2" },
  md: { icon: 32, wordmarkH: 22, gap: "gap-2.5" },
  lg: { icon: 40, wordmarkH: 26, gap: "gap-3" },
} as const;

type Size = keyof typeof scale;

const WORDMARK_ASPECT = 3552 / 560;
const LOCKUP_ASPECT = 3120 / 2192;

export function BrandIcon({
  size = 28,
  className,
  priority,
  decorative = false,
  alt = "IntervoxAI icon",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/icon.png"
      alt={decorative ? "" : alt}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority={priority}
    />
  );
}

export function BrandWordmark({
  height = 20,
  className,
  priority,
  decorative = false,
  alt = "IntervoxAI",
}: {
  height?: number;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  alt?: string;
}) {
  const width = Math.round(height * WORDMARK_ASPECT);

  return (
    <Image
      src="/wordmark.png"
      alt={decorative ? "" : alt}
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      priority={priority}
    />
  );
}

export function BrandLogo({
  size = "sm",
  className,
  priority,
  decorative = false,
  alt = "IntervoxAI",
}: {
  size?: Size;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  alt?: string;
}) {
  const s = scale[size];

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <BrandIcon size={s.icon} priority={priority} decorative />
      <BrandWordmark
        height={s.wordmarkH}
        priority={priority}
        decorative={decorative}
        alt={alt}
      />
    </span>
  );
}

export function BrandLockup({
  width = 180,
  className,
  priority,
  decorative = false,
  alt = "IntervoxAI",
}: {
  width?: number;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  alt?: string;
}) {
  const height = Math.round(width / LOCKUP_ASPECT);

  return (
    <Image
      src="/logo-full.png"
      alt={decorative ? "" : alt}
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      priority={priority}
    />
  );
}
