"use client";

import React, { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  getCompanyLogoUrls,
  normalizeTrustedCompanyLogoUrl,
} from "@/lib/icon-utils";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  companyName: string;
  size?: number;
  className?: string;
  logoUrl?: string;
}

function getOptimalCdnSize(displaySize: number): number {
  return Math.min(Math.max(displaySize * 2, 64), 256);
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({
  companyName,
  size = 40,
  className,
  logoUrl,
}) => {
  const cdnRequestSize = useMemo(() => getOptimalCdnSize(size), [size]);
  const { primary, fallbacks } = getCompanyLogoUrls(
    companyName,
    cdnRequestSize,
  );
  const trustedLogoUrl = useMemo(
    () => normalizeTrustedCompanyLogoUrl(logoUrl),
    [logoUrl],
  );

  const allUrls = useMemo(() => {
    const urls = trustedLogoUrl
      ? [trustedLogoUrl, primary, ...fallbacks]
      : [primary, ...fallbacks];
    return Array.from(new Set(urls.filter(Boolean)));
  }, [trustedLogoUrl, primary, fallbacks]);

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (currentUrlIndex < allUrls.length - 1) setCurrentUrlIndex((p) => p + 1);
    else setHasError(true);
  }, [currentUrlIndex, allUrls.length]);

  const initials = useMemo(
    () =>
      companyName
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "?",
    [companyName],
  );

  if (hasError || !allUrls[currentUrlIndex]) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-brand-gradient font-bold text-white",
          className,
        )}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.36,
          minWidth: size,
          minHeight: size,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={allUrls[currentUrlIndex]}
      alt={`${companyName} logo`}
      width={cdnRequestSize}
      height={cdnRequestSize}
      className={cn("shrink-0 rounded-lg object-contain", className)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      onError={handleError}
      unoptimized
    />
  );
};

export default CompanyLogo;
