// Client-side URL validation; server-side SSRF checks live in server-utils.ts.
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
