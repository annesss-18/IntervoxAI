import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

const protectedRoutes = ["/dashboard", "/create", "/interview"];
const authRoutes = ["/sign-in", "/sign-up"];

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

  // CSP is built here so each response gets a unique nonce.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://*.firebaseapp.com https://va.vercel-scripts.com`,
    `style-src 'self' https://fonts.googleapis.com`,
    `style-src-elem 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""} https://fonts.googleapis.com`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `media-src 'self' blob:`,
    `worker-src 'self' blob:`,
    `connect-src 'self' https://*.googleapis.com https://fonts.googleapis.com wss://*.googleapis.com wss://generativelanguage.googleapis.com https://generativelanguage.googleapis.com https://*.google.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.com https://*.firebaseapp.com`,
    `frame-src 'self' https://*.firebaseapp.com https://*.google.com`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}
