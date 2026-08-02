import { type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

let hasWarnedAboutUnresolvedClientIp = false;

/** Returns a trusted client IP or `"unknown"` when none is configured. */
export function getClientIp(
  source: NextRequest | { get(name: string): string | null },
): string {
  const headers =
    "headers" in source && typeof source.headers?.get === "function"
      ? source.headers
      : (source as { get(name: string): string | null });

  // Trust platform, configured-header, then configured-proxy values in order.
  if (process.env.VERCEL === "1") {
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  const trustedHeader = process.env.TRUSTED_IP_HEADER?.trim();
  if (trustedHeader) {
    const value = headers.get(trustedHeader)?.trim();
    if (value) return value;
  }

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

  // Log the shared rate-limit fallback once per production process.
  if (
    process.env.NODE_ENV === "production" &&
    !hasWarnedAboutUnresolvedClientIp
  ) {
    hasWarnedAboutUnresolvedClientIp = true;
    logger.warn(
      "getClientIp(): no trusted client-IP source configured in production " +
        "(VERCEL, TRUSTED_IP_HEADER, TRUST_PROXY are all unset). Pre-auth " +
        "rate limiting will fall back to one shared bucket for every " +
        "unauthenticated request on this instance. Set TRUSTED_IP_HEADER " +
        "to your edge/proxy's client-IP header (e.g. cf-connecting-ip) or " +
        "TRUST_PROXY=1 if your proxy is known to control x-forwarded-for.",
    );
  }

  return "unknown";
}
