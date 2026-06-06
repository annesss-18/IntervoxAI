// Centralized logo/icon URL builders with provider-specific fallbacks.
import { COMPANY_DOMAIN_MAP } from "@/lib/data/company-domains";
import { DEVICON_MAP } from "@/lib/data/devicon-map";

const BRANDFETCH_CDN = "https://cdn.brandfetch.io";
const UI_AVATARS_API = "https://ui-avatars.com/api";
const DEVICON_CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";
const SIMPLE_ICONS_CDN = "https://cdn.simpleicons.org";
const BRANDFETCH_CLIENT_ID =
  process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID?.trim();
const TRUSTED_COMPANY_LOGO_HOSTS = new Set([
  "cdn.brandfetch.io",
  "www.google.com",
  "ui-avatars.com",
]);

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\s+(inc\.?|llc|ltd\.?|corp\.?|corporation|platform[s]?|technologies|pvt\.?|private|limited)/gi,
      "",
    )
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTechName(name: string): string {
  return name.toLowerCase().trim();
}

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return "?";
  const firstWord = words[0];
  if (!firstWord) return "?";
  if (words.length === 1) return firstWord.substring(0, 2).toUpperCase();
  const secondWord = words[1];
  const firstChar = firstWord[0] || "";
  const secondChar = secondWord?.[0] || "";
  return (firstChar + secondChar).toUpperCase();
}

function companyToDomain(companyName: string): string {
  const normalized = normalizeCompanyName(companyName);

  if (COMPANY_DOMAIN_MAP[normalized]) {
    return COMPANY_DOMAIN_MAP[normalized];
  }

  const withoutSpaces = normalized.replace(/\s+/g, "");
  if (COMPANY_DOMAIN_MAP[withoutSpaces]) {
    return COMPANY_DOMAIN_MAP[withoutSpaces];
  }

  // Fallback heuristic when no explicit mapping exists.
  return `${withoutSpaces}.com`;
}

function clampImageSize(size: number, min: number, max: number): number {
  if (!Number.isFinite(size)) {
    return min;
  }

  return Math.min(Math.max(Math.round(size), min), max);
}

export function getBrandfetchLogoUrl(
  companyName: string,
  size: number = 400,
): string {
  const domain = companyToDomain(companyName);
  const normalizedSize = clampImageSize(size, 16, 1024);

  if (
    !BRANDFETCH_CLIENT_ID ||
    BRANDFETCH_CLIENT_ID === "your_brandfetch_client_id"
  ) {
    // Fall back to a public source when Brandfetch credentials are missing.
    return getGoogleFaviconUrl(companyName, normalizedSize);
  }

  const encodedDomain = encodeURIComponent(domain);
  const encodedClientId = encodeURIComponent(BRANDFETCH_CLIENT_ID);

  return `${BRANDFETCH_CDN}/domain/${encodedDomain}/w/${normalizedSize}/h/${normalizedSize}/fallback/404/type/icon?c=${encodedClientId}`;
}

export function getGoogleFaviconUrl(
  companyName: string,
  size: number = 128,
): string {
  const domain = companyToDomain(companyName);
  const normalizedSize = clampImageSize(size, 16, 256);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${normalizedSize}`;
}

export function getUIAvatarsUrl(
  companyName: string,
  size: number = 128,
): string {
  const initials = getInitials(companyName);
  const normalizedSize = clampImageSize(size, 16, 512);
  return `${UI_AVATARS_API}/?name=${encodeURIComponent(initials)}&size=${normalizedSize}&background=6366f1&color=fff&bold=true&format=svg`;
}

export function isTrustedCompanyLogoUrl(logoUrl: string): boolean {
  try {
    const parsed = new URL(logoUrl);
    if (
      parsed.protocol !== "https:" ||
      !TRUSTED_COMPANY_LOGO_HOSTS.has(parsed.hostname)
    ) {
      return false;
    }

    if (parsed.hostname === "cdn.brandfetch.io") {
      return parsed.pathname.startsWith("/domain/");
    }

    if (parsed.hostname === "www.google.com") {
      return parsed.pathname === "/s2/favicons";
    }

    if (parsed.hostname === "ui-avatars.com") {
      return parsed.pathname === "/api/";
    }

    return false;
  } catch {
    return false;
  }
}

export function normalizeTrustedCompanyLogoUrl(
  logoUrl: string | null | undefined,
): string | undefined {
  const trimmed = logoUrl?.trim();
  if (!trimmed) return undefined;
  return isTrustedCompanyLogoUrl(trimmed) ? trimmed : undefined;
}

export function getCompanyLogoUrls(
  companyName: string,
  size: number = 400,
): {
  primary: string;
  fallbacks: string[];
} {
  if (!companyName || companyName === "Unknown Company") {
    return {
      primary: getUIAvatarsUrl("UC", size),
      fallbacks: [],
    };
  }

  const brandfetchPrimary = getBrandfetchLogoUrl(companyName, size);
  const googleFallback = getGoogleFaviconUrl(companyName, size);
  const uiAvatarFallback = getUIAvatarsUrl(companyName, size);

  // Avoid duplicate fallback URLs when Brandfetch already resolves to Google.
  if (brandfetchPrimary === googleFallback) {
    return {
      primary: googleFallback,
      fallbacks: [uiAvatarFallback],
    };
  }

  return {
    primary: brandfetchPrimary,
    fallbacks: [googleFallback, uiAvatarFallback],
  };
}

export function getCompanyLogoUrl(
  companyName: string,
  size: number = 400,
): string {
  return getCompanyLogoUrls(companyName, size).primary;
}

export function getDeviconUrl(techName: string): string {
  const normalized = normalizeTechName(techName);
  const mapping = DEVICON_MAP[normalized];

  if (mapping) {
    return `${DEVICON_CDN}/${mapping.slug}/${mapping.slug}-${mapping.variant}.svg`;
  }

  // Last-resort slug normalization for unmapped technologies.
  const slug = normalized.replace(/[^a-z0-9]/g, "");
  return `${DEVICON_CDN}/${slug}/${slug}-original.svg`;
}

export function getSimpleIconUrl(
  techName: string,
  color: string = "666666",
): string {
  const normalized = normalizeTechName(techName).replace(/[^a-z0-9]/g, "");
  return `${SIMPLE_ICONS_CDN}/${normalized}/${color}`;
}

export function getTechIconUrls(techName: string): {
  primary: string;
  fallbacks: string[];
} {
  return {
    primary: getDeviconUrl(techName),
    fallbacks: [getSimpleIconUrl(techName)],
  };
}
