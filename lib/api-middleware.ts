import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getCurrentUserClaims,
} from "@/lib/actions/auth.action";
import { logger } from "@/lib/logger";
import { checkRateLimit, RateLimitConfig } from "@/lib/rate-limit";
import type { AuthClaims, User } from "@/types";

function getRequestScope(req: NextRequest): string {
  return `${req.method}:${req.nextUrl.pathname}`;
}

// Extract the client IP with best-effort accuracy.
// Accurate results depend on a trusted proxy normalizing forwarded headers.
function getClientIp(req: NextRequest): string {
  // Prefer x-real-ip (set by trusted proxies) over x-forwarded-for.
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "unknown";
}

/**
 * Validate the request origin for mutation methods (POST, PATCH, PUT, DELETE).
 *
 * The primary CSRF defence is SameSite=strict session cookies, which prevent
 * the browser from sending credentials on cross-origin requests. This check
 * adds a defence-in-depth layer by validating (or requiring) the Origin header.
 *
 * FIX: In production, requests that are missing the Origin header entirely are
 * now rejected with 403. All modern browsers include Origin for
 * POST/PATCH/PUT/DELETE fetch() calls. A missing Origin on these routes
 * indicates an unusual caller (non-browser script, misconfigured proxy) rather
 * than a legitimate user action, so failing closed is the safer choice.
 *
 * When Origin is present, it is compared against NEXT_PUBLIC_APP_URL or the
 * inferred host. x-forwarded-proto and host headers are only used as a fallback
 * when NEXT_PUBLIC_APP_URL is not set; set it in production to prevent origin
 * spoofing via those headers.
 */
function validateCsrfOrigin(req: NextRequest): NextResponse | null {
  const mutationMethods = ["POST", "PATCH", "PUT", "DELETE"];
  if (!mutationMethods.includes(req.method)) return null;

  // DELETE carries no body so Content-Type validation is skipped for it.
  if (req.method !== "DELETE") {
    const contentType = req.headers.get("content-type") ?? "";
    const allowedTypes = ["application/json", "multipart/form-data"];
    const hasAllowedType = allowedTypes.some((type) =>
      contentType.includes(type),
    );
    if (!hasAllowedType) {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 415 },
      );
    }
  }

  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return null;

  const origin = req.headers.get("origin");

  // FIX: Require Origin header in production. Modern browsers always send it
  // for non-GET/HEAD fetch() requests. Its absence signals a non-browser
  // caller which should not hold a valid session cookie under SameSite=strict.
  if (!origin) {
    return NextResponse.json(
      { error: "Forbidden: missing request origin" },
      { status: 403 },
    );
  }

  // Compare against the canonical app URL. Fall back to reconstructing from
  // request headers only when NEXT_PUBLIC_APP_URL is not configured (which
  // should not happen in production — set it to prevent header-spoofing risk).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "";
  const expectedOrigin = appUrl ?? (host ? `${proto}://${host}` : null);

  if (expectedOrigin && origin !== expectedOrigin) {
    return NextResponse.json(
      { error: "Forbidden: invalid request origin" },
      { status: 403 },
    );
  }

  return null;
}

function createAuthWrapper<
  TUser extends { id: string },
  TArgs extends unknown[],
>(
  resolveUser: () => Promise<TUser | null>,
  handler: (req: NextRequest, user: TUser, ...args: TArgs) => Promise<Response>,
  rateLimitConfig?: RateLimitConfig,
) {
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    const user = await resolveUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    if (rateLimitConfig) {
      const identifier = `${user.id}:${getRequestScope(req)}`;
      const rateLimit = await checkRateLimit(identifier, rateLimitConfig);

      if (!rateLimit.allowed) {
        const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);

        logger.warn(`Rate limit exceeded for user ${user.id}`);

        return NextResponse.json(
          {
            error: "Too many requests. Please try again later.",
            retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit":
                rateLimitConfig.maxRequests?.toString() || "10",
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
            },
          },
        );
      }

      const response = await handler(req, user, ...args);

      response.headers.set(
        "X-RateLimit-Limit",
        rateLimitConfig.maxRequests?.toString() || "10",
      );
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimit.remaining.toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimit.resetTime).toISOString(),
      );
      response.headers.set("X-RateLimit-Scope", getRequestScope(req));

      return response;
    }

    return handler(req, user, ...args);
  };
}

export function withAuth<TArgs extends unknown[]>(
  handler: (req: NextRequest, user: User, ...args: TArgs) => Promise<Response>,
  rateLimitConfig?: RateLimitConfig,
) {
  return createAuthWrapper(getCurrentUser, handler, rateLimitConfig);
}

export function withAuthClaims<TArgs extends unknown[]>(
  handler: (
    req: NextRequest,
    user: AuthClaims,
    ...args: TArgs
  ) => Promise<Response>,
  rateLimitConfig?: RateLimitConfig,
) {
  return createAuthWrapper(getCurrentUserClaims, handler, rateLimitConfig);
}

export function withRateLimit<TArgs extends unknown[]>(
  handler: (req: NextRequest, ...args: TArgs) => Promise<Response>,
  config: RateLimitConfig = {},
) {
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
    // Apply CSRF origin validation to mutation methods (POST, PATCH, PUT,
    // DELETE). The SameSite=strict session cookie is the primary defence;
    // this check adds defence-in-depth for unauthenticated endpoints such
    // as /api/auth/signout that rely on withRateLimit instead of withAuth.
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    const ip = getClientIp(req);
    const identifier = `${ip}:${getRequestScope(req)}`;

    const rateLimit = await checkRateLimit(identifier, config);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);

      logger.warn(`Rate limit exceeded for IP ${ip}`);

      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": config.maxRequests?.toString() || "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
          },
        },
      );
    }

    const response = await handler(req, ...args);

    response.headers.set(
      "X-RateLimit-Limit",
      config.maxRequests?.toString() || "10",
    );
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimit.remaining.toString(),
    );
    response.headers.set(
      "X-RateLimit-Reset",
      new Date(rateLimit.resetTime).toISOString(),
    );
    response.headers.set("X-RateLimit-Scope", getRequestScope(req));

    return response;
  };
}
