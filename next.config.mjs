/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";
const nextConfig = {
  reactStrictMode: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Keep unpdf as external package to avoid bundling issues
  serverExternalPackages: ["unpdf"],

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  images: {
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Simple Icons (legacy, kept for fallback)
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
      // Google user profile images
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // Brandfetch CDN - Company logos (primary)
      {
        protocol: "https",
        hostname: "cdn.brandfetch.io",
      },
      // Google Favicon API (fallback)
      {
        protocol: "https",
        hostname: "www.google.com",
      },
      // UI Avatars (fallback placeholder)
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      // Devicon CDN via jsDelivr - Tech icons (primary)
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
      // Clearbit Logo API
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
    ],
  },

  async headers() {
    return [
      // Security headers for all routes
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://*.firebaseapp.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com wss://*.googleapis.com wss://generativelanguage.googleapis.com https://generativelanguage.googleapis.com https://*.google.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.com https://*.firebaseapp.com; frame-src 'self' https://*.firebaseapp.com https://*.google.com;`,
          },
        ],
      },
      // Cache control for static assets
      {
        source: "/:all*(svg|jpg|png|webp|gif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
