import { companyLogos } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  getTechIconUrl,
  getTechIconUrls,
  getBrandfetchLogoUrl,
} from "./icon-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export tech icon functions from icon-utils for backward compatibility
export { getTechIconUrl, getTechIconUrls };

/**
 * Gets array of tech logos with URLs (backward compatible)
 * @deprecated Use TechIcon component for better fallback handling
 */
export const getTechLogos = (techArray?: string[]) => {
  if (!techArray || !Array.isArray(techArray) || techArray.length === 0) {
    return [];
  }

  return techArray.map((tech) => ({
    tech,
    url: getTechIconUrl(tech),
  }));
};

/**
 * Gets a random interview cover image from known company logos
 */
export const getRandomInterviewCover = () => {
  // Ensure companyLogos array is not empty
  if (!companyLogos || companyLogos.length === 0) {
    return getBrandfetchLogoUrl("google", 400);
  }

  const randomIndex = Math.floor(Math.random() * companyLogos.length);
  const company = companyLogos[randomIndex];

  // Type guard to ensure company is defined
  if (!company) {
    return getBrandfetchLogoUrl("google", 400);
  }

  // Use Brandfetch for company logos
  return getBrandfetchLogoUrl(company, 400);
};
