import dns from "node:dns/promises";
import net from "node:net";

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const ALLOWED_HTTP_PORTS = new Set(["80", "443"]);
const DNS_REBINDING_CHECK_DELAY_MS = 50;

const BLOCKED_HOSTS = [
  "127.0.0.1",
  "localhost",
  "0.0.0.0",
  "169.254.169.254",
  "::1",
  "metadata.google.internal",
];
const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
];

function isPrivateOrSpecialIPv4(ip: string): boolean {
  const octets = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet)))
    return true;

  const [a, b] = octets as [number, number, number, number];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // Carrier-grade NAT range.
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmark/test range.
  if (a >= 224) return true; // Multicast and reserved ranges.
  return false;
}

function isPrivateOrSpecialIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff")
  );
}

export function isPrivateOrLocalhost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(normalizedHost)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix)))
    return true;

  const ipVersion = net.isIP(normalizedHost);
  if (ipVersion === 4) return isPrivateOrSpecialIPv4(normalizedHost);
  if (ipVersion === 6) return isPrivateOrSpecialIPv6(normalizedHost);

  return false;
}

export function assertAllowedUrlComponents(targetUrl: URL): void {
  if (!ALLOWED_PROTOCOLS.includes(targetUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }

  if (targetUrl.username || targetUrl.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  if (targetUrl.port && !ALLOWED_HTTP_PORTS.has(targetUrl.port)) {
    throw new Error("Only standard HTTP/HTTPS ports are allowed.");
  }
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  if (isPrivateOrLocalhost(hostname)) {
    throw new Error("Access to private networks and localhost is not allowed.");
  }

  if (net.isIP(hostname)) return;

  let firstLookup: Array<{ address: string; family: number }>;
  let secondLookup: Array<{ address: string; family: number }>;
  try {
    firstLookup = await dns.lookup(hostname, { all: true, verbatim: true });
    // Perform a second lookup after a short delay to reduce DNS rebinding risk.
    await new Promise((resolve) =>
      setTimeout(resolve, DNS_REBINDING_CHECK_DELAY_MS),
    );
    secondLookup = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(
      "Unable to resolve hostname. Please provide a reachable public URL.",
    );
  }

  const resolvedAddresses = [...firstLookup, ...secondLookup];

  if (resolvedAddresses.length === 0) {
    throw new Error(
      "Unable to resolve hostname. Please provide a reachable public URL.",
    );
  }

  for (const resolved of resolvedAddresses) {
    if (isPrivateOrLocalhost(resolved.address)) {
      throw new Error(
        "Resolved URL points to a private network and is not allowed.",
      );
    }
  }
}

export async function fetchWithSafeRedirects(
  parsedUrl: URL,
): Promise<Response> {
  const maxRedirects = 5;
  const deadline = Date.now() + 10000;
  let currentUrl = parsedUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertAllowedUrlComponents(currentUrl);
    await assertPublicHostname(currentUrl.hostname);

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(
        "URL request timed out (max 10 seconds). The page may be slow or unreachable.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);

    const response = await fetch(currentUrl.toString(), {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntervoxAI/1.0; +https://intervoxai.com)",
      },
    });
    clearTimeout(timeout);

    if (response.status >= 300 && response.status < 400) {
      const locationHeader = response.headers.get("location");
      if (!locationHeader) {
        throw new Error("Redirect response missing location header.");
      }

      const redirectedUrl = new URL(locationHeader, currentUrl);
      assertAllowedUrlComponents(redirectedUrl);

      currentUrl = redirectedUrl;
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects while fetching URL.");
}
