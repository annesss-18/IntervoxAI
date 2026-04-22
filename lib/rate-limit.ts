import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

// Use Redis for shared rate limiting; in-memory fallback is for local development.
const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!isRedisConfigured && process.env.NODE_ENV === "production") {
  console.warn(
    "[ENV] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set in production. " +
      "Falling back to in-memory rate limiting, which is per-instance and provides " +
      "no protection in serverless environments. Set these variables after rotation.",
  );
}

const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const rateLimiters = new Map<string, Ratelimit>();

function getOrCreateRateLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redis) return null;

  const key = `${config.maxRequests ?? 10}-${config.windowMs ?? 60000}`;

  if (!rateLimiters.has(key)) {
    const windowSec = Math.ceil((config.windowMs ?? 60000) / 1000);
    rateLimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          config.maxRequests ?? 10,
          `${windowSec} s`,
        ),
        analytics: true,
      }),
    );
  }

  return rateLimiters.get(key)!;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Remove expired in-memory buckets to keep fallback state bounded.
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of rateLimitMap.entries()) {
        if (entry.resetTime < now) {
          rateLimitMap.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );
  // Don't let this timer keep a Node.js process alive.
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetTime: number } {
  const windowMs = config.windowMs ?? 60000;
  const maxRequests = config.maxRequests ?? 10;

  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    rateLimitMap.set(identifier, entry);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  return { allowed: false, remaining: 0, resetTime: entry.resetTime };
}

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {},
): Promise<RateLimitResult> {
  const rateLimiter = getOrCreateRateLimiter(config);

  if (rateLimiter) {
    try {
      const result = await rateLimiter.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
      };
    } catch (error) {
      logger.error("Redis rate limit error:", error);

      // During env rotation, Redis may be unavailable. Fall back to in-memory
      // instead of crashing. This is unsafe for production long-term but allows
      // a quick deploy while secrets are being rotated.
      if (process.env.NODE_ENV === "production") {
        logger.warn(
          "Redis rate limit error in production — falling back to in-memory. " +
            "This is unsafe for serverless and should be resolved after env rotation.",
        );
      }

      logger.warn("Falling back to in-memory rate limiting (dev only).");
    }
  }

  if (!isRedisConfigured) {
    if (process.env.NODE_ENV === "production") {
      logger.warn(
        "Redis is NOT configured in production. Falling back to in-memory rate limiting, which is not recommended for distributed deployments.",
      );
    }
    logger.debug("Using in-memory rate limiting (Redis not configured)");
  }
  return checkRateLimitInMemory(identifier, config);
}
