import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// See https://nextjs.org/docs/app/api-reference/file-conventions/proxy
export const config = {
  matcher: [
    // Match all request paths except API routes, Next.js assets, favicons, and common images.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

const protectedRoutes = ["/dashboard", "/create", "/interview"];
const authRoutes = ["/sign-in", "/sign-up"];

// WHY CSP LIVES HERE INSTEAD OF next.config.mjs:
// A nonce-based Content Security Policy needs a unique random value on every
// request. Static headers are configured once and cannot safely generate
// per-request nonces. The proxy creates one nonce, applies it to the CSP
// response header, and forwards the same value through x-nonce so layout.tsx
// can attach it to framework-managed inline tags during rendering.

// Firebase session cookies are JWTs: exactly 3 base64url segments separated
// by dots. A bare truthy string (e.g. "fake") will no longer bypass the guard.
function isPlausibleSessionCookie(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 10);
}

// TODO: Remove MAINTENANCE_BYPASS after env rotation is complete.
const MAINTENANCE_BYPASS =
  process.env.MAINTENANCE_BYPASS_MODE === "true";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // The session cookie name used by Firebase Admin SDK verifySessionCookie.
  const sessionCookie = request.cookies.get("session")?.value;
  const hasValidCookie =
    !!sessionCookie && isPlausibleSessionCookie(sessionCookie);

  // In maintenance bypass mode, skip auth redirects entirely so the demo
  // user can reach protected routes without a real Firebase session.
  if (!MAINTENANCE_BYPASS) {
    if (isProtectedRoute && !hasValidCookie) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (isAuthRoute && hasValidCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Reuse one nonce for both script-src and style-src across the request pipeline.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://*.firebaseapp.com https://va.vercel-scripts.com`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""} https://fonts.googleapis.com`,
    `img-src 'self' data: https:`,
    // Keep Google Fonts hosts until the app fully switches to self-hosted fonts.
    `font-src 'self' data: https://fonts.gstatic.com`,
    `media-src 'self' blob:`,
    `worker-src 'self' blob:`,
    `connect-src 'self' https://*.googleapis.com https://fonts.googleapis.com wss://*.googleapis.com wss://generativelanguage.googleapis.com https://generativelanguage.googleapis.com https://*.google.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.com https://*.firebaseapp.com`,
    `frame-src 'self' https://*.firebaseapp.com https://*.google.com`,
  ].join("; ");

  // Forward the nonce so Next.js and third-party providers can apply it to
  // framework-managed inline tags.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}
