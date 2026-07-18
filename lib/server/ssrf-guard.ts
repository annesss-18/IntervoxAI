import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const ALLOWED_HTTP_PORTS = new Set(["80", "443"]);
const DNS_REBINDING_CHECK_DELAY_MS = 50;
const MAX_RESPONSE_BYTES = 500_000;

export interface SafeFetchResponse {
  status: number;
  statusText: string;
  headers: Headers;
  body: Uint8Array;
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

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
  const mappedIpv4 = normalized.match(/^::ffff:(.+)$/)?.[1];
  if (mappedIpv4) {
    if (net.isIP(mappedIpv4) === 4) {
      return isPrivateOrSpecialIPv4(mappedIpv4);
    }

    // IPv4-mapped IPv6 can also be expressed as ::ffff:7f00:1.
    const parts = mappedIpv4.split(":");
    if (parts.length === 2 && parts.every((part) => /^[0-9a-f]{1,4}$/.test(part))) {
      const high = Number.parseInt(parts[0]!, 16);
      const low = Number.parseInt(parts[1]!, 16);
      return isPrivateOrSpecialIPv4(
        `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`,
      );
    }
    return true;
  }

  const embeddedIpv4 = normalized.match(/:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (embeddedIpv4) return isPrivateOrSpecialIPv4(embeddedIpv4);

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
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

export async function resolvePublicHostname(
  hostname: string,
): Promise<ResolvedAddress[]> {
  if (isPrivateOrLocalhost(hostname)) {
    throw new Error("Access to private networks and localhost is not allowed.");
  }

  const literalIpFamily = net.isIP(hostname);
  if (literalIpFamily) {
    return [{ address: hostname, family: literalIpFamily as 4 | 6 }];
  }

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

  const firstPublic = firstLookup.filter(
    (resolved) => !isPrivateOrLocalhost(resolved.address),
  );
  const secondPublic = secondLookup.filter(
    (resolved) => !isPrivateOrLocalhost(resolved.address),
  );

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

  // Pin requests to an address observed in both lookups. This prevents a DNS
  // answer from changing between validation and the actual TCP connection.
  const stableAddresses = firstPublic.filter((first) =>
    secondPublic.some(
      (second) =>
        second.address === first.address && second.family === first.family,
    ),
  );

  if (stableAddresses.length === 0) {
    throw new Error(
      "Hostname resolution changed during validation. Please try a stable public URL.",
    );
  }

  return stableAddresses.map((resolved) => ({
    address: resolved.address,
    family: resolved.family as 4 | 6,
  }));
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  await resolvePublicHostname(hostname);
}

async function fetchPinned(
  currentUrl: URL,
  address: ResolvedAddress,
  timeoutMs: number,
): Promise<SafeFetchResponse> {
  const transport = currentUrl.protocol === "https:" ? https : http;
  const port = currentUrl.port
    ? Number.parseInt(currentUrl.port, 10)
    : currentUrl.protocol === "https:"
      ? 443
      : 80;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        protocol: currentUrl.protocol,
        hostname: currentUrl.hostname,
        port,
        method: "GET",
        path: `${currentUrl.pathname}${currentUrl.search}`,
        headers: {
          Host: currentUrl.host,
          "User-Agent":
            "Mozilla/5.0 (compatible; IntervoxAI/1.0; +https://intervoxai.com)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
        },
        servername: currentUrl.hostname,
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
      },
      (response) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            response.destroy(
              new Error("Page is too large to process (max 500KB)."),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(response.headers)) {
            if (Array.isArray(value)) headers.set(name, value.join(", "));
            else if (value !== undefined) headers.set(name, String(value));
          }
          resolve({
            status: response.statusCode ?? 502,
            statusText: response.statusMessage ?? "",
            headers,
            body: new Uint8Array(Buffer.concat(chunks)),
          });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(
        new Error("URL request timed out (max 10 seconds). The page may be slow or unreachable."),
      );
    });
    request.on("error", reject);
    request.end();
  });
}

export async function fetchWithSafeRedirects(
  parsedUrl: URL,
): Promise<SafeFetchResponse> {
  const maxRedirects = 5;
  const deadline = Date.now() + 10000;
  let currentUrl = parsedUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertAllowedUrlComponents(currentUrl);
    const addresses = await resolvePublicHostname(currentUrl.hostname);

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(
        "URL request timed out (max 10 seconds). The page may be slow or unreachable.",
      );
    }

    const response = await fetchPinned(currentUrl, addresses[0]!, remainingMs);

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
