"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Show full wordmark or just the icon */
  variant?: "full" | "icon";
  /** Size preset */
  size?: "sm" | "md" | "lg";
  /** Link to dashboard/home when clicked */
  href?: string;
  /** Additional styles */
  className?: string;
}

const sizeMap = {
  sm: { icon: 24, wordmark: { width: 100, height: 24 } },
  md: { icon: 32, wordmark: { width: 130, height: 32 } },
  lg: { icon: 40, wordmark: { width: 160, height: 40 } },
};

/**
 * Unified brand logo component using assets from the /assets folder.
 * Supports full wordmark or icon-only variants.
 */
export function BrandLogo({
  variant = "full",
  size = "md",
  href,
  className,
}: BrandLogoProps) {
  const dimensions = sizeMap[size];

  const logoContent = (
    <div className={cn("flex items-center gap-2", className)}>
      {variant === "icon" ? (
        <Image
          src="/icon.png"
          alt="IntervoxAI"
          width={dimensions.icon}
          height={dimensions.icon}
          className="transition-transform hover:scale-105"
          priority
        />
      ) : (
        <div className="flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="IntervoxAI"
            width={dimensions.icon}
            height={dimensions.icon}
            className="transition-transform group-hover:scale-105"
            priority
          />
          <Image
            src="/wordmark.png"
            alt="IntervoxAI"
            width={dimensions.wordmark.width}
            height={dimensions.wordmark.height}
            className="hidden sm:block dark:brightness-0 dark:invert"
            priority
          />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

export default BrandLogo;
