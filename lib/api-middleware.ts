// lib/api-middleware.ts (UPDATED)
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import type { User } from '@/types'

/**
 * Authentication middleware
 */
export function withAuth(
  handler: (req: NextRequest, user: User) => Promise<Response>,
  rateLimitConfig?: RateLimitConfig
) {
  return async (req: NextRequest): Promise<Response> => {
    // 1. Check authentication
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    // 2. Check rate limiting (if configured)
    if (rateLimitConfig) {
      const rateLimit = await checkRateLimit(user.id, rateLimitConfig)

      if (!rateLimit.allowed) {
        const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)

        logger.warn(`Rate limit exceeded for user ${user.id}`)

        return NextResponse.json(
          {
            error: 'Too many requests. Please try again later.',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': rateLimitConfig.maxRequests?.toString() || '10',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
            },
          }
        )
      }

      // Add rate limit headers to successful responses
      const response = await handler(req, user)

      response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests?.toString() || '10')
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString())

      return response
    }

    // No rate limiting - just authenticate
    return handler(req, user)
  }
}

/**
 * Apply rate limiting without authentication
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  config: RateLimitConfig = {}
) {
  return async (req: NextRequest): Promise<Response> => {
    // Use IP address as identifier
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    const rateLimit = await checkRateLimit(ip, config)

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)

      logger.warn(`Rate limit exceeded for IP ${ip}`)

      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests?.toString() || '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      )
    }

    const response = await handler(req)

    response.headers.set('X-RateLimit-Limit', config.maxRequests?.toString() || '10')
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString())

    return response
  }
}

/**
 * Combined middleware with both auth and rate limiting
 */
export function withAuthAndRateLimit(
  handler: (req: NextRequest, user: User) => Promise<Response>,
  rateLimitConfig: RateLimitConfig = {}
) {
  return withAuth(handler, rateLimitConfig)
}
