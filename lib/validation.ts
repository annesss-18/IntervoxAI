/**
 * Input validation utilities
 */

/**
 * Validates and sanitizes URLs — lightweight client-safe check.
 * Only allows http:// and https:// protocols.
 * Note: Full SSRF protection (DNS checks, private IP blocking) is in server-utils.ts
 */
export function validateAndSanitizeURL(url: string): URL | null {
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }
    return parsedUrl;
  } catch {
    return null;
  }
}

/**
 * Validates file uploads for type and size
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedMimeTypes?: string[];
  } = {},
): { valid: boolean; error?: string } {
  const {
    maxSizeMB = 10,
    allowedMimeTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  } = options;

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`,
    };
  }

  return { valid: true };
}
