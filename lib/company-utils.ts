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
} from "./icon-utils";

/**
 * @deprecated Use getCompanyLogoUrl from icon-utils.ts instead
 * Gets the company logo URL using Brandfetch CDN
 */
export { getCompanyLogoUrl };

// Re-export utility functions for backward compatibility
export {
  getCompanyLogoUrls,
  getBrandfetchLogoUrl,
  getGoogleFaviconUrl,
  getUIAvatarsUrl,
  COMPANY_DOMAIN_MAP,
  normalizeCompanyName,
};
