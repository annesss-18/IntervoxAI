import { NextRequest, NextResponse } from 'next/server'

// Session refresh threshold: 2 hours before expiry
const REFRESH_THRESHOLD_SECONDS = 2 * 60 * 60

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // API version compatibility:
  // - /api/v1/* rewrites to existing /api/* routes
  // - /api/vN/* (N != 1) is explicitly rejected
  if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) {
    const rewrittenUrl = request.nextUrl.clone()
    rewrittenUrl.pathname =
      pathname === '/api/v1' ? '/api' : pathname.replace(/^\/api\/v1\//, '/api/')
    return NextResponse.rewrite(rewrittenUrl)
  }

  if (pathname.startsWith('/api/')) {
    const versionMatch = pathname.match(/^\/api\/v(\d+)(?:\/|$)/)
    if (versionMatch && versionMatch[1] !== '1') {
      return NextResponse.json(
        {
          error: `Unsupported API version: v${versionMatch[1]}`,
          supportedVersions: ['v1'],
        },
        { status: 400 }
      )
    }

    // Existing unversioned API routes continue to work unchanged.
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Get session cookie
  const sessionCookie = request.cookies.get('session')?.value

  if (!sessionCookie) {
    // No session, continue without modification
    return response
  }

  try {
    // Decode the JWT to check expiry (without full verification - that happens in API routes)
    // Firebase session cookies are JWTs with exp claim
    const payload = decodeJWT(sessionCookie)

    if (!payload || !payload.exp) {
      return response
    }

    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = payload.exp - now

    // If session expires within the threshold, set a flag for client-side refresh
    if (timeUntilExpiry > 0 && timeUntilExpiry < REFRESH_THRESHOLD_SECONDS) {
      // Set a cookie flag that client can check to trigger refresh
      response.cookies.set('session-refresh-needed', 'true', {
        maxAge: 60 * 5, // 5 minutes
        httpOnly: false, // Client needs to read this
        path: '/',
        sameSite: 'lax',
      })

      // Also set a header for API routes to detect
      response.headers.set('x-session-refresh-needed', 'true')
    } else {
      // Clear the refresh flag if session is fresh
      const hasRefreshFlag = request.cookies.get('session-refresh-needed')
      if (hasRefreshFlag) {
        response.cookies.delete('session-refresh-needed')
      }
    }

    // If session is expired, redirect to sign-in for protected routes
    if (timeUntilExpiry <= 0) {
      const isProtectedRoute = isProtected(request.nextUrl.pathname)
      if (isProtectedRoute) {
        // Clear the expired session cookie
        response.cookies.delete('session')
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }
    }
  } catch (error) {
    // If we can't decode the session, let the API routes handle validation
    console.error('Proxy session check error:', error)
  }

  return response
}

/**
 * Decode JWT without verification (just to read exp claim)
 * Full verification happens in Firebase Admin SDK
 * Uses atob for Edge Runtime compatibility (Buffer not available)
 */
function decodeJWT(token: string): { exp?: number; iat?: number; uid?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode base64url payload using atob (Edge Runtime compatible)
    const payload = parts[1]
    if (!payload) {
      return null
    }
    // Convert base64url to base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // Pad with = if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Check if a route is protected and requires authentication
 */
function isProtected(pathname: string): boolean {
  const protectedPatterns = ['/dashboard', '/interview', '/profile', '/settings']

  return protectedPatterns.some((pattern) => pathname.startsWith(pattern))
}

// Configure which routes this proxy runs on
export const config = {
  matcher: [
    '/api/:path*',
    /*
     * Match all request paths except for:
     * - static files
     * - images
     * - favicon
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
