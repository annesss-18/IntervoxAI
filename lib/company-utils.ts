// lib/company-utils.ts
// Legacy module - redirects to icon-utils.ts for backward compatibility
// This file is kept for import compatibility with existing code

import {
  getCompanyLogoUrl,
  getCompanyLogoUrls,
  getBrandfetchLogoUrl,
  getGoogleFaviconUrl,
  getUIAvatarsUrl,
  COMPANY_DOMAIN_MAP,
  normalizeCompanyName,
} from './icon-utils'

/**
 * @deprecated Use getCompanyLogoUrl from icon-utils.ts instead
 * Gets the company logo URL using Brandfetch CDN
 */
export { getCompanyLogoUrl }

/**
 * Gets the company logo or a default placeholder
 * Use CompanyLogo component for built-in error handling
 * @deprecated Use CompanyLogo component instead for better fallback handling
 */
export function getCompanyLogoOrDefault(companyName: string | undefined): string {
  if (!companyName || companyName === 'Unknown Company') {
    return getUIAvatarsUrl('UC', 128)
  }
  return getCompanyLogoUrl(companyName)
}

/**
 * Checks if a company has a known domain mapping
 */
export function hasKnownLogo(companyName: string): boolean {
  const normalized = normalizeCompanyName(companyName)
  return normalized in COMPANY_DOMAIN_MAP
}

// Re-export utility functions for backward compatibility
export {
  getCompanyLogoUrls,
  getBrandfetchLogoUrl,
  getGoogleFaviconUrl,
  getUIAvatarsUrl,
  COMPANY_DOMAIN_MAP,
  normalizeCompanyName,
}
