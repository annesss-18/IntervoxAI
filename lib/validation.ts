/**
 * Input validation utilities to prevent security vulnerabilities
 */

/**
 * Validates and sanitizes URLs to prevent SSRF attacks
 * Only allows http:// and https:// protocols from allowed domains
 */
export function validateAndSanitizeURL(url: string): URL | null {
  try {
    const parsedUrl = new URL(url)

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.warn(`Invalid protocol: ${parsedUrl.protocol}`)
      return null
    }

    // Block private/internal IP ranges
    const hostname = parsedUrl.hostname
    const blockedPatterns = [
      /^127\./, // localhost
      /^10\./, // private range
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // private range
      /^192\.168\./, // private range
      /^169\.254\./, // link-local
      /^localhost$/i,
      /^0\.0\.0\.0$/,
      /\.localhost$/i,
      /\.local$/i,
      /\.internal$/i,
      /\.home\.arpa$/i,
    ]

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        console.warn(`Blocked internal IP: ${hostname}`)
        return null
      }
    }

    // Block URLs with credentials
    if (parsedUrl.username || parsedUrl.password) {
      console.warn('Blocked URL with embedded credentials')
      return null
    }

    // Allow only standard ports
    if (parsedUrl.port && !['80', '443'].includes(parsedUrl.port)) {
      console.warn(`Blocked non-standard port: ${parsedUrl.port}`)
      return null
    }

    return parsedUrl
  } catch (error) {
    console.warn('Invalid URL:', url, error)
    return null
  }
}

/**
 * Validates file uploads for type and size
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number
    allowedMimeTypes?: string[]
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeMB = 10,
    allowedMimeTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  } = options

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Sanitizes text input to prevent XSS attacks
 * Note: This is basic sanitization. Use DOMPurify for advanced cases
 */
export function sanitizeTextInput(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): {
  strong: boolean
  feedback: string[]
} {
  const feedback: string[] = []

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain number')
  }

  return {
    strong: feedback.length === 0,
    feedback,
  }
}
