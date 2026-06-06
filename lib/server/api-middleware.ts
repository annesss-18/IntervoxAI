import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getCurrentUserClaims,
} from "@/lib/actions/auth.action";
import { logger } from "@/lib/logger";
import { checkRateLimit, RateLimitConfig } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/server/request";
import type { AuthClaims, User } from "@/types";

const PRE_AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const PRE_AUTH_RATE_LIMIT_MIN = 30;
const PRE_AUTH_RATE_LIMIT_MAX = 60;

function getRequestScope(req: NextRequest): string {
  return `${req.method}:${req.nextUrl.pathname}`;
}

function buildRateLimitResponse(args: {
  config: RateLimitConfig;
  remaining: number;
  resetTime: number;
  scope: string;
}): NextResponse {
  const retryAfter = Math.ceil((args.resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": args.config.maxRequests?.toString() || "10",
        "X-RateLimit-Remaining": args.remaining.toString(),
        "X-RateLimit-Reset": new Date(args.resetTime).toISOString(),
        "X-RateLimit-Scope": args.scope,
      },
    },
  );
}

function getPreAuthRateLimitConfig(
  routeConfig?: RateLimitConfig,
): RateLimitConfig {
  const routeMax = routeConfig?.maxRequests ?? PRE_AUTH_RATE_LIMIT_MIN;
  return {
    maxRequests: Math.min(
      Math.max(routeMax, PRE_AUTH_RATE_LIMIT_MIN),
      PRE_AUTH_RATE_LIMIT_MAX,
    ),
    windowMs: PRE_AUTH_RATE_LIMIT_WINDOW_MS,
    failClosed: true,
  };
}

async function validatePreAuthRateLimit(
  req: NextRequest,
  routeConfig?: RateLimitConfig,
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const scope = `pre-auth:${getRequestScope(req)}`;
  const config = getPreAuthRateLimitConfig(routeConfig);
  const rateLimit = await checkRateLimit(`${ip}:${scope}`, config);

  if (rateLimit.allowed) return null;

  logger.warn(`Pre-auth rate limit exceeded for IP ${ip}`);
  return buildRateLimitResponse({
    config,
    remaining: 0,
    resetTime: rateLimit.resetTime,
    scope,
  });
}

function validateCsrfOrigin(req: NextRequest): NextResponse | null {
  const mutationMethods = ["POST", "PATCH", "PUT", "DELETE"];
  if (!mutationMethods.includes(req.method)) return null;

  const contentLength = req.headers.get("content-length");
  const transferEncoding = req.headers.get("transfer-encoding");
  const hasBody =
    (contentLength !== null && contentLength !== "0") ||
    Boolean(transferEncoding);

  // Mutation bodies must use a structured type.
  if (hasBody) {
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

  if (!origin) {
    return NextResponse.json(
      { error: "Forbidden: missing request origin" },
      { status: 403 },
    );
  }

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

    const preAuthRateLimitError = await validatePreAuthRateLimit(
      req,
      rateLimitConfig,
    );
    if (preAuthRateLimitError) return preAuthRateLimitError;

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
        logger.warn(`Rate limit exceeded for user ${user.id}`);

        return buildRateLimitResponse({
          config: rateLimitConfig,
          remaining: 0,
          resetTime: rateLimit.resetTime,
          scope: getRequestScope(req),
        });
      }

      const response = await handler(req, user, ...args);

      response.headers.set("Cache-Control", "no-store");
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

    const response = await handler(req, user, ...args);
    response.headers.set("Cache-Control", "no-store");
    return response;
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
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    const ip = getClientIp(req);
    const identifier = `${ip}:${getRequestScope(req)}`;

    const rateLimit = await checkRateLimit(identifier, config);

    if (!rateLimit.allowed) {
      logger.warn(`Rate limit exceeded for IP ${ip}`);

      return buildRateLimitResponse({
        config,
        remaining: 0,
        resetTime: rateLimit.resetTime,
        scope: getRequestScope(req),
      });
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
