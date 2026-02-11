// lib/api-middleware.ts (UPDATED)
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkRateLimit, RateLimitConfig } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

function getRequestScope(req: NextRequest): string {
  return `${req.method}:${req.nextUrl.pathname}`;
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Authentication middleware
 */
export function withAuth<TArgs extends unknown[]>(
  handler: (req: NextRequest, user: User, ...args: TArgs) => Promise<Response>,
  rateLimitConfig?: RateLimitConfig,
) {
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
    // 0. CSRF defense: reject mutation requests without a recognized Content-Type.
    // Cross-origin form submissions use 'application/x-www-form-urlencoded' or 'text/plain',
    // neither of which are allowed here. Combined with SameSite=Lax cookies, this
    // prevents cross-site request forgery for state-mutating endpoints.
    const mutationMethods = ["POST", "PATCH", "PUT", "DELETE"];
    if (mutationMethods.includes(req.method)) {
      const contentType = req.headers.get("content-type") || "";
      const allowedTypes = ["application/json", "multipart/form-data"];
      const hasAllowedType = allowedTypes.some((type) =>
        contentType.includes(type),
      );

      if (!hasAllowedType && req.method !== "DELETE") {
        return NextResponse.json(
          { error: "Unsupported Content-Type" },
          { status: 415 },
        );
      }
    }

    // 1. Check authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    // 2. Check rate limiting (if configured)
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

      // Add rate limit headers to successful responses
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

    // No rate limiting - just authenticate
    return handler(req, user, ...args);
  };
}

/**
 * Apply rate limiting without authentication
 */
export function withRateLimit<TArgs extends unknown[]>(
  handler: (req: NextRequest, ...args: TArgs) => Promise<Response>,
  config: RateLimitConfig = {},
) {
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
    // Use IP address as identifier
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

/**
 * Combined middleware with both auth and rate limiting
 */
export function withAuthAndRateLimit<TArgs extends unknown[]>(
  handler: (req: NextRequest, user: User, ...args: TArgs) => Promise<Response>,
  rateLimitConfig: RateLimitConfig = {},
) {
  return withAuth(handler, rateLimitConfig);
}
