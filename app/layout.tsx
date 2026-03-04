import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/atoms/sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intervoxai.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "IntervoxAI - AI-Powered Mock Interview Platform",
    template: "%s | IntervoxAI",
  },
  description:
    "Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews. Real interviews. Real feedback. Faster growth.",
  keywords: [
    "mock interview",
    "AI interview",
    "technical interview",
    "coding interview",
    "interview practice",
    "Gemini AI",
    "job preparation",
    "software engineer interview",
    "IntervoxAI",
  ],
  authors: [{ name: "IntervoxAI Team" }],
  creator: "IntervoxAI",
  publisher: "IntervoxAI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "IntervoxAI",
    title: "IntervoxAI - AI-Powered Mock Interview Platform",
    description:
      "Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IntervoxAI - AI Mock Interviews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IntervoxAI - AI-Powered Mock Interview Platform",
    description:
      "Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews.",
    images: ["/og-image.png"],
    creator: "@intervoxai",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning nonce={nonce}>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
        nonce={nonce}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
