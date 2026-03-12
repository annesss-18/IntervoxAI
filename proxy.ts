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

// Firebase session cookies are JWTs: exactly 3 base64url segments separated
// by dots. A bare truthy string (e.g. "fake") will no longer bypass the guard.
function isPlausibleSessionCookie(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 10);
}

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

  if (isProtectedRoute && !hasValidCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthRoute && hasValidCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Next.js propagates a single request nonce through the rendering pipeline.
  // Use the same nonce for both script-src and style-src so framework-managed
  // inline tags can satisfy CSP consistently.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://*.firebaseapp.com https://va.vercel-scripts.com`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""} https://fonts.googleapis.com`,
    `img-src 'self' data: https:`,
    // fonts.gstatic.com serves font files; fonts.googleapis.com serves the CSS
    // stylesheet. Remove these two if you switch to next/font/google (which
    // self-hosts fonts at build time and font-src 'self' then covers them).
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
