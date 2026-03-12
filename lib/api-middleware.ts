import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkRateLimit, RateLimitConfig } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

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

export function withAuth<TArgs extends unknown[]>(
  handler: (req: NextRequest, user: User, ...args: TArgs) => Promise<Response>,
  rateLimitConfig?: RateLimitConfig,
) {
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
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

      // F-003 FIX: Derive expected origin from Host header when APP_URL is unset,
      // so the CSRF check is never silently disabled in production.
      const origin = req.headers.get("origin");
      const isDev = process.env.NODE_ENV === "development";

      if (!isDev && origin) {
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
      }
    }

    const user = await getCurrentUser();

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

export function withRateLimit<TArgs extends unknown[]>(
  handler: (req: NextRequest, ...args: TArgs) => Promise<Response>,
  config: RateLimitConfig = {},
) {
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
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
