// lib/rate-limit.ts
/**
 * Production-ready rate limiting using Upstash Redis.
 * Falls back to in-memory rate limiting if Redis is not configured.
 *
 * Required environment variables for Redis:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

// Check if Redis is configured
const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!isRedisConfigured && process.env.NODE_ENV === "production") {
  logger.warn(
    "UPSTASH_REDIS_REST_URL/TOKEN not set in production. Rate limiting will use per-instance in-memory storage, which is ineffective at scale.",
  );
}

// Create Redis client if configured
const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Create rate limiters with different configurations
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

// ============================================================================
// In-memory fallback for development (when Redis is not configured)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes (only for in-memory fallback)
if (typeof setInterval !== "undefined") {
  setInterval(
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

// ============================================================================
// Public API
// ============================================================================

export interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number; // Max requests per window (default: 10)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited.
 * Uses Upstash Redis in production, falls back to in-memory for development.
 *
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @param config - Rate limit configuration
 * @returns Promise<{ allowed: boolean, remaining: number, resetTime: number }>
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {},
): Promise<RateLimitResult> {
  const rateLimiter = getOrCreateRateLimiter(config);

  // Use Redis if available
  if (rateLimiter) {
    try {
      const result = await rateLimiter.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
      };
    } catch (error) {
      logger.error("Redis rate limit error, falling back to in-memory:", error);
      // Fall through to in-memory
    }
  }

  // Fallback to in-memory
  if (!isRedisConfigured) {
    if (process.env.NODE_ENV === "production") {
      logger.warn(
        "Redis is NOT configured in production. Falling back to in-memory rate limiting, which is not recommended for distributed deployments.",
      );
      // We could throw here if we want to be strict:
      // throw new Error('Redis must be configured in production for rate limiting.');
    }
    logger.debug("Using in-memory rate limiting (Redis not configured)");
  }
  return checkRateLimitInMemory(identifier, config);
}

/**
 * Clear rate limit for an identifier.
 * Only works for in-memory rate limiting (useful for testing).
 */
export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

/**
 * Get current rate limit status without incrementing.
 * Only works for in-memory rate limiting.
 */
export function getRateLimitStatus(
  identifier: string,
  maxRequests: number = 10,
): { count: number; remaining: number; resetTime: number } | null {
  const entry = rateLimitMap.get(identifier);

  if (!entry) return null;

  const now = Date.now();
  if (entry.resetTime < now) return null;

  return {
    count: entry.count,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Check if Redis rate limiting is being used.
 * Useful for debugging and monitoring.
 */
export function isUsingRedis(): boolean {
  return isRedisConfigured;
}
