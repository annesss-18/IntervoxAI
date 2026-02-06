// components/CompanyLogo.tsx
// Smart wrapper component for company logos with built-in error handling and fallbacks
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { getCompanyLogoUrls } from '@/lib/icon-utils'
import { cn } from '@/lib/utils'

interface CompanyLogoProps {
  companyName: string
  /** Display size in pixels (or use className for responsive sizing) */
  size?: number
  className?: string
  /** Optional custom logo URL (bypasses auto-generation) */
  logoUrl?: string
}

/**
 * Get optimal CDN request size based on display size
 * Requests 2-3x the display size for retina displays
 */
function getOptimalCdnSize(displaySize: number): number {
  // Request at minimum 512px, or 3x the display size for crisp retina display
  // Cap at 1024px to avoid excessive bandwidth
  const retinaSize = displaySize * 3
  return Math.min(Math.max(retinaSize, 512), 1024)
}

/**
 * CompanyLogo component with automatic fallback handling
 *
 * Fallback chain:
 * 1. Brandfetch CDN (primary) - high resolution
 * 2. Google Favicon API
 * 3. UI Avatars (text placeholder)
 */
const CompanyLogo: React.FC<CompanyLogoProps> = ({
  companyName,
  size = 100,
  className,
  logoUrl,
}) => {
  // Calculate optimal CDN size for crisp display on all screens
  const cdnRequestSize = useMemo(() => getOptimalCdnSize(size), [size])

  // Request high-res image from CDN, then scale down for display
  const { primary, fallbacks } = getCompanyLogoUrls(companyName, cdnRequestSize)

  // If custom logoUrl provided, add it as the first option
  const allUrls = useMemo(() => {
    const urls = logoUrl ? [logoUrl, primary, ...fallbacks] : [primary, ...fallbacks]
    return Array.from(new Set(urls.filter(Boolean)))
  }, [logoUrl, primary, fallbacks])

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  const currentUrl = allUrls[currentUrlIndex]

  const handleError = useCallback(() => {
    if (currentUrlIndex < allUrls.length - 1) {
      // Try next fallback
      setCurrentUrlIndex((prev) => prev + 1)
    } else {
      // All fallbacks exhausted
      setHasError(true)
    }
  }, [currentUrlIndex, allUrls.length])

  // Generate initials for text fallback
  const initials = useMemo(() => {
    return (
      companyName
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || '?'
    )
  }, [companyName])

  // If all fallbacks failed or URL is undefined, show a simple text fallback
  if (hasError || !currentUrl) {
    return (
      <div
        className={cn(
          'from-primary-500 to-accent-300 flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white',
          className
        )}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.35,
          minWidth: size,
          minHeight: size,
        }}
      >
        {initials}
      </div>
    )
  }

  return (
    <Image
      src={currentUrl}
      alt={`${companyName} logo`}
      width={cdnRequestSize}
      height={cdnRequestSize}
      className={cn('shrink-0 object-contain', className)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
      onError={handleError}
      unoptimized
    />
  )
}

export default CompanyLogo
