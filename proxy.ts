import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// See https://nextjs.org/docs/app/api-reference/file-conventions/proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

const protectedRoutes = ["/dashboard", "/create", "/interview"];
const authRoutes = ["/sign-in", "/sign-up"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // The session cookie name used by Firebase Admin SDK verifySessionCookie
  const sessionCookie = request.cookies.get("session")?.value;

  if (isProtectedRoute && !sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    // Optionally pass the callback URL to return after sign in.
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Generate a per-request CSP nonce to avoid 'unsafe-inline' in script-src.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://*.firebaseapp.com https://va.vercel-scripts.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.googleapis.com wss://*.googleapis.com wss://generativelanguage.googleapis.com https://generativelanguage.googleapis.com https://*.google.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.com https://*.firebaseapp.com`,
    `frame-src 'self' https://*.firebaseapp.com https://*.google.com`,
  ].join("; ");

  // Forward the nonce so pages / layouts can apply it to script tags.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}
