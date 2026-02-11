// components/TechIcon.tsx
// Smart wrapper component for tech stack icons with built-in error handling and fallbacks
"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { getTechIconUrls } from "@/lib/icon-utils";
import { cn } from "@/lib/utils";
import { Code2 } from "lucide-react";

interface TechIconProps {
  tech: string;
  size?: number;
  className?: string;
  /** Show tech name tooltip on hover */
  showTooltip?: boolean;
}

/**
 * TechIcon component with automatic fallback handling
 *
 * Fallback chain:
 * 1. Devicon CDN (primary)
 * 2. Simple Icons CDN
 * 3. Generic code icon (Lucide)
 */
const TechIcon: React.FC<TechIconProps> = ({
  tech,
  size = 24,
  className,
  showTooltip = true,
}) => {
  const { primary, fallbacks } = getTechIconUrls(tech);
  const allUrls = [primary, ...fallbacks];

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const currentUrl = allUrls[currentUrlIndex];

  const handleError = useCallback(() => {
    if (currentUrlIndex < allUrls.length - 1) {
      // Try next fallback
      setCurrentUrlIndex((prev) => prev + 1);
    } else {
      // All fallbacks exhausted
      setHasError(true);
    }
  }, [currentUrlIndex, allUrls.length]);

  // If all fallbacks failed or URL is undefined, show a generic code icon
  if (hasError || !currentUrl) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex items-center justify-center",
          className,
        )}
        style={{ width: size, height: size }}
        title={showTooltip ? tech : undefined}
      >
        <Code2 size={size * 0.75} />
      </div>
    );
  }

  return (
    <Image
      src={currentUrl}
      alt={tech}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      onError={handleError}
      unoptimized
      title={showTooltip ? tech : undefined}
    />
  );
};

export default TechIcon;
