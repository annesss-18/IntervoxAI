import { type NextRequest } from "next/server";

/**
 * Extract the client IP from trusted proxy headers.
 *
 * The function is platform-aware to avoid trusting client-supplied proxy
 * headers on deployments that don't strip/overwrite them at the edge.
 *
 * Supported modes (checked in order):
 *
 * 1. **Vercel** (`VERCEL=1`): Trusts `x-real-ip`, which Vercel injects at the
 *    edge and cannot be spoofed by the client.
 *
 * 2. **Custom header** (`TRUSTED_IP_HEADER`): Trusts the header named by this
 *    env var (e.g. `cf-connecting-ip` for Cloudflare, `fly-client-ip` for Fly).
 *
 * 3. **Explicit proxy trust** (`TRUST_PROXY=1`): Falls back to the rightmost
 *    value in `x-forwarded-for`, which is the IP appended by the nearest
 *    trusted reverse proxy. Only enable this when your edge/load-balancer is
 *    known to overwrite or append to the header.
 *
 * If none of the above apply, returns `"unknown"` so rate limiting degrades to
 * a global bucket rather than silently trusting spoofable headers.
 *
 * Accepts either a NextRequest from route handlers or a header reader from
 * server actions.
 */
export function getClientIp(
  source: NextRequest | { get(name: string): string | null },
): string {
  const headers =
    "headers" in source && typeof source.headers?.get === "function"
      ? source.headers
      : (source as { get(name: string): string | null });

  // 1. Vercel: x-real-ip is injected by the edge and not spoofable.
  if (process.env.VERCEL === "1") {
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  // 2. Custom trusted header (e.g. cf-connecting-ip, fly-client-ip).
  const trustedHeader = process.env.TRUSTED_IP_HEADER?.trim();
  if (trustedHeader) {
    const value = headers.get(trustedHeader)?.trim();
    if (value) return value;
  }

  // 3. Explicit proxy trust: rightmost x-forwarded-for entry.
  if (process.env.TRUST_PROXY === "1") {
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
      const ips = forwardedFor
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);
      const trustedIp = ips[ips.length - 1];
      if (trustedIp) return trustedIp;
    }
  }

  return "unknown";
}
